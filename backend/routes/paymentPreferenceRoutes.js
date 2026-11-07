import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import PaymentPreference from '../models/PaymentPreference.js';

const router = express.Router();

// @route   GET /api/payment-preferences
// @desc    Get user payment preference
router.get('/', protect, async (req, res) => {
  try {
    const pref = await PaymentPreference.findOne({ user_id: req.user._id }).lean();
    if (!pref) {
      return res.json({ preferred_method: 'COD', upi_id: '' });
    }
    res.json({
      preferred_method: pref.preferred_method,
      upi_id: pref.upi_id || ''
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payment preferences', error: error.message });
  }
});

// @route   PUT /api/payment-preferences
// @desc    Update user payment preference
router.put('/', protect, async (req, res) => {
  try {
    const { preferred_method, upi_id } = req.body;

    if (!preferred_method || !['COD', 'UPI'].includes(preferred_method)) {
      return res.status(400).json({ message: "preferred_method must be either 'COD' or 'UPI'" });
    }

    let sanitizedUpi = '';
    if (preferred_method === 'UPI') {
      sanitizedUpi = String(upi_id || '').trim();
      if (!sanitizedUpi || !sanitizedUpi.includes('@') || sanitizedUpi.length > 64) {
        return res.status(400).json({ message: 'Please provide a valid UPI ID (e.g., name@bank)' });
      }
    }

    const updated = await PaymentPreference.findOneAndUpdate(
      { user_id: req.user._id },
      {
        $set: {
          preferred_method,
          upi_id: sanitizedUpi,
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      preferred_method: updated.preferred_method,
      upi_id: updated.upi_id
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save payment preferences', error: error.message });
  }
});

export default router;

