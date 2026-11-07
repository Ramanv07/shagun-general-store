import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: { type: String, default: 'system' },
  read: { type: Boolean, default: false },
  read_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { timestamps: true, autoIndex: false });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema, 'notifications');

