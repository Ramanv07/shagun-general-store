import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    legacyUserId: { type: String },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: { type: String, required: true },
        image: { type: String },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    shippingAddress: {
        fullName: { type: String, required: true },
        mobile: { type: String, required: true },
        houseNo: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pinCode: { type: String, required: true }
    },
    paymentMethod: { type: String, enum: ['COD', 'Online', 'UPI'], default: 'COD' },
    paymentStatus: { 
        type: String, 
        enum: ['COD', 'pending', 'verifying', 'paid', 'failed', 'expired', 'late_payment', 'refund_needed', 'Pending', 'Completed', 'Failed'], 
        default: 'Pending' 
    },
    upiTxnRef: { type: String, trim: true },
    upiUtr: { type: String, trim: true },
    upiUtrAttempts: { type: Number, default: 0 },
    paymentExpiresAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    upiIntent: { type: mongoose.Schema.Types.Mixed, default: null },
    rejectionReason: { type: String, default: null },
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    status: { 
        type: String, 
        enum: ['Processing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'], 
        default: 'Processing' 
    }
}, { timestamps: true, autoIndex: false });

export default mongoose.models.Order || mongoose.model('Order', orderSchema);
