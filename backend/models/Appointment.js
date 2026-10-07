import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        serviceId: {
            type: String,
            required: true,
        },
        serviceName: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        date: {
            type: String,
            required: true,
        },
        slot: {
            type: String,
            required: true,
        },
        customerName: {
            type: String,
            required: true,
        },
        customerPhone: {
            type: String,
            required: true,
        },
        notes: {
            type: String,
        },
        status: {
            type: String,
            enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
            default: 'Pending',
        },
    },
    {
        timestamps: true,
    }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
