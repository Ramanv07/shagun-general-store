import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        uppercase: true,
        trim: true,
        minlength: [4, 'Code must be at least 4 characters'],
        maxlength: [20, 'Code cannot exceed 20 characters'],
        match: [/^[A-Z0-9]+$/, 'Coupon code must be alphanumeric (letters and numbers only)']
    },
    type: {
        type: String,
        enum: ['percent', 'flat'],
        required: [true, 'Coupon type (percent or flat) is required']
    },
    value: {
        type: Number,
        required: [true, 'Coupon value is required'],
        min: [0.01, 'Coupon value must be greater than 0']
    },
    maxDiscount: {
        type: Number,
        default: null
    },
    minOrderAmount: {
        type: Number,
        default: 0,
        min: [0, 'Minimum order amount cannot be negative']
    },
    startAt: {
        type: Date,
        default: null
    },
    endAt: {
        type: Date,
        default: null
    },
    usageLimitTotal: {
        type: Number,
        default: null
    },
    usageLimitPerUser: {
        type: Number,
        default: 1,
        min: [1, 'Per-user limit must be at least 1']
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    redeemedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    active: {
        type: Boolean,
        default: true
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    description: {
        type: String,
        trim: true,
        default: ''
    }
}, { timestamps: true, autoIndex: false });

couponSchema.index({ active: 1, isPublic: 1 });

export default mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
