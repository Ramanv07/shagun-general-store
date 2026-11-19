import express from 'express';
import rateLimit from 'express-rate-limit';
import FeedbackMessage from '../models/FeedbackMessage.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

const feedbackRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many feedback submissions. Please try again later.' }
});

// @route   POST /api/feedback
// @desc    Submit user feedback (authenticated)
router.post('/', protect, feedbackRateLimiter, async (req, res) => {
  try {
    const { category, message, appVersion, deviceModel, platform } = req.body;

    const validCategories = ['Bug', 'Feature Request', 'Product / Store Experience', 'Other'];
    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({
        message: `Please select a valid category: ${validCategories.join(', ')}`
      });
    }

    const cleanMessage = String(message || '').trim();
    if (!cleanMessage || cleanMessage.length < 5) {
      return res.status(400).json({ message: 'Feedback message must be at least 5 characters long.' });
    }
    if (cleanMessage.length > 1000) {
      return res.status(400).json({ message: 'Feedback message cannot exceed 1000 characters.' });
    }

    const validPlatform = ['web', 'android', 'ios'].includes(platform) ? platform : 'android';

    const feedback = await FeedbackMessage.create({
      user_id: req.user._id,
      category,
      message: cleanMessage,
      appVersion: String(appVersion || '1.0.0').slice(0, 30),
      deviceModel: String(deviceModel || '').slice(0, 100),
      platform: validPlatform
    });

    res.status(201).json({
      success: true,
      message: 'Feedback received! Thank you for helping us improve Shagun Mart.',
      feedbackId: feedback._id
    });
  } catch (error) {
    console.error('Feedback creation error:', error);
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
});

// @route   GET /api/feedback/admin
// @desc    Admin: List feedback messages with optional status filter
router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    const { status, category } = req.query;
    const query = {};
    if (status && ['pending', 'reviewed', 'resolved'].includes(status)) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }

    const items = await FeedbackMessage.find(query)
      .populate('user_id', 'name email phone')
      .sort({ created_at: -1 })
      .lean();

    res.json(items);
  } catch (error) {
    console.error('Admin feedback fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
});

// @route   PUT /api/feedback/admin/:id/status
// @desc    Admin: Update status & notes of a feedback item
router.put('/admin/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    if (!status || !['pending', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updated = await FeedbackMessage.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          adminNotes: typeof adminNotes === 'string' ? adminNotes.trim() : undefined
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.json({ success: true, feedback: updated });
  } catch (error) {
    console.error('Admin feedback update error:', error);
    res.status(500).json({ message: 'Failed to update feedback' });
  }
});

// @route   GET /api/feedback/admin/export
// @desc    Admin: Export feedback as CSV
router.get('/admin/export', protect, adminOnly, async (req, res) => {
  try {
    const items = await FeedbackMessage.find()
      .populate('user_id', 'name email phone')
      .sort({ created_at: -1 })
      .lean();

    const headers = 'ID,Date,User Name,User Email,Category,Message,Platform,App Version,Device Model,Status,Admin Notes\n';
    const rows = items.map(f => {
      const escape = (str) => `"${String(str || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
      return [
        f._id,
        f.created_at ? new Date(f.created_at).toISOString() : '',
        escape(f.user_id?.name || 'Unknown'),
        escape(f.user_id?.email || 'N/A'),
        escape(f.category),
        escape(f.message),
        escape(f.platform),
        escape(f.appVersion),
        escape(f.deviceModel),
        escape(f.status),
        escape(f.adminNotes)
      ].join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="feedback_export.csv"');
    res.send(headers + rows);
  } catch (error) {
    console.error('Admin feedback export error:', error);
    res.status(500).json({ message: 'Failed to export feedback' });
  }
});

export default router;
