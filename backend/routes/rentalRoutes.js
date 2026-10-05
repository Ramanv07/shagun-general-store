import express from 'express';
import jwt from 'jsonwebtoken';
import Rental from '../models/Rental.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to optionally extract user if token present
const optionalAuth = async (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
            req.user = await User.findById(decoded.id).select('-password');
        } catch (e) {
            // Ignore token error for optional auth
        }
    }
    next();
};

// @route   GET /api/rentals/active
// @desc    Get all currently active / booked rentals (public) to show availability
router.get('/active', async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Find bookings that are active or booked where returnDate is today or in the future
        const activeRentals = await Rental.find({
            status: { $in: ['Booked', 'Active'] },
            returnDate: { $gte: todayStart }
        })
        .populate('lehenga', 'name price image images')
        .sort({ returnDate: 1 });

        // Build a lookup map keyed by lehenga ID
        const activeMap = {};
        for (const rental of activeRentals) {
            const lehengaId = rental.lehenga?._id ? rental.lehenga._id.toString() : rental.lehenga.toString();
            // If already has an earlier booking, keep the latest returnDate for availability
            if (!activeMap[lehengaId] || new Date(rental.returnDate) > new Date(activeMap[lehengaId].returnDate)) {
                activeMap[lehengaId] = {
                    isBooked: true,
                    rentalId: rental._id,
                    customerName: rental.customerName,
                    startDate: rental.startDate,
                    returnDate: rental.returnDate,
                    availableFrom: rental.returnDate,
                    status: rental.status
                };
            }
        }

        res.json({ activeMap, activeRentals });
    } catch (error) {
        console.error('Error fetching active rentals:', error);
        res.status(500).json({ message: 'Failed to fetch active rentals', error: error.message });
    }
});

// @route   GET /api/rentals
// @desc    Get all rental bookings (admin sees all, user sees own)
router.get('/', protect, async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'admin') {
            query.user = req.user._id;
        }

        const rentals = await Rental.find(query)
            .populate('lehenga', 'name price image images description')
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 });

        res.json(rentals);
    } catch (error) {
        console.error('Error fetching rentals:', error);
        res.status(500).json({ message: 'Failed to fetch rentals', error: error.message });
    }
});

// @route   POST /api/rentals
// @desc    Create a new rental booking (public / user / admin)
router.post('/', optionalAuth, async (req, res) => {
    try {
        const {
            lehengaId,
            productId,
            customerName,
            customerPhone,
            customerEmail,
            startDate,
            returnDate,
            rentalPrice,
            securityDeposit,
            notes
        } = req.body;

        const targetId = lehengaId || productId;
        if (!targetId || !customerName || !customerPhone || !startDate || !returnDate) {
            return res.status(400).json({
                message: 'Please provide Lehenga, Customer Name, Phone, Booking Date, and Return Date.'
            });
        }

        const parsedStart = new Date(startDate);
        const parsedReturn = new Date(returnDate);

        if (isNaN(parsedStart.getTime()) || isNaN(parsedReturn.getTime())) {
            return res.status(400).json({ message: 'Invalid start date or return date format.' });
        }

        if (parsedReturn <= parsedStart) {
            return res.status(400).json({ message: 'Return date must be after booking date.' });
        }

        // Check if lehenga exists in DB
        const lehenga = await Product.findById(targetId);
        if (!lehenga) {
            return res.status(404).json({ message: 'Bridal Lehenga not found in catalog.' });
        }

        // Check for conflicting active bookings (overlapping date ranges)
        // Two intervals [s1, e1] and [s2, e2] overlap if: s1 <= e2 && e1 >= s2
        const conflictingRental = await Rental.findOne({
            lehenga: targetId,
            status: { $in: ['Booked', 'Active'] },
            startDate: { $lte: parsedReturn },
            returnDate: { $gte: parsedStart }
        });

        if (conflictingRental) {
            const conflictReturn = new Date(conflictingRental.returnDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            return res.status(400).json({
                message: `This lehenga is already booked for these dates. It will be available for rent starting ${conflictReturn}.`,
                conflict: {
                    startDate: conflictingRental.startDate,
                    returnDate: conflictingRental.returnDate,
                    availableFrom: conflictingRental.returnDate
                }
            });
        }

        const finalRentalPrice = rentalPrice !== undefined ? Number(rentalPrice) : Number(lehenga.price);
        const finalDeposit = securityDeposit !== undefined ? Number(securityDeposit) : 0;
        const totalAmount = finalRentalPrice + finalDeposit;

        const newRental = new Rental({
            lehenga: lehenga._id,
            lehengaName: lehenga.name,
            lehengaImage: lehenga.image || (lehenga.images && lehenga.images[0]) || '',
            user: req.user ? req.user._id : undefined,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerEmail: customerEmail ? customerEmail.trim() : (req.user ? req.user.email : ''),
            startDate: parsedStart,
            returnDate: parsedReturn,
            rentalPrice: finalRentalPrice,
            securityDeposit: finalDeposit,
            totalAmount,
            status: 'Booked',
            notes: notes || ''
        });

        const savedRental = await newRental.save();
        res.status(201).json(savedRental);
    } catch (error) {
        console.error('Error creating rental booking:', error);
        res.status(500).json({ message: 'Failed to create rental booking', error: error.message });
    }
});

// @route   PUT /api/rentals/:id/status
// @desc    Update rental status (Admin only) - e.g. mark as 'Returned', 'Active', 'Cancelled'
router.put('/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Booked', 'Active', 'Returned', 'Cancelled'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                message: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }

        const rental = await Rental.findById(req.params.id);
        if (!rental) {
            return res.status(404).json({ message: 'Rental booking not found.' });
        }

        rental.status = status;
        if (status === 'Returned') {
            rental.actualReturnDate = new Date();
        }

        const updated = await rental.save();
        res.json(updated);
    } catch (error) {
        console.error('Error updating rental status:', error);
        res.status(500).json({ message: 'Failed to update rental status', error: error.message });
    }
});

// @route   DELETE /api/rentals/:id
// @desc    Delete a rental booking (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const rental = await Rental.findById(req.params.id);
        if (!rental) {
            return res.status(404).json({ message: 'Rental booking not found.' });
        }

        await Rental.findByIdAndDelete(req.params.id);
        res.json({ message: 'Rental booking deleted successfully.' });
    } catch (error) {
        console.error('Error deleting rental:', error);
        res.status(500).json({ message: 'Failed to delete rental', error: error.message });
    }
});

export default router;
