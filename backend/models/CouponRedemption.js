import mongoose from 'mongoose';

const couponRedemptionSchema = new mongoose.Schema({
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: false, autoIndex: false });

couponRedemptionSchema.index({ order: 1 }, { unique: true });
couponRedemptionSchema.index({ coupon: 1, user: 1 });

export default mongoose.models.CouponRedemption || mongoose.model('CouponRedemption', couponRedemptionSchema);
