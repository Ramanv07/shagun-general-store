import express from 'express';
import Banner from '../models/Banner.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { logAuditEvent } from '../services/auditService.js';

const router = express.Router();

// @route   GET /api/banners
// @desc    Public active banner feed for app/web home & offers
router.get('/', async (req, res) => {
    try {
        const { placement } = req.query;
        const now = new Date();

        const query = {
            active: true,
            $and: [
                { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
                { $or: [{ endAt: null }, { endAt: { $gte: now } }] }
            ]
        };

        if (placement) {
            query.placement = placement;
        }

        const banners = await Banner.find(query)
            .sort({ sortOrder: 1, createdAt: -1 })
            .lean();

        // 60-second short public cache header
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.json(banners);
    } catch (error) {
        console.error('Fetch public banners error:', error.message);
        res.status(500).json({ message: 'Failed to fetch banners' });
    }
});

// @route   GET /api/banners/admin
// @desc    Admin: get all banners
router.get('/admin', protect, adminOnly, async (req, res) => {
    try {
        const banners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 });
        res.json(banners);
    } catch (error) {
        console.error('Admin fetch banners error:', error.message);
        res.status(500).json({ message: 'Failed to fetch banners' });
    }
});

// @route   POST /api/banners
// @desc    Admin: create new banner
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { title, imageUrl, placement, sortOrder, active, startAt, endAt, target } = req.body;

        if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        const placements = Array.isArray(placement) ? placement : [placement || 'web_home'];

        // Validate max 10 active banners per placement
        if (active !== false) {
            for (const p of placements) {
                const count = await Banner.countDocuments({ placement: p, active: true });
                if (count >= 10) {
                    return res.status(400).json({
                        message: `Maximum 10 active banners allowed for placement "${p}". Please deactivate an existing banner first.`
                    });
                }
            }
        }

        const banner = new Banner({
            title: title ? String(title).slice(0, 80) : '',
            imageUrl,
            placement: placements,
            sortOrder: Number(sortOrder) || 0,
            active: active !== undefined ? Boolean(active) : true,
            startAt: startAt ? new Date(startAt) : null,
            endAt: endAt ? new Date(endAt) : null,
            target: target || { type: 'none', value: '' }
        });

        await banner.save();

        await logAuditEvent(req.user._id, 'CREATE', 'Banner', banner._id, null);

        res.status(201).json(banner);
    } catch (error) {
        console.error('Create banner error:', error.message);
        res.status(400).json({ message: error.message || 'Failed to create banner' });
    }
});

// @route   PUT /api/banners/reorder
// @desc    Admin: batch reorder banners
router.put('/reorder', protect, adminOnly, async (req, res) => {
    try {
        const { items } = req.body; // Array of { id, sortOrder }
        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'Array of items required' });
        }

        const bulkOps = items.map(item => ({
            updateOne: {
                filter: { _id: item.id || item._id },
                update: { $set: { sortOrder: Number(item.sortOrder) || 0 } }
            }
        }));

        if (bulkOps.length > 0) {
            await Banner.bulkWrite(bulkOps);
        }

        await logAuditEvent(req.user._id, 'REORDER', 'Banner', 'batch', { count: bulkOps.length });

        res.json({ success: true, message: 'Banners reordered successfully' });
    } catch (error) {
        console.error('Reorder banners error:', error.message);
        res.status(500).json({ message: 'Failed to reorder banners' });
    }
});

// @route   PUT /api/banners/:id
// @desc    Admin: update banner
router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        const beforeSnapshot = banner.toObject();
        const { title, imageUrl, placement, sortOrder, active, startAt, endAt, target } = req.body;

        if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        if (title !== undefined) banner.title = String(title).slice(0, 80);
        if (imageUrl) banner.imageUrl = imageUrl;
        if (placement) banner.placement = Array.isArray(placement) ? placement : [placement];
        if (sortOrder !== undefined) banner.sortOrder = Number(sortOrder);
        if (active !== undefined) banner.active = Boolean(active);
        if (startAt !== undefined) banner.startAt = startAt ? new Date(startAt) : null;
        if (endAt !== undefined) banner.endAt = endAt ? new Date(endAt) : null;
        if (target) banner.target = target;

        await banner.save();

        await logAuditEvent(req.user._id, 'UPDATE', 'Banner', banner._id, beforeSnapshot);

        res.json(banner);
    } catch (error) {
        console.error('Update banner error:', error.message);
        res.status(400).json({ message: error.message || 'Failed to update banner' });
    }
});

// @route   DELETE /api/banners/:id
// @desc    Admin: delete banner
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        const beforeSnapshot = banner.toObject();
        await Banner.findByIdAndDelete(req.params.id);

        await logAuditEvent(req.user._id, 'DELETE', 'Banner', req.params.id, beforeSnapshot);

        res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (error) {
        console.error('Delete banner error:', error.message);
        res.status(500).json({ message: 'Failed to delete banner' });
    }
});

export default router;

