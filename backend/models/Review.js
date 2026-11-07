import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 1000 },
  status: { type: String, enum: ['approved', 'hidden'], default: 'approved' },
  created_at: { type: Date, default: Date.now },
}, { timestamps: true, autoIndex: false });

export default mongoose.models.Review || mongoose.model('Review', reviewSchema, 'reviews');

