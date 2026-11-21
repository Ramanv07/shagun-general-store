import express from 'express';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { broadcastCustomerNotification } from '../services/notificationService.js';

const router = express.Router();

// @route   POST /api/notifications/register-token
router.post('/register-token', async (req, res) => {
  try {
    const { pushToken, userId } = req.body;
    if (!pushToken) {
      return res.status(400).json({ message: 'Push token is required' });
    }

    let targetUserId = userId;
    if (!targetUserId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = (await import('jsonwebtoken')).default;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        targetUserId = decoded.id;
      } catch {}
    }

    if (targetUserId) {
      const user = await User.findById(targetUserId);
      if (user) {
        if (!user.pushTokens) user.pushTokens = [];
        if (!user.pushTokens.includes(pushToken)) {
          user.pushTokens.push(pushToken);
          await user.save();
        }
        return res.json({ success: true, message: 'Push token registered for user' });
      }
    }

    // Also register in guest device token store so broadcast reaches guest installs
    try {
      const StoreSetting = (await import('../models/StoreSetting.js')).default;
      let setting = await StoreSetting.findOne({ key: 'guest_push_tokens' });
      if (!setting) {
        setting = new StoreSetting({ key: 'guest_push_tokens', value: [] });
      }
      if (!Array.isArray(setting.value)) setting.value = [];
      if (!setting.value.includes(pushToken)) {
        setting.value.push(pushToken);
        await setting.save();
      }
    } catch (e) {
      console.warn('Guest token store error:', e.message);
    }

    res.json({ success: true, message: 'Token acknowledged' });
  } catch (err) {
    console.error('Error registering push token:', err);
    res.status(500).json({ message: 'Failed to register push token' });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get count of unread notifications for authenticated user
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user_id: req.user._id,
      read: false,
    });
    res.json({ count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// @route   GET /api/notifications
// @desc    Get current user's notifications feed
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.user._id })
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    // Backward-compatibility: if collection empty, fallback to User.notifications
    if (notifications.length === 0) {
      const user = await User.findById(req.user._id).select('notifications').lean();
      return res.json(user?.notifications || []);
    }

    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// @route   PUT /api/notifications/mark-all-read (or /mark-read)
// @desc    Mark all user notifications as read
router.put(['/mark-all-read', '/mark-read'], protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user._id, read: false },
      { $set: { read: true, read_at: new Date() } }
    );
    await User.updateOne(
      { _id: req.user._id },
      { $set: { 'notifications.$[].read': true } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notifications read:', err);
    res.status(500).json({ message: 'Failed to mark read' });
  }
});

// @route   PUT /api/notifications/:id/mark-read
// @desc    Mark a specific notification as read (ownership enforced)
router.put('/:id/mark-read', protect, async (req, res) => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { $set: { read: true, read_at: new Date() } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Notification not found or unauthorized' });
    }
    res.json({ success: true, notification: updated });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ message: 'Failed to mark notification read' });
  }
});

// @route   POST /api/notifications/broadcast
router.post('/broadcast', protect, adminOnly, async (req, res) => {
  try {
    const { title, body, data } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required for broadcast' });
    }

    const result = await broadcastCustomerNotification({
      title,
      body,
      data: data || { type: 'promotion' },
    });

    res.json({
      success: true,
      message: `Notification broadcast dispatched to ${result.totalSent} registered devices!`,
      devicesReached: result.totalSent,
    });
  } catch (err) {
    console.error('Broadcast notification error:', err);
    res.status(500).json({ message: 'Failed to broadcast notification' });
  }
});

export default router;
