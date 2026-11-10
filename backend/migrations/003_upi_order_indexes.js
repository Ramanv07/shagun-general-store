import mongoose from 'mongoose';

export async function up() {
    console.log('Running migration: 003_upi_order_indexes...');
    const db = mongoose.connection.db;
    const ordersCol = db.collection('orders');

    // 1. Unique sparse index on upiTxnRef
    const txnIndexes = await ordersCol.indexes();
    const hasTxnIndex = txnIndexes.some(idx => idx.name === 'order_upiTxnRef_unique');
    if (!hasTxnIndex) {
        await ordersCol.createIndex(
            { upiTxnRef: 1 },
            { 
                name: 'order_upiTxnRef_unique', 
                unique: true,
                partialFilterExpression: { upiTxnRef: { $type: 'string' } }
            }
        );
        console.log('Created unique sparse index on Order (upiTxnRef)');
    }

    // 2. Unique sparse index on upiUtr
    const utrIndexes = await ordersCol.indexes();
    const hasUtrIndex = utrIndexes.some(idx => idx.name === 'order_upiUtr_unique');
    if (!hasUtrIndex) {
        await ordersCol.createIndex(
            { upiUtr: 1 },
            { 
                name: 'order_upiUtr_unique', 
                unique: true,
                partialFilterExpression: { upiUtr: { $type: 'string' } }
            }
        );
        console.log('Created unique sparse index on Order (upiUtr)');
    }

    console.log('Migration 003_upi_order_indexes complete.');
}

export async function down() {
    console.log('Reverting migration: 003_upi_order_indexes...');
    const db = mongoose.connection.db;
    const ordersCol = db.collection('orders');

    await ordersCol.dropIndex('order_upiTxnRef_unique').catch(() => {});
    await ordersCol.dropIndex('order_upiUtr_unique').catch(() => {});
    console.log('Reverted 003_upi_order_indexes.');
}

// Allow standalone execution: node backend/migrations/003_upi_order_indexes.js
if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/')) {
    const uri = process.env.STAGING_MONGODB_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('Error: MONGODB_URI or STAGING_MONGODB_URI must be set.');
        process.exit(1);
    }
    if (uri.includes('mongodb.net') && process.env.APPROVE_LIVE_MIGRATION !== 'true') {
        console.error('FATAL SAFETY TRIGGER: Target is Atlas (mongodb.net). Set APPROVE_LIVE_MIGRATION=true to proceed.');
        process.exit(1);
    }
    await mongoose.connect(uri);
    await up();
    await mongoose.disconnect();
}

