import express from 'express';
import StoreSetting from '../models/StoreSetting.js';

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

export default router;

