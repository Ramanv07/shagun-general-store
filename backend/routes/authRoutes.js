import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '90d' // Long-lasting session so user never gets logged out
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

// In-memory OTP storage with 5 minute expiration
const otpStore = new Map();

// @route   POST /api/auth/send-otp
// @desc    Generate and send 6-digit OTP (direct backend OTP)
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

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

        otpStore.set(cleanPhone, { otp, expiresAt });
        console.log(`\n========================================\n[SHAGUN OTP] Code for +91 ${cleanPhone}: ${otp} (or use 123456)\n========================================\n`);

        // Send real SMS via Fast2SMS if API key is configured
        if (process.env.FAST2SMS_API_KEY) {
            try {
                await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.FAST2SMS_API_KEY}&route=otp&variables_values=${otp}&flash=0&numbers=${cleanPhone}`);
                console.log(`[Fast2SMS] Real SMS dispatched to +91 ${cleanPhone}`);
            } catch (smsErr) {
                console.error('[Fast2SMS] Error sending SMS:', smsErr);
            }
        }

        if (process.env.NTFY_TOPIC) {
            fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
                method: 'POST',
                body: `Your Shagun Mart OTP is: ${otp}`,
                headers: { 'Title': 'Shagun Mart OTP' }
            }).catch(() => {});
        }

        res.json({
            success: true,
            message: `OTP sent via SMS to +91 ${cleanPhone}`
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify 6-digit OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ message: 'Phone and OTP are required' });
        }
        const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
        const record = otpStore.get(cleanPhone);

        // Accept generated OTP or universal fallback 123456
        if (otp === '123456' || (record && record.otp === otp.trim() && Date.now() < record.expiresAt)) {
            otpStore.delete(cleanPhone);
            return res.json({ success: true, verified: true });
        }

        if (record && Date.now() >= record.expiresAt) {
            otpStore.delete(cleanPhone);
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        res.status(400).json({ message: 'Invalid OTP code. Please try again.' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Failed to verify OTP' });
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
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// @route   POST /api/auth/google
// @desc    Authenticate or register user with Google OAuth
router.post('/google', async (req, res) => {
    try {
        const { name, email, googleId, photoUrl } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required for Google authentication' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        let user = await User.findOne({
            $or: [
                { email: normalizedEmail },
                ...(googleId ? [{ googleId }] : [])
            ]
        });

        if (user) {
            if (!user.googleId && googleId) user.googleId = googleId;
            if (!user.avatar && photoUrl) user.avatar = photoUrl;
            await user.save();
        } else {
            const randomPassword = Math.random().toString(36).slice(-10) + Date.now().toString(36);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            user = await User.create({
                name: name || normalizedEmail.split('@')[0],
                email: normalizedEmail,
                password: hashedPassword,
                googleId: googleId || '',
                avatar: photoUrl || '',
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
            token: generateToken(user._id)
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
            token: generateToken(user._id)
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
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            role: updatedUser.role,
            addresses: updatedUser.addresses,
            token: generateToken(updatedUser._id)
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// @route   DELETE /api/auth/profile
// @desc    Delete current user account and data (Google Play requirement)
router.delete('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role === 'admin') {
            return res.status(400).json({ message: 'Master admin account cannot be deleted' });
        }
        await User.findByIdAndDelete(req.user._id);
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({ message: 'Error deleting account' });
    }
});

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

export default router;

