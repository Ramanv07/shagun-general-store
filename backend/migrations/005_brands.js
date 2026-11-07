import { getStagingConnection } from '../scripts/db-safety.js';
import mongoose from 'mongoose';

const BRANDS_SEED = [
  { name: 'Vaseline', slug: 'vaseline', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/vaseline_logo.png' },
  { name: "POND'S", slug: 'ponds', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/ponds_logo.png' },
  { name: 'Dove', slug: 'dove', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/dove_logo.png' },
  { name: 'Mamaearth', slug: 'mamaearth', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/mamaearth_logo.png' },
  { name: 'Nivea', slug: 'nivea', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/nivea_logo.png' },
  { name: 'Lakme', slug: 'lakme', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/lakme_logo.png' },
  { name: 'Dot & Key', slug: 'dot-and-key', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/dotkey_logo.png' },
  { name: 'Denver', slug: 'denver', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/denver_logo.png' },
  { name: 'Himalaya', slug: 'himalaya', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/himalaya_logo.png' },
  { name: 'Dabur', slug: 'dabur', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/dabur_logo.png' },
  { name: 'Nihar', slug: 'nihar', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/nihar_logo.png' },
  { name: 'Selzer', slug: 'selzer', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/selzer_logo.png' },
  { name: 'ME-ON', slug: 'me-on', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/meon_logo.png' },
  { name: 'Whitetone', slug: 'whitetone', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/whitetone_logo.png' },
  { name: 'Florozone', slug: 'florozone', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/florozone_logo.png' },
  { name: 'Nature', slug: 'nature', logo: 'https://res.cloudinary.com/yg0l2ra0/image/upload/v1791543878/shagun_general_store/nature_logo.png' },
];

const PRODUCT_BRAND_MAPPING = [
  { id: '6ae6f55ec437d6dcb0cb23b4', slug: 'vaseline' },
  { id: '6ae6f909c437d6dcb0cb23fb', slug: 'vaseline' },
  { id: '6ae6f30191bb2cce9821eb23', slug: 'ponds' },
  { id: '6ac785118270d169d989fa09', slug: 'mamaearth' },
  { id: '6ae6e2b75cf5012a11b76bb0', slug: 'mamaearth' },
  { id: '6ae6e4617b6c5d373d68bf59', slug: 'mamaearth' },
  { id: '6ae6e5ce4e4582c320461b36', slug: 'mamaearth' },
  { id: '6ae6e6d2d5cf35f6b3b2d86d', slug: 'mamaearth' },
  { id: '6ae6ea868832871302f02be6', slug: 'mamaearth' },
  { id: '6ac640cf5040d5f4627af3a6', slug: 'nivea' },
  { id: '6ae7107ce14ea5c72ea6ff95', slug: 'nivea' },
  { id: '6ae7116ecb3c55732a3255c8', slug: 'nivea' },
  { id: '6ae711e3f14c15be889ecf65', slug: 'nivea' },
  { id: '6ac766a36c5c3a1e9bfe41f7', slug: 'lakme' },
  { id: '6ac768dade8152d001fa0027', slug: 'lakme' },
  { id: '6ae6e12d818507721f6ed954', slug: 'himalaya' },
  { id: '6ae6f1061bf8d23d711cd71b', slug: 'dot-and-key' },
  { id: '6ac73893deeafff66199fcb9', slug: 'denver' },
  { id: '6ac73aec60d54d4039699d8a', slug: 'denver' },
  { id: '6ac629e89d99d7486297bce1', slug: 'dabur' },
  { id: '6ac7358d73fa6d7dcc63c721', slug: 'nihar' },
  { id: '6ac6201521b7fb8a30761e21', slug: 'selzer' },
  { id: '6ac7cc75596a68d03f407641', slug: 'me-on' },
  { id: '6ac7cef18527420a28bd8b63', slug: 'whitetone' },
  { id: '6ac7cf6027507e0e6a4a1225', slug: 'whitetone' },
  { id: '6ae6f20cc437d6dcb0cb2344', slug: 'florozone' },
  { id: '6ae6faecbef7e8a4180d694a', slug: 'nature' }
];

export async function up() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[MIGRATION 005 UP] Running brands migration...');

  const brandsColl = db.collection('brands');
  await brandsColl.createIndex({ slug: 1 }, { unique: true });
  await brandsColl.createIndex({ isActive: 1 });

  for (const b of BRANDS_SEED) {
    await brandsColl.updateOne(
      { slug: b.slug },
      { $setOnInsert: { ...b, isActive: true, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    );
  }

  const productsColl = db.collection('products');
  await productsColl.createIndex({ brand_id: 1 });

  // Map products to brand_id
  for (const map of PRODUCT_BRAND_MAPPING) {
    const brand = await brandsColl.findOne({ slug: map.slug });
    if (brand && mongoose.Types.ObjectId.isValid(map.id)) {
      await productsColl.updateOne(
        { _id: new mongoose.Types.ObjectId(map.id) },
        { $set: { brand_id: brand._id } }
      );
    }
  }

  console.log('[MIGRATION 005 UP] Completed.');
  await conn.close();
}

export async function down() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[MIGRATION 005 DOWN] Reverting brands migration...');

  const productsColl = db.collection('products');
  await productsColl.updateMany({}, { $unset: { brand_id: '' } });
  await productsColl.dropIndex('brand_id_1').catch(() => {});

  await db.collection('brands').drop().catch(() => {});

  console.log('[MIGRATION 005 DOWN] Completed.');
  await conn.close();
}

if (process.argv[2] === 'down') {
  down().catch(console.error);
} else {
  up().catch(console.error);
}

