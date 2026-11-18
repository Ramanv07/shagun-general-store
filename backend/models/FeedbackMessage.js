import mongoose from 'mongoose';

const feedbackMessageSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { 
    type: String, 
    enum: ['Bug', 'Feature Request', 'Product / Store Experience', 'Other'], 
    default: 'Other',
    required: true 
  },
  message: { type: String, required: true, maxlength: 1000 },
  appVersion: { type: String, default: '1.0.0' },
  deviceModel: { type: String, default: '' },
  platform: { type: String, enum: ['web', 'android', 'ios'], default: 'android' },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  adminNotes: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.FeedbackMessage || mongoose.model('FeedbackMessage', feedbackMessageSchema);
