import express from 'express';
import CategorySection from '../models/CategorySection.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Helper to get default initial sections with Cloudinary URLs & local fallbacks
const getDefaultSections = () => {
    let cloudUrls = {};
    try {
        const urlFile = path.resolve(__dirname, '../category_cloudinary_urls.json');
        if (fs.existsSync(urlFile)) {
            cloudUrls = JSON.parse(fs.readFileSync(urlFile, 'utf8'));
        }
    } catch (e) {
        console.error('Could not read category_cloudinary_urls.json', e);
    }

    const getImg = (slug, fallback) => {
        return cloudUrls[slug] || fallback || `/images/quick-categories/${slug}.jpg`;
    };

    return [
        {
            sectionTitle: 'Beauty & personal care',
            sectionSubtitle: 'Daily essentials for personal hygiene & glow',
            order: 1,
            items: [
                {
                    name: 'Bath & body',
                    slug: 'bath-body',
                    image: getImg('bath-body', '/images/quick-categories/bath-body.jpg'),
                    localImage: '/images/quick-categories/bath-body.jpg',
                    link: '/shop?search=body',
                    bgColor: '#FDF0F3',
                    order: 1
                },
                {
                    name: 'Baby care',
                    slug: 'baby-care',
                    image: getImg('baby-care', '/images/quick-categories/baby-care.jpg'),
                    localImage: '/images/quick-categories/baby-care.jpg',
                    link: '/shop?search=baby',
                    bgColor: '#FDF0F3',
                    order: 2
                },
                {
                    name: 'Hair care',
                    slug: 'hair-care',
                    image: getImg('hair-care', '/images/quick-categories/hair-care.jpg'),
                    localImage: '/images/quick-categories/hair-care.jpg',
                    link: '/shop?search=hair',
                    bgColor: '#FDF0F3',
                    order: 3
                },
                {
                    name: 'Beauty',
                    slug: 'beauty',
                    image: getImg('beauty', '/images/quick-categories/beauty.jpg'),
                    localImage: '/images/quick-categories/beauty.jpg',
                    link: '/shop?cat=Makeup',
                    bgColor: '#FDF0F3',
                    order: 4
                },
                {
                    name: 'Fragrances',
                    slug: 'fragrances',
                    image: getImg('fragrances', '/images/quick-categories/fragrances.jpg'),
                    localImage: '/images/quick-categories/fragrances.jpg',
                    link: '/shop?search=perfume',
                    bgColor: '#FDF0F3',
                    order: 5
                },
                {
                    name: 'Grooming & hygiene',
                    slug: 'grooming-hygiene',
                    image: getImg('grooming-hygiene', '/images/quick-categories/grooming-hygiene.jpg'),
                    localImage: '/images/quick-categories/grooming-hygiene.jpg',
                    link: '/shop?search=hygiene',
                    bgColor: '#FDF0F3',
                    order: 6
                }
            ]
        },
        {
            sectionTitle: 'Household & lifestyle',
            sectionSubtitle: 'Essentials for a clean & organized home',
            order: 2,
            items: [
                {
                    name: 'Cleaning essentials',
                    slug: 'cleaning-essentials',
                    image: getImg('cleaning-essentials', '/images/quick-categories/cleaning-essentials.jpg'),
                    localImage: '/images/quick-categories/cleaning-essentials.jpg',
                    link: '/shop?search=clean',
                    bgColor: '#FDF0F3',
                    order: 1
                },
                {
                    name: 'Home & furnishing',
                    slug: 'home-furnishing',
                    image: getImg('home-furnishing', '/images/quick-categories/home-furnishing.jpg'),
                    localImage: '/images/quick-categories/home-furnishing.jpg',
                    link: '/shop?search=home',
                    bgColor: '#FDF0F3',
                    order: 2
                },
                {
                    name: 'Kitchen needs',
                    slug: 'kitchen-needs',
                    image: getImg('kitchen-needs', '/images/quick-categories/kitchen-needs.jpg'),
                    localImage: '/images/quick-categories/kitchen-needs.jpg',
                    link: '/shop?search=kitchen',
                    bgColor: '#FDF0F3',
                    order: 3
                },
                {
                    name: 'Stationery supplies',
                    slug: 'stationery-supplies',
                    image: getImg('stationery-supplies', '/images/quick-categories/stationery-supplies.jpg'),
                    localImage: '/images/quick-categories/stationery-supplies.jpg',
                    link: '/shop?search=stationery',
                    bgColor: '#FDF0F3',
                    order: 4
                },
                {
                    name: 'Toys & games',
                    slug: 'toys-games',
                    image: getImg('toys-games', '/images/quick-categories/toys-games.jpg'),
                    localImage: '/images/quick-categories/toys-games.jpg',
                    link: '/shop?cat=Toy',
                    bgColor: '#FDF0F3',
                    order: 5
                }
            ]
        }
    ];
};

// @route   GET /api/categories/sections
// @desc    Get all category sections and items from MongoDB Atlas (auto-seeds if empty)
// @access  Public
router.get('/sections', async (req, res) => {
    try {
        let sections = await CategorySection.find().sort({ order: 1 });
        if (!sections || sections.length === 0) {
            console.log('CategorySection collection empty — auto-seeding defaults with Cloudinary URLs...');
            const defaultData = getDefaultSections();
            sections = await CategorySection.insertMany(defaultData);
        }
        res.json(sections);
    } catch (error) {
        console.error('Error fetching category sections:', error);
        // Fallback to static in-memory data so client never crashes
        res.json(getDefaultSections());
    }
});

// @route   POST /api/categories/sync
// @desc    Force re-sync default category sections & Cloudinary logos into MongoDB
// @access  Public / Admin
router.post('/sync', async (req, res) => {
    try {
        const defaultData = getDefaultSections();
        await CategorySection.deleteMany({});
        const created = await CategorySection.insertMany(defaultData);
        res.json({ message: 'Category sections synchronized successfully!', count: created.length, sections: created });
    } catch (error) {
        console.error('Sync failed:', error);
        res.status(500).json({ message: 'Failed to sync categories with database' });
    }
});

// @route   PUT /api/categories/sections/:id
// @desc    Update a specific category section or item (e.g., logo, title)
// @access  Private/Admin
router.put('/sections/:id', protect, adminOnly, async (req, res) => {
    try {
        const updated = await CategorySection.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: 'Section not found' });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error updating section' });
    }
});

export default router;
