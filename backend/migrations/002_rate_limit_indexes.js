import mongoose from 'mongoose';
import RateLimitRecord from '../models/RateLimitRecord.js';

export async function up() {
    console.log('Running migration: 002_rate_limit_indexes...');
    const col = RateLimitRecord.collection;

    // 1. Unique index on rate limit key
    try {
        await col.createIndex(
            { key: 1 },
            { unique: true, name: 'rate_limit_key_unique' }
        );
        console.log('Created unique index on RateLimitRecord (key)');
    } catch (err) {
        if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
            console.log('Index rate_limit_key_unique already exists');
        } else {
            throw err;
        }
    }

    // 2. TTL index on resetAt (auto-purge when resetAt is reached)
    try {
        await col.createIndex(
            { resetAt: 1 },
            { expireAfterSeconds: 0, name: 'rate_limit_resetAt_ttl' }
        );
        console.log('Created TTL index on RateLimitRecord (resetAt)');
    } catch (err) {
        if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
            console.log('Index rate_limit_resetAt_ttl already exists');
        } else {
            throw err;
        }
    }

    console.log('Migration 002_rate_limit_indexes complete.');
}

export async function down() {
    console.log('Rolling back migration: 002_rate_limit_indexes...');
    const col = RateLimitRecord.collection;
    try {
        await col.dropIndex('rate_limit_key_unique');
        console.log('Dropped index rate_limit_key_unique');
    } catch (err) {
        console.warn('Index rate_limit_key_unique drop skipped:', err.message);
    }
    try {
        await col.dropIndex('rate_limit_resetAt_ttl');
        console.log('Dropped index rate_limit_resetAt_ttl');
    } catch (err) {
        console.warn('Index rate_limit_resetAt_ttl drop skipped:', err.message);
    }
}

