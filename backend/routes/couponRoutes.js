import express from 'express';
import mongoose from 'mongoose';
import Coupon from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { logAuditEvent } from '../services/auditService.js';

const router = express.Router();

// Rate limiter for coupon validation (10/min per user)
const validationLimiter = new Map();
function checkValidationRateLimit(userId) {
    const key = String(userId);
    const now = Date.now();
    const entry = validationLimiter.get(key);
    if (!entry || now - entry.firstAt > 60000) {
        validationLimiter.set(key, { count: 1, firstAt: now });
        return true;
    }
    if (entry.count >= 10) return false;
    entry.count += 1;
    return true;
}

/**
 * Authoritative Server-side Coupon Validator
 * Recomputes items total from DB prices.
 */
export async function validateCouponHelper(code, items, userId) {
    if (!code || typeof code !== 'string') {
        return { valid: false, reason: 'invalid_code', message: 'Coupon code is required' };
    }
    const normalizedCode = code.trim().toUpperCase();

    if (!Array.isArray(items) || items.length === 0) {
        return { valid: false, reason: 'empty_cart', message: 'Cart cannot be empty' };
    }

    // 1. Authoritative item price calculation from DB
    const validProdIds = items
        .map(i => i.product || i._id)
        .filter(id => id && mongoose.Types.ObjectId.isValid(id));

    const productsInDb = await Product.find({ _id: { $in: validProdIds }, isDeleted: { $ne: true } });
    const productMap = new Map(productsInDb.map(p => [p._id.toString(), p]));

    let itemsTotal = 0;
    for (const it of items) {
        const pid = (it.product || it._id)?.toString();
        if (pid && productMap.has(pid)) {
            const qty = Math.max(1, Math.floor(Number(it.quantity) || 1));
            itemsTotal += Number(productMap.get(pid).price) * qty;
        }
    }

    if (itemsTotal <= 0) {
        return { valid: false, reason: 'zero_total', message: 'No valid products found to apply coupon' };
    }

    // 2. Fetch coupon
    const coupon = await Coupon.findOne({ code: normalizedCode });
    if (!coupon) {
        return { valid: false, reason: 'not_found', message: 'Invalid or unrecognized coupon code' };
    }
    if (!coupon.active) {
        return { valid: false, reason: 'inactive', message: 'This coupon is currently inactive' };
    }

    const now = new Date();
    if (coupon.startAt && now < coupon.startAt) {
        return { valid: false, reason: 'not_started', message: 'This coupon promotion has not started yet' };
    }
    if (coupon.endAt && now > coupon.endAt) {
        return { valid: false, reason: 'expired', message: 'This coupon has expired' };
    }

    if (coupon.minOrderAmount && itemsTotal < coupon.minOrderAmount) {
        return {
            valid: false,
            reason: 'below_minimum',
            minOrderAmount: coupon.minOrderAmount,
            message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
        };
    }

    if (userId && coupon.usageLimitPerUser) {
        const userRedemptions = await CouponRedemption.countDocuments({
            coupon: coupon._id,
            user: userId
        });
        if (userRedemptions >= coupon.usageLimitPerUser) {
            return {
                valid: false,
                reason: 'already_used',
                message: `You have already redeemed this coupon the maximum allowed times (${coupon.usageLimitPerUser})`
            };
        }
    }

    if (coupon.usageLimitTotal && coupon.usedCount >= coupon.usageLimitTotal) {
        return { valid: false, reason: 'limit_reached', message: 'Coupon usage limit has been reached' };
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percent') {
        discount = Math.round((itemsTotal * coupon.value) / 100);
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
        }
    } else if (coupon.type === 'flat') {
        discount = coupon.value;
    }

    // Discount cannot exceed items total
    if (discount > itemsTotal) {
        discount = itemsTotal;
    }

    return {
        valid: true,
        coupon,
        discount,
        code: coupon.code,
        itemsTotal
    };
}

// @route   POST /api/coupons/validate
// @desc    Validate coupon code and return authoritative discount amount
router.post('/validate', protect, async (req, res) => {
    try {
        if (!checkValidationRateLimit(req.user._id)) {
            return res.status(429).json({ message: 'Too many coupon validation requests. Please wait a moment.' });
        }

        const { code, items } = req.body;
        const result = await validateCouponHelper(code, items, req.user._id);

        if (!result.valid) {
            return res.status(400).json({
                valid: false,
                reason: result.reason,
                message: result.message,
                minOrderAmount: result.minOrderAmount
            });
        }

        res.json({
            valid: true,
            code: result.code,
            discount: result.discount,
            itemsTotal: result.itemsTotal,
            message: `Coupon "${result.code}" applied! You save ₹${result.discount}`
        });
    } catch (error) {
        console.error('Coupon validation error:', error.message);
        res.status(500).json({ message: 'Failed to validate coupon' });
    }
});

