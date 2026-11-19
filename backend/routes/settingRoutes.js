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

// @route   GET /api/settings/upi
// @desc    Get public store UPI settings (VPA, display name). Returns enabled: false if unconfigured.
router.get('/upi', async (_req, res) => {
  try {
    const config = await StoreSetting.findOne({ key: 'upi_config' }).lean();
    const upiData = config?.value || config || {};
    const hasUpi = Boolean(upiData.upi_vpa && upiData.upi_name);
    res.json({
      enabled: hasUpi,
      upi_vpa: hasUpi ? upiData.upi_vpa : null,
      upi_name: hasUpi ? upiData.upi_name : null,
      timeout_minutes: Number(upiData.timeout_minutes) || 30
    });
  } catch (err) {
    console.error('Error fetching UPI settings:', err);
    res.status(500).json({ message: 'Failed to fetch UPI settings' });
  }
});

// @route   PUT /api/settings/upi
// @desc    Admin: Update store UPI VPA, display name, and timeout
router.put('/upi', protect, adminOnly, async (req, res) => {
  try {
    const { upi_vpa, upi_name, timeout_minutes, merchant_code } = req.body;
    if (!upi_vpa || !upi_name) {
      return res.status(400).json({ message: 'upi_vpa and upi_name are required' });
    }

    const payload = {
      upi_vpa: String(upi_vpa).trim(),
      upi_name: String(upi_name).trim(),
      timeout_minutes: Number(timeout_minutes) || 10,
      merchant_code: merchant_code ? String(merchant_code).trim() : null
    };

    const updated = await StoreSetting.findOneAndUpdate(
      { key: 'upi_config' },
      { $set: { value: payload } },
      { upsert: true, new: true }
    );

    await logAuditEvent(req.user._id, 'SETTINGS_UPDATE', 'StoreSetting', 'upi_config', {
      timeout_minutes: payload.timeout_minutes
    });

    res.json({
      success: true,
      message: 'UPI settings updated successfully',
      settings: updated.value
    });
  } catch (err) {
    console.error('Error updating UPI settings:', err);
    res.status(500).json({ message: 'Failed to update UPI settings' });
  }
});

// @route   GET /api/settings/search-synonyms
// @desc    Admin: Get search synonyms dictionary
router.get('/search-synonyms', protect, adminOnly, async (req, res) => {
  try {
    const { getSynonymsMap } = await import('../utils/searchEngine.js');
    const synonyms = await getSynonymsMap();
    res.json(synonyms);
  } catch (err) {
    console.error('Error fetching search synonyms:', err);
    res.status(500).json({ message: 'Failed to fetch search synonyms' });
  }
});

// @route   PUT /api/settings/search-synonyms
// @desc    Admin: Update search synonyms dictionary
router.put('/search-synonyms', protect, adminOnly, async (req, res) => {
  try {
    const { synonyms } = req.body;
    if (!synonyms || typeof synonyms !== 'object' || Array.isArray(synonyms)) {
      return res.status(400).json({ message: 'Synonyms must be a key-value object' });
    }

    const cleanMap = {};
    for (const [key, list] of Object.entries(synonyms)) {
      if (typeof key === 'string' && key.trim()) {
        const k = key.trim().toLowerCase();
        const arr = Array.isArray(list) ? list.map(s => String(s).trim().toLowerCase()).filter(Boolean) : [];
        cleanMap[k] = arr;
      }
    }

    const updated = await StoreSetting.findOneAndUpdate(
      { key: 'search_synonyms' },
      { $set: { value: cleanMap } },
      { upsert: true, new: true }
    );

    const { invalidateSynonymsCache } = await import('../utils/searchEngine.js');
    invalidateSynonymsCache();

    await logAuditEvent(req.user._id, 'SETTINGS_UPDATE', 'StoreSetting', 'search_synonyms', {
      groupCount: Object.keys(cleanMap).length
    });

    res.json({
      success: true,
      message: 'Search synonyms updated successfully',
      synonyms: updated.value
    });
  } catch (err) {
    console.error('Error updating search synonyms:', err);
    res.status(500).json({ message: 'Failed to update search synonyms' });
  }
});

export default router;
