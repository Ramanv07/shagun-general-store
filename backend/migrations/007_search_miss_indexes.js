import SearchMiss from '../models/SearchMiss.js';

export async function up() {
  console.log('Running migration: 007_search_miss_indexes...');
  const col = SearchMiss.collection;

  // 1. Unique index on query
  try {
    await col.createIndex(
      { query: 1 },
      { unique: true, name: 'search_miss_query_unique' }
    );
    console.log('Created unique index on SearchMiss (query)');
  } catch (err) {
    if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
      console.log('Index search_miss_query_unique already exists');
    } else {
      throw err;
    }
  }

  // 2. TTL index on lastSearchedAt (30 days = 2592000s)
  try {
    await col.createIndex(
      { lastSearchedAt: 1 },
      { expireAfterSeconds: 2592000, name: 'search_miss_ttl' }
    );
    console.log('Created TTL index on SearchMiss (lastSearchedAt, 30 days)');
  } catch (err) {
    if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
      console.log('Index search_miss_ttl already exists');
    } else {
      throw err;
    }
  }

  console.log('Migration 007_search_miss_indexes complete.');
}

export async function down() {
  console.log('Rolling back migration: 007_search_miss_indexes...');
  const col = SearchMiss.collection;
  try {
    await col.dropIndex('search_miss_query_unique');
    console.log('Dropped index search_miss_query_unique');
  } catch (err) {
    console.warn('Index search_miss_query_unique drop skipped:', err.message);
  }
  try {
    await col.dropIndex('search_miss_ttl');
    console.log('Dropped index search_miss_ttl');
  } catch (err) {
    console.warn('Index search_miss_ttl drop skipped:', err.message);
  }
}
