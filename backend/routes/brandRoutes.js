import express from 'express';
import Brand from '../models/Brand.js';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { logAuditEvent } from '../services/auditService.js';

const router = express.Router();

function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// @route   GET /api/brands
// @desc    Get all active brands
router.get('/', async (req, res) => {
    try {
        const brands = await Brand.find({ isActive: true }).sort({ name: 1 }).lean();
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.json(brands);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brands', error: error.message });
    }
});

// @route   GET /api/brands/active-with-products
// @desc    Get active brands that have at least one in-stock / non-deleted product (for "Brands You Love" row)
router.get('/active-with-products', async (req, res) => {
    try {
        const brandIdsWithProducts = await Product.distinct('brand_id', {
            brand_id: { $ne: null },
            isDeleted: { $ne: true }
        });

        const brands = await Brand.find({
            _id: { $in: brandIdsWithProducts },
            isActive: true
        })
            .sort({ name: 1 })
            .lean();

        res.setHeader('Cache-Control', 'public, max-age=60');
        res.json(brands);
    } catch (error) {
        console.error('Active brands with products error:', error.message);
        res.status(500).json({ message: 'Error fetching active brands' });
    }
});

// @route   GET /api/brands/admin
// @desc    Admin: Get all brands with product counts
router.get('/admin', protect, adminOnly, async (req, res) => {
    try {
        const brands = await Brand.find().sort({ name: 1 }).lean();
        const counts = await Product.aggregate([
            { $match: { isDeleted: { $ne: true }, brand_id: { $ne: null } } },
            { $group: { _id: '$brand_id', count: { $sum: 1 } } }
        ]);

        const countMap = new Map(counts.map(c => [String(c._id), c.count]));
        const enriched = brands.map(b => ({
            ...b,
            productCount: countMap.get(String(b._id)) || 0
        }));

        res.json(enriched);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin brands' });
    }
});

// @route   POST /api/brands
// @desc    Admin: Create brand
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { name, logo, description, isActive } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Brand name is required' });
        }

        const cleanName = name.trim();
        let slug = slugify(cleanName);
        let existingSlug = await Brand.findOne({ slug });
        if (existingSlug) {
            slug = `${slug}-${Date.now().toString().slice(-4)}`;
        }

        const brand = new Brand({
            name: cleanName,
            slug,
            logo: logo ? String(logo).trim() : '',
            description: description ? String(description).trim() : '',
            isActive: isActive !== undefined ? Boolean(isActive) : true
        });

        await brand.save();

        await logAuditEvent(req.user._id, 'CREATE', 'Brand', brand._id, null);

        res.status(201).json(brand);
    } catch (error) {
        console.error('Create brand error:', error.message);
        res.status(400).json({ message: error.message || 'Failed to create brand' });
    }
});

// @route   PUT /api/brands/:id
// @desc    Admin: Update brand
router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }

        const beforeSnapshot = brand.toObject();
        const { name, logo, description, isActive } = req.body;

        if (name && name.trim() && name.trim() !== brand.name) {
            brand.name = name.trim();
            brand.slug = slugify(brand.name);
        }
        if (logo !== undefined) brand.logo = String(logo).trim();
        if (description !== undefined) brand.description = String(description).trim();
        if (isActive !== undefined) brand.isActive = Boolean(isActive);

        await brand.save();

        await logAuditEvent(req.user._id, 'UPDATE', 'Brand', brand._id, beforeSnapshot);

        res.json(brand);
    } catch (error) {
        console.error('Update brand error:', error.message);
        res.status(400).json({ message: error.message || 'Failed to update brand' });
    }
});

// @route   DELETE /api/brands/:id
// @desc    Admin: Delete brand or deactivate if has products
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }

        const beforeSnapshot = brand.toObject();
        const productCount = await Product.countDocuments({ brand_id: brand._id, isDeleted: { $ne: true } });

        if (productCount > 0) {
            brand.isActive = false;
            await brand.save();
            await logAuditEvent(req.user._id, 'DEACTIVATE', 'Brand', brand._id, beforeSnapshot);
            return res.json({ success: true, message: `Brand has ${productCount} active products and was deactivated.` });
        }

        await Brand.findByIdAndDelete(req.params.id);
        await logAuditEvent(req.user._id, 'DELETE', 'Brand', req.params.id, beforeSnapshot);

        res.json({ success: true, message: 'Brand deleted successfully' });
    } catch (error) {
        console.error('Delete brand error:', error.message);
        res.status(500).json({ message: 'Failed to delete brand' });
    }
});

// @route   GET /api/brands/:slug
// @desc    Get single brand by slug
router.get('/:slug', async (req, res) => {
    try {
        const brand = await Brand.findOne({ slug: req.params.slug, isActive: true }).lean();
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }
        res.json(brand);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brand', error: error.message });
    }
});

export default router;
