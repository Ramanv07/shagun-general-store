import express from 'express';
import rateLimit from 'express-rate-limit';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const reviewWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many review actions, please try again later' },
});

// @route   GET /api/reviews/product/:productId
// @desc    Get reviews and aggregate rating for a product (approved only)
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({
      product_id: productId,
      status: 'approved',
    })
      .populate('user_id', 'name')
      .sort({ created_at: -1 })
      .lean();

    const count = reviews.length;
    const avg = count > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
      : null;

    res.json({
      reviews: reviews.map(r => ({
        id: r._id,
        user: r.user_id?.name || 'Customer',
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
      })),
      averageRating: avg ? parseFloat(avg.toFixed(1)) : null,
      reviewCount: count,
    });
  } catch (err) {
    console.error('Error fetching product reviews:', err);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// @route   POST /api/reviews
// @desc    Create a review (verified purchase only)
router.post('/', protect, reviewWriteLimiter, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    if (!productId || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Valid productId and rating (1–5) are required' });
    }

    const cleanComment = (comment || '').trim();
    if (!cleanComment || cleanComment.length > 1000) {
      return res.status(400).json({ message: 'Comment is required and must be under 1000 characters' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if already reviewed
    const existing = await Review.findOne({ user_id: req.user._id, product_id: product._id });
    if (existing) {
      return res.status(409).json({ message: 'You have already reviewed this product' });
    }

    // Verified Purchase Check: must have a delivered order containing this product
    const deliveredOrder = await Order.findOne({
      $or: [
        { user: req.user._id },
        { legacyUserId: req.user._id.toString() },
      ],
      status: { $regex: /^delivered$/i },
      'items.product': product._id,
    });

    if (!deliveredOrder) {
      return res.status(403).json({
        message: 'Only verified purchasers with a delivered order can review this product',
      });
    }

    const review = await Review.create({
      user_id: req.user._id,
      product_id: product._id,
      order_id: deliveredOrder._id,
      rating,
      comment: cleanComment,
      status: 'approved',
      created_at: new Date(),
    });

    res.status(201).json({ success: true, review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already submitted a review for this product.' });
    }
    console.error('Error creating review:', err);
    res.status(500).json({ message: 'Failed to create review' });
  }
});

// @route   GET /api/reviews/mine
// @desc    Get reviews written by authenticated user
router.get('/mine', protect, async (req, res) => {
  try {
    const reviews = await Review.find({ user_id: req.user._id })
      .populate('product_id', 'name image price')
      .sort({ created_at: -1 })
      .lean();

    res.json(reviews);
  } catch (err) {
    console.error('Error fetching user reviews:', err);
    res.status(500).json({ message: 'Failed to fetch your reviews' });
  }
});

// @route   GET /api/reviews/eligible
// @desc    Get products from delivered orders that user has not reviewed yet
router.get('/eligible', protect, async (req, res) => {
  try {
    const deliveredOrders = await Order.find({
      $or: [
        { user: req.user._id },
        { legacyUserId: req.user._id.toString() },
      ],
      status: { $regex: /^delivered$/i },
    }).lean();

    const deliveredProductIds = [];
    for (const ord of deliveredOrders) {
      for (const item of ord.items || []) {
        if (item.product) {
          deliveredProductIds.push(item.product.toString());
        }
      }
    }

    const reviewedProductIds = (await Review.find({ user_id: req.user._id }).select('product_id').lean())
      .map(r => r.product_id.toString());

    const eligibleIds = [...new Set(deliveredProductIds.filter(id => !reviewedProductIds.includes(id)))];
    const eligibleProducts = await Product.find({ _id: { $in: eligibleIds } }).lean();

    res.json(eligibleProducts);
  } catch (err) {
    console.error('Error fetching eligible products for review:', err);
    res.status(500).json({ message: 'Failed to fetch reviewable products' });
  }
});

// @route   PUT /api/reviews/:id
// @desc    Edit own review
router.put('/:id', protect, reviewWriteLimiter, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const updateData = {};
    if (typeof rating === 'number' && rating >= 1 && rating <= 5) updateData.rating = rating;
    if (typeof comment === 'string' && comment.trim() && comment.length <= 1000) updateData.comment = comment.trim();

    const updated = await Review.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Review not found or unauthorized' });
    }
    res.json({ success: true, review: updated });
  } catch (err) {
    console.error('Error updating review:', err);
    res.status(500).json({ message: 'Failed to update review' });
  }
});

// @route   DELETE /api/reviews/:id
// @desc    Delete own review
router.delete('/:id', protect, async (req, res) => {
  try {
    const deleted = await Review.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Review not found or unauthorized' });
    }
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ message: 'Failed to delete review' });
  }
});

export default router;

