import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        maxlength: [80, 'Title cannot exceed 80 characters']
    },
    imageUrl: {
        type: String,
        required: [true, 'Banner image URL is required'],
        validate: {
            validator: function(v) {
                // Cloudinary HTTPS URL or relative /assets path for bundled defaults
                return typeof v === 'string' && (
                    v.startsWith('https://res.cloudinary.com/') ||
                    v.startsWith('https://cloudinary.com/') ||
                    v.startsWith('/images/promo-')
                );
            },
            message: 'Image must be a secure Cloudinary URL (https://res.cloudinary.com/...) or authorized promo asset'
        }
    },
    placement: {
        type: [{
            type: String,
            enum: ['app_home', 'web_home', 'offers']
        }],
        default: ['app_home', 'web_home'],
        validate: {
            validator: function(v) {
                return Array.isArray(v) && v.length > 0;
            },
            message: 'At least one placement target (app_home, web_home, offers) is required'
        }
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    active: {
        type: Boolean,
        default: true
    },
    startAt: {
        type: Date,
        default: null
    },
    endAt: {
        type: Date,
        default: null
    },
    target: {
        type: {
            type: String,
            enum: ['none', 'category', 'product', 'brand', 'offers'],
            default: 'none'
        },
        value: {
            type: String,
            default: '',
            trim: true
        }
    }
}, { timestamps: true, autoIndex: false });

bannerSchema.index({ placement: 1, active: 1, sortOrder: 1 });

export default mongoose.models.Banner || mongoose.model('Banner', bannerSchema);

