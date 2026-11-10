import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import PaymentPreference from '../models/PaymentPreference.js';

const router = express.Router();

// @route   GET /api/payment-preferences
// @desc    Get user payment preference (preferred method only, no customer UPI ID)
router.get('/', protect, async (req, res) => {
  try {
    const pref = await PaymentPreference.findOne({ user_id: req.user._id }).lean();
    res.json({
      preferred_method: pref ? pref.preferred_method : 'COD'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payment preferences', error: error.message });
  }
});

// @route   PUT /api/payment-preferences
// @desc    Update user payment preference (method only, no UPI ID accepted or stored)
router.put('/', protect, async (req, res) => {
  try {
    const { preferred_method } = req.body;

    if (!preferred_method || !['COD', 'UPI'].includes(preferred_method)) {
      return res.status(400).json({ message: "preferred_method must be either 'COD' or 'UPI'" });
    }

    const updated = await PaymentPreference.findOneAndUpdate(
      { user_id: req.user._id },
      {
        $set: {
          preferred_method,
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      preferred_method: updated.preferred_method
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save payment preferences', error: error.message });
  }
});

export default router;
