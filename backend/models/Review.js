import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 1000 },
  status: { type: String, enum: ['approved', 'hidden'], default: 'approved' },
  reports: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    details: { type: String, default: '', maxlength: 500 },
    created_at: { type: Date, default: Date.now },
  }],
  reportCount: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
}, { timestamps: false, autoIndex: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

reviewSchema.virtual('createdAt')
  .get(function() {
    return this.created_at;
  })
  .set(function(v) {
    this.created_at = v;
  });

export default mongoose.models.Review || mongoose.model('Review', reviewSchema, 'reviews');
