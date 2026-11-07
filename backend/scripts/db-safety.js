import mongoose from 'mongoose';

export async function getStagingConnection() {
  const uri = process.env.STAGING_MONGODB_URI;
  if (!uri) {
    throw new Error('FATAL: STAGING_MONGODB_URI environment variable is missing.');
  }
  if (uri.includes('mongodb.net') || uri.includes('atlas')) {
    throw new Error('FATAL SAFETY TRIGGER: STAGING_MONGODB_URI points to Atlas or remote mongodb.net. Aborting immediately.');
  }
  const conn = await mongoose.createConnection(uri).asPromise();
  return conn;
}

