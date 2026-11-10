import mongoose from 'mongoose';

const rateLimitRecordSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    hits: {
        type: Number,
        default: 1
    },
    resetAt: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false,
    autoIndex: false
});

export default mongoose.models.RateLimitRecord || mongoose.model('RateLimitRecord', rateLimitRecordSchema, 'rate_limit_records');

