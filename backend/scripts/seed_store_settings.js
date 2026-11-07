import mongoose from 'mongoose';
import StoreSetting from '../models/StoreSetting.js';

export async function seedStoreSettings(uri) {
  const dbUri = uri || process.env.STAGING_MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';
  if (dbUri.includes('mongodb.net') || dbUri.includes('atlas')) {
    throw new Error('FATAL SAFETY TRIGGER: seedStoreSettings cannot be run on Atlas without explicit approval.');
  }

  const conn = await mongoose.connect(dbUri);
  console.log('Seeding default store settings to:', dbUri);

  await StoreSetting.findOneAndUpdate(
    { key: 'delivery_config' },
    {
      $setOnInsert: {
        key: 'delivery_config',
        freeDeliveryThreshold: 399,
        deliveryFee: 30,
        delivery_eta_min: 10,
        delivery_eta_max: 20,
        delivery_strip_enabled: true
      }
    },
    { upsert: true, new: true }
  );

  console.log('Store settings successfully seeded: freeDeliveryThreshold=399, deliveryFee=30');
  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith('seed_store_settings.js')) {
  seedStoreSettings()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

