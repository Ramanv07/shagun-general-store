import express from 'express';
import Brand from '../models/Brand.js';

const router = express.Router();

// @route   GET /api/brands
// @desc    Get all active brands
router.get('/', async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching brands', error: error.message });
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

