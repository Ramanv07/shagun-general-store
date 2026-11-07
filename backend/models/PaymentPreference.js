import mongoose from 'mongoose';

const paymentPreferenceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  preferred_method: {
    type: String,
    enum: ['COD', 'UPI'],
    default: 'COD',
    required: true
  },
  upi_id: {
    type: String,
    trim: true,
    maxlength: 64,
    default: ''
  }
}, {
  timestamps: true,
  autoIndex: false
});

export default mongoose.models.PaymentPreference || mongoose.model('PaymentPreference', paymentPreferenceSchema);

