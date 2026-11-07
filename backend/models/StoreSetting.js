import mongoose from 'mongoose';

const storeSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  delivery_eta_min: { type: Number, default: 10 },
  delivery_eta_max: { type: Number, default: 20 },
  delivery_strip_enabled: { type: Boolean, default: true },
}, { timestamps: true, autoIndex: false });

export default mongoose.models.StoreSetting || mongoose.model('StoreSetting', storeSettingSchema, 'store_settings');

