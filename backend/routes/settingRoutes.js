import express from 'express';
import StoreSetting from '../models/StoreSetting.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { logAuditEvent } from '../services/auditService.js';

const router = express.Router();

// @route   GET /api/settings/delivery-strip
// @desc    Get public delivery ETA config
router.get('/delivery-strip', async (req, res) => {
  try {
    const config = await StoreSetting.findOne({ key: 'delivery_config' }).lean();
    if (!config) {
      return res.json({
        enabled: false,
        eta_min: null,
        eta_max: null,
      });
    }

    res.json({
      enabled: Boolean(config.delivery_strip_enabled),
      eta_min: typeof config.delivery_eta_min === 'number' ? config.delivery_eta_min : null,
      eta_max: typeof config.delivery_eta_max === 'number' ? config.delivery_eta_max : null,
    });
  } catch (err) {
    console.error('Error fetching delivery strip settings:', err);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

// @route   GET /api/settings/delivery
// @desc    Get delivery fee and free delivery threshold (public, defaults to 399/30, no writes on read)
router.get('/delivery', async (req, res) => {
  try {
    const config = await StoreSetting.findOne({ key: 'delivery_config' }).lean();
    const thresholdSetting = await StoreSetting.findOne({ key: 'freeDeliveryThreshold' }).lean();
    const feeSetting = await StoreSetting.findOne({ key: 'deliveryFee' }).lean();

    let freeDeliveryThreshold = 399;
    let deliveryFee = 30;

    if (config) {
      if (typeof config.freeDeliveryThreshold === 'number') freeDeliveryThreshold = config.freeDeliveryThreshold;
      if (typeof config.deliveryFee === 'number') deliveryFee = config.deliveryFee;
    }
    if (thresholdSetting && typeof thresholdSetting.value === 'number') {
      freeDeliveryThreshold = thresholdSetting.value;
    }
    if (feeSetting && typeof feeSetting.value === 'number') {
      deliveryFee = feeSetting.value;
    }

    res.json({
      freeDeliveryThreshold,
      deliveryFee
    });
  } catch (err) {
    console.error('Error fetching delivery settings:', err);
    res.status(500).json({ message: 'Failed to fetch delivery settings' });
  }
});

// @route   PUT /api/settings/delivery
// @desc    Update delivery settings (admin only, validates number >= 0)
router.put('/delivery', protect, adminOnly, async (req, res) => {
  try {
    const { freeDeliveryThreshold, deliveryFee } = req.body;

    if (typeof freeDeliveryThreshold !== 'number' || freeDeliveryThreshold < 0) {
      return res.status(400).json({ message: 'freeDeliveryThreshold must be a non-negative number' });
    }
    if (typeof deliveryFee !== 'number' || deliveryFee < 0) {
      return res.status(400).json({ message: 'deliveryFee must be a non-negative number' });
    }

    const updated = await StoreSetting.findOneAndUpdate(
      { key: 'delivery_config' },
      {
        $set: {
          freeDeliveryThreshold,
          deliveryFee
        }
      },
      { upsert: true, new: true }
    );

    await logAuditEvent(req.user._id, 'SETTINGS_UPDATE', 'StoreSetting', 'delivery_config', { freeDeliveryThreshold, deliveryFee });

    res.json({
      freeDeliveryThreshold: updated.freeDeliveryThreshold,
      deliveryFee: updated.deliveryFee
    });
  } catch (err) {
    console.error('Error updating delivery settings:', err);
    res.status(500).json({ message: 'Failed to update delivery settings' });
  }
});

export default router;
