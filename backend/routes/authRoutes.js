import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'default_secret', {
        expiresIn: '30d'
    });
};

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, phone, address } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields (name, email, password)' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const userExists = await User.findOne({ email: normalizedEmail });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
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
            phone: phone || (address?.mobile || ''),
            role: role || 'user',
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
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
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
        res.status(500).json({ message: 'Server error during login', error: error.message });
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
        res.status(500).json({ message: 'Error updating profile', error: error.message });
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
        res.status(500).json({ message: 'Failed to add address', error: error.message });
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
        res.status(500).json({ message: 'Failed to update address', error: error.message });
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
        res.status(500).json({ message: 'Failed to delete address', error: error.message });
    }
});

// @route   GET /api/auth/users
// @desc    Get all users (admin only)
router.get('/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

export default router;

