import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    legacyUserId: { type: String },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: { type: String, required: true },
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
    paymentStatus: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
    status: { 
        type: String, 
        enum: ['Processing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'], 
        default: 'Processing' 
    }
}, { timestamps: true });

// High-performance indexes for lightning-fast queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ legacyUserId: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

export default mongoose.model('Order', orderSchema);
