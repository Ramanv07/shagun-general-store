import mongoose from 'mongoose';

const CategoryItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true },
    image: { type: String, required: true },
    localImage: { type: String, default: '' },
    link: { type: String, required: true },
    bgColor: { type: String, default: '#FDF0F3' },
    badge: { type: String, default: '' },
    order: { type: Number, default: 0 },
});

const CategorySectionSchema = new mongoose.Schema({
    sectionTitle: { type: String, required: true, unique: true },
    sectionSubtitle: { type: String, default: '' },
    order: { type: Number, default: 0 },
    items: [CategoryItemSchema],
}, { timestamps: true });

export default mongoose.model('CategorySection', CategorySectionSchema);