// @route   GET /api/coupons/public
// @desc    Get public active coupons for Offers screen
router.get('/public', async (req, res) => {
    try {
        const now = new Date();
        const coupons = await Coupon.find({
            active: true,
            isPublic: true,
            $and: [
                { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
                { $or: [{ endAt: null }, { endAt: { $gte: now } }] }
            ]
        })
            .select('code type value maxDiscount minOrderAmount description endAt')
            .sort({ createdAt: -1 })
            .lean();

        res.setHeader('Cache-Control', 'public, max-age=60');
        res.json(coupons);
    } catch (error) {
        console.error('Public coupons error:', error.message);
        res.status(500).json({ message: 'Failed to fetch offers' });
    }
});

// @route   GET /api/coupons/admin
// @desc    Admin: get all coupons with usage stats
router.get('/admin', protect, adminOnly, async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
        res.json(coupons);
    } catch (error) {
        console.error('Admin coupons error:', error.message);
        res.status(500).json({ message: 'Failed to fetch coupons' });
    }
});

// @route   POST /api/coupons
// @desc    Admin: create new coupon
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const {
            code, type, value, maxDiscount, minOrderAmount,
            startAt, endAt, usageLimitTotal, usageLimitPerUser,
            active, isPublic, description
        } = req.body;

        if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        const coupon = new Coupon({
            code: String(code).trim().toUpperCase(),
            type,
            value: Number(value),
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            minOrderAmount: Number(minOrderAmount) || 0,
            startAt: startAt ? new Date(startAt) : null,
            endAt: endAt ? new Date(endAt) : null,
            usageLimitTotal: usageLimitTotal ? Number(usageLimitTotal) : null,
            usageLimitPerUser: Number(usageLimitPerUser) || 1,
            active: active !== undefined ? Boolean(active) : true,
            isPublic: isPublic !== undefined ? Boolean(isPublic) : false,
            description: description ? String(description).trim() : ''
        });

        await coupon.save();

        await logAuditEvent(req.user._id, 'CREATE', 'Coupon', coupon._id, null);

        res.status(201).json(coupon);
    } catch (error) {
        console.error('Create coupon error:', error.message);
        res.status(400).json({ message: error.message || 'Failed to create coupon' });
    }
});

// @route   PUT /api/coupons/:id
// @desc    Admin: update coupon
router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        const beforeSnapshot = coupon.toObject();
        const {
            type, value, maxDiscount, minOrderAmount,
            startAt, endAt, usageLimitTotal, usageLimitPerUser,
            active, isPublic, description
        } = req.body;

        if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        if (type !== undefined) coupon.type = type;
        if (value !== undefined) coupon.value = Number(value);
        if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
        if (minOrderAmount !== undefined) coupon.minOrderAmount = Number(minOrderAmount);
        if (startAt !== undefined) coupon.startAt = startAt ? new Date(startAt) : null;
        if (endAt !== undefined) coupon.endAt = endAt ? new Date(endAt) : null;
        if (usageLimitTotal !== undefined) coupon.usageLimitTotal = usageLimitTotal ? Number(usageLimitTotal) : null;
        if (usageLimitPerUser !== undefined) coupon.usageLimitPerUser = Number(usageLimitPerUser);
        if (active !== undefined) coupon.active = Boolean(active);
        if (isPublic !== undefined) coupon.isPublic = Boolean(isPublic);
        if (description !== undefined) coupon.description = String(description).trim();

        await coupon.save();

        await logAuditEvent(req.user._id, 'UPDATE', 'Coupon', coupon._id, beforeSnapshot);

        res.json(coupon);
    } catch (error) {
        console.error('Update coupon error:', error.message);
        res.status(400).json({ message: error.message || 'Failed to update coupon' });
    }
});

// @route   DELETE /api/coupons/:id
// @desc    Admin: delete coupon or deactivate if already redeemed
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        const beforeSnapshot = coupon.toObject();

        if (coupon.usedCount > 0) {
            // Once redeemed, deactivate instead of delete to preserve order history
            coupon.active = false;
            await coupon.save();
            await logAuditEvent(req.user._id, 'DEACTIVATE', 'Coupon', coupon._id, beforeSnapshot);
            return res.json({ success: true, message: 'Coupon has existing redemptions and was deactivated instead of deleted.' });
        }

        await Coupon.findByIdAndDelete(req.params.id);
        await logAuditEvent(req.user._id, 'DELETE', 'Coupon', req.params.id, beforeSnapshot);

        res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error('Delete coupon error:', error.message);
        res.status(500).json({ message: 'Failed to delete coupon' });
    }
});

// @route   GET /api/coupons/:id/redemptions
// @desc    Admin: list redemptions for a coupon
router.get('/:id/redemptions', protect, adminOnly, async (req, res) => {
    try {
        const redemptions = await CouponRedemption.find({ coupon: req.params.id })
            .populate('user', 'name email phone')
            .populate('order', 'totalAmount createdAt status')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.json(redemptions);
    } catch (error) {
        console.error('Coupon redemptions error:', error.message);
        res.status(500).json({ message: 'Failed to fetch redemptions' });
    }
});

export default router;
