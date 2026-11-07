import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  created_at: { type: Date, default: Date.now },
}, { timestamps: true, autoIndex: false });

export default mongoose.models.WishlistItem || mongoose.model('WishlistItem', wishlistItemSchema, 'wishlist_items');

