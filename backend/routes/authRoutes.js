import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import OtpSession from '../models/OtpSession.js';
import Order from '../models/Order.js';
import Rental from '../models/Rental.js';
import Appointment from '../models/Appointment.js';
import WishlistItem from '../models/WishlistItem.js';
import AuditLog from '../models/AuditLog.js';
import PaymentPreference from '../models/PaymentPreference.js';
import Notification from '../models/Notification.js';
import { sendOtp } from '../services/otpService.js';

const googleClient = new OAuth2Client();
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

const generateToken = (id, tokenVersion = 0) => {
    return jwt.sign({ id, tokenVersion: tokenVersion || 0 }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

// C2: /force-seed-admin route REMOVED for security. Use CLI seed script instead.

// @route   POST /api/auth/check-phone
// @desc    Check if a phone number is already registered
router.post('/check-phone', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }
        const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
        const userExists = await User.findOne({
            $or: [
                { phone: cleanPhone },
                { phone: `+91${cleanPhone}` },
                { phone: `91${cleanPhone}` }
            ]
        });
        res.json({ exists: !!userExists });
    } catch (error) {
        console.error('Check phone error:', error);
        res.status(500).json({ message: 'Error checking phone' });
    }
});

// Mask sensitive phone number for logs
const maskPhone = (phone) => {
    const str = String(phone || '').replace(/\D/g, '').slice(-10);
    return str.length === 10 ? `${str.slice(0, 2)}****${str.slice(-4)}` : '******';
};

// In-memory OTP storage with secure SHA-256 hash, attempt counting, and cooldown
const otpStore = new Map();

const hashOtp = (otp, phone) => {
    const secret = process.env.JWT_SECRET || 'shagun_default_otp_salt';
    return crypto.createHash('sha256').update(`${otp.trim()}:${phone}:${secret}`).digest('hex');
};

