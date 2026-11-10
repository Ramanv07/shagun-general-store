/**
 * seed_banners.js
 * Imports initial default banners into MongoDB without altering product collections.
 * Run safely on staging/production: node backend/scripts/seed_banners.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Banner from '../models/Banner.js';

dotenv.config();

const mongoUri = process.env.STAGING_MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';

if (mongoUri.includes('mongodb.net') || mongoUri.includes('atlas')) {
    console.error('FATAL SAFETY TRIGGER: seed_banners points to Atlas/mongodb.net. Aborting immediately.');
    process.exit(1);
}

const INITIAL_BANNERS = [
    {
        title: 'Beauty & Makeup Collection',
        imageUrl: '/images/promo-essentials.jpg',
        placement: ['app_home', 'web_home'],
        sortOrder: 0,
        active: true,
        target: { type: 'category', value: 'Beauty' }
    },
    {
        title: 'Daily Care Essentials for Your Home',
        imageUrl: '/images/promo-essentials.jpg',
        placement: ['app_home', 'web_home'],
        sortOrder: 1,
        active: true,
        target: { type: 'category', value: 'Daily Needs' }
    },
    {
        title: 'Rent Your Bridal Look Today',
        imageUrl: '/images/promo-lehenga.jpg',
        placement: ['app_home', 'web_home', 'offers'],
        sortOrder: 2,
        active: true,
        target: { type: 'category', value: 'Bridal' }
    },
    {
        title: 'Beauty Parlour Appointments Available',
        imageUrl: '/images/promo-parlour.jpg',
        placement: ['app_home', 'web_home'],
        sortOrder: 3,
        active: true,
        target: { type: 'offers', value: '' }
    }
];

async function seedBanners() {
    console.log('Connecting to database:', mongoUri.replace(/\/\/.*@/, '//<credentials>@'));
    await mongoose.connect(mongoUri);

    const existingCount = await Banner.countDocuments();
    if (existingCount > 0) {
        console.log(`Database already has ${existingCount} banner(s). Seed aborted to avoid overwriting.`);
        await mongoose.disconnect();
        return;
    }

    console.log('Seeding default banners...');
    for (const b of INITIAL_BANNERS) {
        await Banner.create(b);
        console.log(`✓ Seeded banner: "${b.title}"`);
    }

    console.log('All initial banners seeded successfully.');
    await mongoose.disconnect();
}

seedBanners().catch(err => {
    console.error('Seed banners error:', err);
    process.exit(1);
});

