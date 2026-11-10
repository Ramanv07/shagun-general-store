import mongoose from 'mongoose';

export async function up(options = {}) {
    const isDryRun = options.confirm !== true;
    console.log(`Running migration: 004_sync_delivered_cod_status (${isDryRun ? 'DRY-RUN' : 'LIVE RUN'})...`);
    const db = mongoose.connection.db;
    const ordersCol = db.collection('orders');

    // Find and update any delivered COD or legacy orders with Pending/pending paymentStatus
    const filter = {
        status: 'Delivered',
        paymentStatus: { $in: ['Pending', 'pending'] },
        paymentMethod: { $ne: 'UPI' }
    };

    const countBefore = await ordersCol.countDocuments(filter);
    console.log(`Found ${countBefore} delivered COD/legacy order(s) with pending payment status.`);

    if (countBefore > 0) {
        if (isDryRun) {
            console.log(`[DRY-RUN] Found ${countBefore} order(s) to update to paymentStatus: 'Completed'. Pass --confirm to apply changes.`);
            return { countBefore, modifiedCount: 0, isDryRun: true };
        }
        const result = await ordersCol.updateMany(filter, {
            $set: { paymentStatus: 'Completed' }
        });
        console.log(`Successfully updated ${result.modifiedCount} order(s) to paymentStatus: 'Completed'.`);
        return result;
    }

    console.log('Migration 004_sync_delivered_cod_status complete.');
    return { countBefore: 0, modifiedCount: 0 };
}

export async function down() {
    console.log('Down migration for 004 is a no-op as paymentStatus completion on delivery is permanent.');
}

// Allow standalone execution: node backend/migrations/004_sync_delivered_cod_status.js
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
    const hasConfirm = process.argv.includes('--confirm');
    await mongoose.connect(uri);
    await up({ confirm: hasConfirm });
    await mongoose.disconnect();
}
