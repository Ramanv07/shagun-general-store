import mongoose from 'mongoose';

const otpSessionSchema = new mongoose.Schema({
    identifier: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    hashedOtp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    lastSentAt: {
        type: Date,
        default: Date.now
    },
    lockedUntil: {
        type: Date,
        default: null
    }
}, { timestamps: true, autoIndex: false });

export default mongoose.models.OtpSession || mongoose.model('OtpSession', otpSessionSchema);
