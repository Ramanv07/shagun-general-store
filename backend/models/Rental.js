import mongoose from 'mongoose';

const rentalSchema = new mongoose.Schema({
    lehenga: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    lehengaName: {
        type: String,
        required: true
    },
    lehengaImage: {
        type: String,
        default: ''
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true
    },
    customerEmail: {
        type: String,
        trim: true,
        default: ''
    },
    startDate: {
        type: Date,
        required: true
    },
    returnDate: {
        type: Date,
        required: true
    },
    actualReturnDate: {
        type: Date
    },
    rentalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    securityDeposit: {
        type: Number,
        default: 0,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['Booked', 'Active', 'Returned', 'Cancelled'],
        default: 'Booked'
    },
    notes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Index for quick querying of active bookings by lehenga and date
rentalSchema.index({ lehenga: 1, status: 1, startDate: 1, returnDate: 1 });

export default mongoose.model('Rental', rentalSchema);
