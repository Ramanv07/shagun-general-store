
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        quantity: Number,
        price: Number
    }],
    totalAmount: { type: Number, required: true },
    shippingAddress: {
        fullName: String,
        mobile: String,
        houseNo: String,
        street: String,
        city: String,
        state: String,
        pinCode: String
    },
    status: { type: String, enum: ['Processing', 'Out for Delivery', 'Delivered'], default: 'Processing' }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
