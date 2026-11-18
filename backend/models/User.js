import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },
    houseNo: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pinCode: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: '' },
    phone: { type: String, default: '' },
    googleId: { type: String, default: '' },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isTester: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    otpHash: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    otpCooldownUntil: { type: Date, default: null },
    otpLockedUntil: { type: Date, default: null },
    addresses: [addressSchema],
    pushTokens: [{ type: String }],
    notifications: [{
        title: { type: String, required: true },
        body: { type: String, required: true },
        type: { type: String, default: 'order' }, // 'order' | 'promotion' | 'system'
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        data: { type: mongoose.Schema.Types.Mixed, default: {} }
    }]
}, { timestamps: true });

userSchema.index({ phone: 1 });

export default mongoose.model('User', userSchema);
