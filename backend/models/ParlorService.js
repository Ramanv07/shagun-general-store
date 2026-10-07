import mongoose from 'mongoose';

const parlorServiceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        duration: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        desc: {
            type: String,
            required: true,
        },
        badge: {
            type: String,
            required: false,
        }
    },
    {
        timestamps: true,
    }
);

const ParlorService = mongoose.model('ParlorService', parlorServiceSchema);
export default ParlorService;