// @route   POST /api/auth/send-otp
// @desc    Generate and send 6-digit OTP
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }
        const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
        if (cleanPhone.length !== 10) {
            return res.status(400).json({ message: 'Valid 10-digit phone number is required' });
        }

        // Rate limit: 60-second cooldown between requests (persisted in DB)
        const existing = await OtpSession.findOne({ identifier: cleanPhone });
        if (existing && Date.now() - new Date(existing.lastSentAt).getTime() < 60000) {
            const waitSeconds = Math.ceil((60000 - (Date.now() - new Date(existing.lastSentAt).getTime())) / 1000);
            return res.status(429).json({ message: `Please wait ${waitSeconds} seconds before requesting another OTP` });
        }

        // Generate cryptographically random 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const hashedOtp = hashOtp(otp, cleanPhone);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        await OtpSession.findOneAndUpdate(
            { identifier: cleanPhone },
            { hashedOtp, expiresAt, attempts: 0, lastSentAt: new Date(), lockedUntil: null },
            { upsert: true, new: true }
        );

        // Test mode hook ONLY when explicit flag enabled in non-production
        const isTestMode = process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_OTP === 'true';

        // Real SMS dispatch (Fast2SMS)
        if (process.env.FAST2SMS_API_KEY && !isTestMode) {
            try {
                await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.FAST2SMS_API_KEY}&route=otp&variables_values=${otp}&flash=0&numbers=${cleanPhone}`);
            } catch (smsErr) {
                console.error('[SMS Dispatch] Failed for masked phone:', maskPhone(cleanPhone));
            }
        }

        res.json({
            success: true,
            message: `OTP sent via SMS to +91 ${maskPhone(cleanPhone)}`,
            ...(isTestMode ? { testOtp: otp } : {})
        });
    } catch (error) {
        console.error('Send OTP error:', error.message);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify 6-digit OTP (hashed comparison, max 5 attempts)
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ message: 'Phone and OTP are required' });
        }
        const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
        const record = await OtpSession.findOne({ identifier: cleanPhone });

        // Fixed test OTP allowed ONLY when explicit test flag enabled in non-production
        const isTestOtpAllowed = process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_OTP === 'true';
        if (isTestOtpAllowed && otp.trim() === '999999') {
            await OtpSession.deleteOne({ identifier: cleanPhone });
            return res.json({ success: true, verified: true });
        }

        if (!record) {
            return res.status(400).json({ message: 'No OTP requested for this number or OTP expired' });
        }

        if (Date.now() >= new Date(record.expiresAt).getTime()) {
            await OtpSession.deleteOne({ identifier: cleanPhone });
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        record.attempts += 1;
        if (record.attempts > 5) {
            await OtpSession.deleteOne({ identifier: cleanPhone });
            return res.status(429).json({ message: 'Too many invalid attempts. Please request a new OTP.' });
        }
        await record.save();

        const candidateHash = hashOtp(String(otp), cleanPhone);
        if (record.hashedOtp === candidateHash) {
            await OtpSession.deleteOne({ identifier: cleanPhone });
            return res.json({ success: true, verified: true });
        }

        res.status(400).json({ message: `Invalid OTP code. ${5 - record.attempts} attempts remaining.` });
    } catch (error) {
        console.error('Verify OTP error:', error.message);
        res.status(500).json({ message: 'Failed to verify OTP' });
    }
});

// Rate limiter for forgot password requests: 10/hour per IP, 5/hour per identifier
const resetRateLimiter = new Map();
function isResetRateLimited(key, maxLimit = 5, windowMs = 3600000) {
    const now = Date.now();
    const entry = resetRateLimiter.get(key);
    if (!entry || now - entry.firstAt > windowMs) {
        resetRateLimiter.set(key, { count: 1, firstAt: now });
        return false;
    }
    if (entry.count >= maxLimit) {
        return true;
    }
    entry.count += 1;
    return false;
}

export const _testClearOtpStores = async () => {
    resetRateLimiter.clear();
    await OtpSession.deleteMany({}).catch(() => {});
};

// @route   POST /api/auth/forgot-password
// @desc    Initiate password reset OTP flow for registered account (dispatches to email)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email, phone } = req.body;
        const rawTarget = String(email || phone || '').trim().toLowerCase();
        if (!rawTarget) {
            return res.status(400).json({ message: 'Email address or mobile number is required' });
        }

        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
        if (isResetRateLimited(`ip:${clientIp}`, 10) || isResetRateLimited(`id:${rawTarget}`, 5)) {
            return res.status(429).json({ message: 'Too many password reset requests. Please try again after 1 hour.' });
        }

        const genericMessage = 'If an account exists with this email or mobile, a 6-digit verification code has been sent to the registered email address.';

        let user = null;
        if (rawTarget.includes('@')) {
            user = await User.findOne({ email: rawTarget });
        } else {
            const cleanPhone = rawTarget.replace(/\D/g, '').slice(-10);
            user = await User.findOne({
                $or: [
                    { phone: cleanPhone },
                    { phone: `+91${cleanPhone}` },
                    { phone: `91${cleanPhone}` }
                ]
            });
        }

        // Generic response if user does not exist (prevents user enumeration)
        if (!user || !user.email) {
            return res.json({ success: true, message: genericMessage });
        }

        const normalizedEmail = user.email.toLowerCase().trim();
        const existing = await OtpSession.findOne({ identifier: normalizedEmail });

        // Account lockout check (15 minutes after 5 wrong attempts)
        if (existing && existing.lockedUntil && Date.now() < new Date(existing.lockedUntil).getTime()) {
            const waitMins = Math.ceil((new Date(existing.lockedUntil).getTime() - Date.now()) / 60000);
            return res.status(429).json({
                message: `Account is temporarily locked due to excessive failed attempts. Please wait ${waitMins} minute${waitMins > 1 ? 's' : ''}.`
            });
        }

        // 60-second resend cooldown
        if (existing && Date.now() - new Date(existing.lastSentAt).getTime() < 60000) {
            const waitSeconds = Math.ceil((60000 - (Date.now() - new Date(existing.lastSentAt).getTime())) / 1000);
            return res.status(429).json({
                message: `Please wait ${waitSeconds} seconds before requesting another verification code.`
            });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const hashedOtp = hashOtp(otp, normalizedEmail);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await OtpSession.findOneAndUpdate(
            { identifier: normalizedEmail },
            { hashedOtp, expiresAt, attempts: 0, lastSentAt: new Date(), lockedUntil: null },
            { upsert: true, new: true }
        );

        // Dispatch OTP via email provider layer
        await sendOtp({ channel: 'email', to: normalizedEmail, code: otp });

        const isTestMode = process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_OTP === 'true';

        res.json({
            success: true,
            message: genericMessage,
            targetEmail: isTestMode ? normalizedEmail : undefined,
            ...(isTestMode ? { testOtp: otp } : {})
        });
    } catch (error) {
        console.error('Forgot password error:', error.message);
        res.status(500).json({ message: 'Failed to process password reset request' });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Verify OTP and update user password (invalidating older sessions)
router.post('/reset-password', async (req, res) => {
    try {
        const { email, phone, otp, newPassword } = req.body;
        const rawTarget = String(email || phone || '').trim().toLowerCase();
        if (!rawTarget || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email/phone, OTP code, and new password are required' });
        }
        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        let user = null;
        if (rawTarget.includes('@')) {
            user = await User.findOne({ email: rawTarget });
        } else {
            const cleanPhone = rawTarget.replace(/\D/g, '').slice(-10);
            user = await User.findOne({
                $or: [
                    { phone: cleanPhone },
                    { phone: `+91${cleanPhone}` },
                    { phone: `91${cleanPhone}` }
                ]
            });
        }

        if (!user || !user.email) {
            return res.status(400).json({ message: 'Invalid or expired verification code.' });
        }

        const normalizedEmail = user.email.toLowerCase().trim();
        const record = await OtpSession.findOne({ identifier: normalizedEmail });

        if (!record) {
            return res.status(400).json({ message: 'Invalid or expired verification code.' });
        }

        if (record && record.lockedUntil && Date.now() < new Date(record.lockedUntil).getTime()) {
            const waitMins = Math.ceil((new Date(record.lockedUntil).getTime() - Date.now()) / 60000);
            return res.status(429).json({
                message: `Account is temporarily locked. Please wait ${waitMins} minute${waitMins > 1 ? 's' : ''}.`
            });
        }

        if (Date.now() >= new Date(record.expiresAt).getTime()) {
            await OtpSession.deleteOne({ identifier: normalizedEmail });
            return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' });
        }

        const isTestOtpAllowed = process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_OTP === 'true';
        let isValid = false;

        if (isTestOtpAllowed && String(otp).trim() === '999999') {
            isValid = true;
        } else {
            record.attempts += 1;
            if (record.attempts >= 5) {
                record.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
                await record.save();
                return res.status(429).json({
                    message: 'Too many invalid attempts. Account has been locked for 15 minutes.'
                });
            }
            await record.save();

            const candidateHash = hashOtp(String(otp), normalizedEmail);
            if (record.hashedOtp === candidateHash) {
                isValid = true;
            }
        }

        if (!isValid) {
            return res.status(400).json({
                message: record
                    ? `Invalid verification code. ${5 - record.attempts} attempts remaining.`
                    : 'Invalid or expired verification code.'
            });
        }

        // Single-use guarantee: delete OTP immediately
        await OtpSession.deleteOne({ identifier: normalizedEmail });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all prior sessions
        await user.save();

        res.json({
            success: true,
            message: 'Password has been reset successfully. Please log in with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error.message);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

// @route   POST /api/auth/register
// @desc    Register a new user (with verified phone or email)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;

        if (!name || !password || (!email && !phone)) {
            return res.status(400).json({ message: 'Please provide all required fields (name, password, and phone/email)' });
        }

        const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';
        const normalizedEmail = email ? email.toLowerCase().trim() : (cleanPhone ? `${cleanPhone}@shagunmart.com` : '');

        // Check if user already exists
        const checkConditions = [];
        if (normalizedEmail) checkConditions.push({ email: normalizedEmail });
        if (cleanPhone) {
            checkConditions.push({ phone: cleanPhone });
            checkConditions.push({ phone: `+91${cleanPhone}` });
        }

        if (checkConditions.length > 0) {
            const userExists = await User.findOne({ $or: checkConditions });
            if (userExists) {
                return res.status(400).json({ message: 'An account with this phone number or email already exists. Please log in.' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const addresses = [];
        if (address && address.houseNo && address.city) {
            addresses.push({ ...address, isDefault: true });
        }

        const user = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            phone: cleanPhone || (address?.mobile || ''),
            role: 'user', // Never accept role from client input
            addresses
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            addresses: user.addresses,
            token: generateToken(user._id, user.tokenVersion || 0)
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// @route   POST /api/auth/google
// @desc    Authenticate or register user with Google OAuth (Verified ID Token)
router.post('/google', async (req, res) => {
    try {
        const { idToken, token, credential } = req.body;
        const rawToken = idToken || token || credential;

        if (!rawToken) {
            return res.status(400).json({ message: 'Valid Google idToken is required for Google authentication' });
        }

        let verifiedEmail = '';
        let verifiedName = '';
        let verifiedGoogleId = '';
        let verifiedPhotoUrl = '';

        if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_GOOGLE_AUTH === 'true' && rawToken.startsWith('test_google_token_')) {
            verifiedEmail = req.body.email?.toLowerCase().trim();
            verifiedName = req.body.name || verifiedEmail.split('@')[0];
            verifiedGoogleId = 'test_google_id_' + Date.now();
            verifiedPhotoUrl = req.body.photoUrl || '';
        } else {
            const clientIds = [
                process.env.GOOGLE_CLIENT_ID_WEB,
                process.env.GOOGLE_CLIENT_ID_ANDROID,
                process.env.GOOGLE_CLIENT_ID_IOS,
                process.env.GOOGLE_CLIENT_ID
            ].filter(Boolean);

            const ticket = await googleClient.verifyIdToken({
                idToken: rawToken,
                audience: clientIds.length > 0 ? clientIds : undefined
            });

            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                return res.status(401).json({ message: 'Google token payload is missing email' });
            }

            if (!payload.email_verified) {
                return res.status(401).json({ message: 'Google email address is not verified' });
            }

            verifiedEmail = payload.email.toLowerCase().trim();
            verifiedName = payload.name || verifiedEmail.split('@')[0];
            verifiedGoogleId = payload.sub || '';
            verifiedPhotoUrl = payload.picture || '';
        }

        let user = await User.findOne({
            $or: [
                { email: verifiedEmail },
                ...(verifiedGoogleId ? [{ googleId: verifiedGoogleId }] : [])
            ]
        });

        if (user) {
            if (!user.googleId && verifiedGoogleId) user.googleId = verifiedGoogleId;
            if (!user.avatar && verifiedPhotoUrl) user.avatar = verifiedPhotoUrl;
            await user.save();
        } else {
            const randomPassword = Math.random().toString(36).slice(-10) + Date.now().toString(36);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            user = await User.create({
                name: verifiedName,
                email: verifiedEmail,
                password: hashedPassword,
                googleId: verifiedGoogleId,
                avatar: verifiedPhotoUrl,
                role: 'user',
                addresses: []
            });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            avatar: user.avatar || photoUrl || '',
            role: user.role,
            addresses: user.addresses || [],
            token: generateToken(user._id, user.tokenVersion || 0)
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ message: 'Google authentication failed' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token (supports either phone number OR email)
router.post('/login', async (req, res) => {
    try {
        const { email, identifier: rawId, password } = req.body;
        const identifier = (email || rawId || '').trim();

        if (!identifier || !password || typeof identifier !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Please provide phone number / email and password' });
        }

        const cleanPhone = identifier.replace(/\D/g, '').slice(-10);
        const isPhoneNumber = cleanPhone.length === 10;

        let query;
        if (isPhoneNumber) {
            query = {
                $or: [
                    { phone: cleanPhone },
                    { phone: `+91${cleanPhone}` },
                    { phone: `91${cleanPhone}` },
                    { email: identifier.toLowerCase() }
                ]
            };
        } else {
            query = { email: identifier.toLowerCase() };
        }

        const user = await User.findOne(query);

        if (!user) {
            return res.status(401).json({ message: 'Invalid phone number / email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid phone number / email or password' });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            addresses: user.addresses || [],
            token: generateToken(user._id, user.tokenVersion || 0)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', protect, async (req, res) => {
    res.json(req.user);
});

// @route   PUT /api/auth/profile
// @desc    Update current user profile (name, email, phone, optional password)
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { name, email, phone, password } = req.body;

        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone;

        if (email && email.toLowerCase().trim() !== user.email) {
            const emailTaken = await User.findOne({ email: email.toLowerCase().trim() });
            if (emailTaken) {
                return res.status(400).json({ message: 'Email already in use by another account' });
            }
            user.email = email.toLowerCase().trim();
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            user.tokenVersion = (user.tokenVersion || 0) + 1;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            role: updatedUser.role,
            addresses: updatedUser.addresses,
            token: generateToken(updatedUser._id, updatedUser.tokenVersion || 0)
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// @route   POST /api/auth/logout
// @desc    Invalidate current user sessions by incrementing tokenVersion
router.post('/logout', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Error logging out' });
    }
});

// Note: DELETE /api/auth/profile route is mounted below to share exact identity checks with /delete-account

// @route   POST /api/auth/address
// @desc    Add a saved address to current user
router.post('/address', protect, async (req, res) => {
    try {
        const { fullName, mobile, houseNo, street, city, state, pinCode, isDefault } = req.body;

        if (!fullName || !mobile || !houseNo || !street || !city || !state || !pinCode) {
            return res.status(400).json({ message: 'All address fields are required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const shouldBeDefault = isDefault || user.addresses.length === 0;

        if (shouldBeDefault) {
            user.addresses.forEach(addr => {
                addr.isDefault = false;
            });
        }

        user.addresses.push({
            fullName,
            mobile,
            houseNo,
            street,
            city,
            state,
            pinCode,
            isDefault: shouldBeDefault
        });

        // Set user's phone if empty
        if (!user.phone && mobile) {
            user.phone = mobile;
        }

        await user.save();
        res.status(201).json(user.addresses);
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ message: 'Failed to add address' });
    }
});

// @route   PUT /api/auth/address/:addressId
// @desc    Update a saved address or set it as default
router.put('/address/:addressId', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const address = user.addresses.id(req.params.addressId);
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        const { fullName, mobile, houseNo, street, city, state, pinCode, isDefault } = req.body;

        if (isDefault) {
            user.addresses.forEach(addr => {
                addr.isDefault = false;
            });
            address.isDefault = true;
        }

        if (fullName) address.fullName = fullName;
        if (mobile) address.mobile = mobile;
        if (houseNo) address.houseNo = houseNo;
        if (street) address.street = street;
        if (city) address.city = city;
        if (state) address.state = state;
        if (pinCode) address.pinCode = pinCode;

        await user.save();
        res.json(user.addresses);
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ message: 'Failed to update address' });
    }
});

// @route   DELETE /api/auth/address/:addressId
// @desc    Delete a saved address
router.delete('/address/:addressId', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const address = user.addresses.id(req.params.addressId);
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        const wasDefault = address.isDefault;
        user.addresses.pull({ _id: req.params.addressId });

        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        await user.save();
        res.json({ message: 'Address removed successfully', addresses: user.addresses });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ message: 'Failed to delete address' });
    }
});

// @route   GET /api/auth/users
// @desc    Get all users (admin only)
router.get('/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// @route   POST /api/auth/delete-account & DELETE /api/auth/profile
// @desc    Self-service account deletion and anonymization with accounting preservation
const handleDeleteAccount = async (req, res) => {
    try {
        const { currentPassword, googleIdToken, otp } = req.body || {};
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 1. Admin safety gate: refuse if this is the last remaining administrator
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: 'Cannot delete the last remaining administrator account. Promote another admin first.'
                });
            }
        }

        // 2. Identity Verification
        let isIdentityVerified = false;

        if (user.password && user.password !== '') {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to delete your account' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Incorrect password. Account deletion aborted.' });
            }
            isIdentityVerified = true;
        } else {
            // Google-only or passwordless accounts
            if (googleIdToken) {
                try {
                    const isTestAllowed = process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_GOOGLE_AUTH === 'true';
                    if (isTestAllowed && googleIdToken === 'test_google_token') {
                        isIdentityVerified = true;
                    } else {
                        const ticket = await googleClient.verifyIdToken({
                            idToken: googleIdToken,
                            audience: [
                                process.env.GOOGLE_CLIENT_ID_WEB,
                                process.env.GOOGLE_CLIENT_ID_ANDROID,
                                process.env.GOOGLE_CLIENT_ID_IOS
                            ].filter(Boolean)
                        });
                        const payload = ticket.getPayload();
                        if (payload && payload.email && payload.email.toLowerCase() === user.email.toLowerCase()) {
                            isIdentityVerified = true;
                        }
                    }
                } catch (gErr) {
                    console.error('Google token verification failed during deletion:', gErr.message);
                }
            } else if (otp) {
                const record = await OtpSession.findOne({ identifier: user.email.toLowerCase() });
                const isTestAllowed = process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_OTP === 'true';
                if (isTestAllowed && otp.trim() === '999999') {
                    isIdentityVerified = true;
                    await OtpSession.deleteOne({ identifier: user.email.toLowerCase() });
                } else if (record && Date.now() < new Date(record.expiresAt).getTime()) {
                    const candidateHash = hashOtp(String(otp), user.email.toLowerCase());
                    if (record.hashedOtp === candidateHash) {
                        isIdentityVerified = true;
                        await OtpSession.deleteOne({ identifier: user.email.toLowerCase() });
                    }
                }
            }

            if (!isIdentityVerified) {
                return res.status(401).json({
                    message: 'Identity verification failed. Please provide a valid verification code or authentication token.'
                });
            }
        }

        // 3. Active Commitments Gates
        const activeOrder = await Order.findOne({
            user: user._id,
            status: { $nin: ['Delivered', 'Cancelled'] }
        });
        if (activeOrder) {
            return res.status(400).json({
                message: 'Cannot delete account with an active order in progress. Please wait until your order is Delivered or Cancelled.'
            });
        }

        const activeRental = await Rental.findOne({
            $or: [
                { user: user._id },
                ...(user.phone ? [{ customerPhone: user.phone }] : []),
                ...(user.email ? [{ customerEmail: user.email }] : [])
            ],
            status: { $in: ['Booked', 'Active'] }
        });
        if (activeRental) {
            return res.status(400).json({
                message: 'Cannot delete account with an active lehenga rental. Please return the rental first.'
            });
        }

        const activeAppointment = await Appointment.findOne({
            $or: [
                { user: user._id },
                ...(user.phone ? [{ customerPhone: user.phone }] : [])
            ],
            status: { $in: ['Pending', 'Confirmed'] }
        });
        if (activeAppointment) {
            return res.status(400).json({
                message: 'Cannot delete account with an upcoming parlour appointment. Please cancel your appointment first.'
            });
        }

        // 4. Anonymization & Data Sanitization
        const anonymizedEmail = `deleted_${user._id}@deleted.invalid`;
        const oldEmail = user.email;
        const oldPhone = user.phone;

        user.name = 'Deleted User';
        user.email = anonymizedEmail;
        user.phone = '';
        user.password = '';
        user.googleId = '';
        user.avatar = '';
        user.addresses = [];
        user.pushTokens = [];
        user.notifications = [];
        user.tokenVersion = (user.tokenVersion || 0) + 1; // Immediately kills all active JWT sessions
        await user.save();

        // 5. Clean up non-financial user-specific items
        await WishlistItem.deleteMany({ user_id: user._id }).catch(() => {});
        await OtpSession.deleteMany({
            identifier: { $in: [oldEmail.toLowerCase(), oldPhone ? oldPhone.replace(/\D/g, '').slice(-10) : ''].filter(Boolean) }
        }).catch(() => {});
        await PaymentPreference.deleteOne({ user: user._id }).catch(() => {});
        await Notification.deleteMany({
            $or: [
                { user_id: user._id },
                { user: user._id },
                ...(oldPhone ? [{ customerPhone: oldPhone }] : [])
            ]
        }).catch(() => {});

        // 6. Redact PII from past orders, rentals, appointments (Financial Records Retention)
        await Order.updateMany(
            {
                $or: [
                    { user: user._id },
                    ...(oldPhone ? [{ 'shippingAddress.mobile': oldPhone }] : []),
                    { legacyUserId: String(user._id) }
                ]
            },
            {
                $set: {
                    'shippingAddress.fullName': 'Deleted User',
                    'shippingAddress.mobile': '0000000000',
                    'shippingAddress.houseNo': 'Redacted',
                    'shippingAddress.street': 'Redacted'
                }
            }
        ).catch(() => {});

        await Rental.updateMany(
            {
                $or: [
                    { user: user._id },
                    ...(oldPhone ? [{ customerPhone: oldPhone }] : []),
                    ...(oldEmail ? [{ customerEmail: oldEmail }] : [])
                ]
            },
            {
                $set: {
                    customerName: 'Deleted Customer',
                    customerPhone: '0000000000',
                    customerEmail: anonymizedEmail,
                    notes: 'Redacted'
                }
            }
        ).catch(() => {});

        await Appointment.updateMany(
            {
                $or: [
                    { user: user._id },
                    ...(oldPhone ? [{ customerPhone: oldPhone }] : [])
                ]
            },
            {
                $set: {
                    customerName: 'Deleted Customer',
                    customerPhone: '0000000000',
                    notes: 'Redacted'
                }
            }
        ).catch(() => {});

        // 7. AuditLog entry (NO PII)
        await AuditLog.create({
            admin_id: user._id,
            action: 'account_deleted',
            entity: 'User',
            entity_id: String(user._id),
            before_snapshot: null
        }).catch(() => {});

        res.json({
            success: true,
            message: 'Your account has been deleted and personal data anonymized.'
        });
    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({ message: 'Failed to delete account. Please contact support.' });
    }
};

router.post('/delete-account', protect, handleDeleteAccount);
router.delete('/profile', protect, handleDeleteAccount);

export default router;

