import express from 'express';
import WishlistItem from '../models/WishlistItem.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All wishlist routes require authentication
router.use(protect);

// @route   GET /api/wishlist
// @desc    Get user's wishlist products
router.get('/', async (req, res) => {
  try {
    const items = await WishlistItem.find({ user_id: req.user._id })
      .sort({ created_at: -1 })
      .populate('product_id')
      .lean();

    // Map to valid products, filtering out products that might have been deleted
    const products = items
      .filter(item => item.product_id != null)
      .map(item => ({
        ...item.product_id,
        wishlist_created_at: item.created_at,
      }));

    res.json(products);
  } catch (err) {
    console.error('Error fetching wishlist:', err);
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
});

// @route   POST /api/wishlist
// @desc    Add product to wishlist (idempotent)
router.post('/', async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const item = await WishlistItem.findOneAndUpdate(
      { user_id: req.user._id, product_id: product._id },
      { $setOnInsert: { user_id: req.user._id, product_id: product._id, created_at: new Date() } },
      { upsert: true, new: true }
    );

    res.json({ success: true, item });
  } catch (err) {
    console.error('Error adding to wishlist:', err);
    res.status(500).json({ message: 'Failed to add to wishlist' });
  }
});

// @route   DELETE /api/wishlist/:productId
// @desc    Remove product from user's wishlist
router.delete('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const deleted = await WishlistItem.findOneAndDelete({
      user_id: req.user._id,
      product_id: productId,
    });

    res.json({ success: true, removed: Boolean(deleted) });
  } catch (err) {
    console.error('Error removing from wishlist:', err);
    res.status(500).json({ message: 'Failed to remove from wishlist' });
  }
});

export default router;

