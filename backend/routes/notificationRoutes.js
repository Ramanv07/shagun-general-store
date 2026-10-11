import express from 'express';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { broadcastCustomerNotification, sendExpoPushNotifications } from '../services/notificationService.js';

const router = express.Router();

// @route   POST /api/notifications/register-token
// @desc    Register Expo Push Token for the logged in user or device
router.post('/register-token', async (req, res) => {
    try {
        const { pushToken, userId } = req.body;

        if (!pushToken) {
            return res.status(400).json({ message: 'Push token is required' });
        }

        let targetUserId = userId;
        if (!targetUserId && req.headers.authorization) {
            try {
                // If token provided, try to decode
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

        // Also check if any user has this token
        res.json({ success: true, message: 'Token acknowledged' });
    } catch (err) {
        console.error('Error registering push token:', err);
        res.status(500).json({ message: 'Failed to register push token' });
    }
});

// @route   GET /api/notifications
// @desc    Get current user's notifications feed
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('notifications');
        res.json(user?.notifications || []);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
});

// @route   PUT /api/notifications/mark-read
// @desc    Mark all user notifications as read
router.put('/mark-read', protect, async (req, res) => {
    try {
        await User.updateOne(
            { _id: req.user._id },
            { $set: { 'notifications.$[].read': true } }
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error marking notifications as read:', err);
        res.status(500).json({ message: 'Failed to mark read' });
    }
});

// @route   POST /api/notifications/broadcast
// @desc    Admin sends promotional / broadcast notification to ALL customers
router.post('/broadcast', protect, adminOnly, async (req, res) => {
    try {
        const { title, body, data } = req.body;
        if (!title || !body) {
            return res.status(400).json({ message: 'Title and body are required for broadcast' });
        }

        const result = await broadcastCustomerNotification({
            title,
            body,
            data: data || { type: 'promotion' }
        });

        res.json({
            success: true,
            message: `Notification broadcast dispatched to ${result.totalSent} registered devices!`,
            devicesReached: result.totalSent
        });
    } catch (err) {
        console.error('Broadcast notification error:', err);
        res.status(500).json({ message: 'Failed to broadcast notification' });
    }
});

export default router;
