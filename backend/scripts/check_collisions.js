/**
 * Read-only duplicate collision check before creating unique indexes
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.STAGING_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun_staging';

async function checkCollisions() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    console.log(`Connected to database: "${mongoose.connection.name}"`);

    // 1. Reviews collision check
    const dupReviews = await db.collection('reviews').aggregate([
        { $group: { _id: { user_id: '$user_id', product_id: '$product_id' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } }
    ]).toArray();

    // 2. Wishlist collision check
    const dupWishlist = await db.collection('wishlist_items').aggregate([
        { $group: { _id: { user_id: '$user_id', product_id: '$product_id' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } }
    ]).toArray();

    // 3. Appointments collision check (active slots only)
    const dupAppointments = await db.collection('appointments').aggregate([
        { $match: { status: { $in: ['Pending', 'Confirmed', 'Completed'] } } },
        { $group: { _id: { serviceId: '$serviceId', date: '$date', slot: '$slot' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } }
    ]).toArray();

    // 4. User emails case-insensitive collision check
    const dupEmails = await db.collection('users').aggregate([
        { $group: { _id: { $toLower: '$email' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } }
    ]).toArray();

    console.log(`Collisions found:`);
    console.log(`- Reviews (user_id + product_id): ${dupReviews.length}`);
    console.log(`- Wishlist (user_id + product_id): ${dupWishlist.length}`);
    console.log(`- Appointments (serviceId + date + slot): ${dupAppointments.length}`);
    console.log(`- Users (case-insensitive email): ${dupEmails.length}`);

    await mongoose.disconnect();
    return { dupReviews, dupWishlist, dupAppointments, dupEmails };
}

checkCollisions().catch(err => {
    console.error('Error running collision check:', err);
    process.exit(1);
});
