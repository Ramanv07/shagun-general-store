import mongoose from 'mongoose';
import StoreSetting from '../models/StoreSetting.js';

const uri = process.env.STAGING_MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';

if (uri.includes('mongodb.net') || uri.includes('atlas')) {
    console.error('FATAL SAFETY TRIGGER: check_upi_settings refuses to connect to Atlas.');
    process.exit(1);
}

function maskString(str) {
    if (!str) return '<missing>';
    const trimmed = String(str).trim();
    if (trimmed.length <= 4) return '****';
    return trimmed.slice(0, 2) + '****' + trimmed.slice(-2);
}

async function checkUpiSettings() {
    try {
        await mongoose.connect(uri);
        const dbName = mongoose.connection.name;
        if (dbName !== 'shagun-staging') {
            await mongoose.disconnect();
            console.error(`FATAL SAFETY TRIGGER: Target database is "${dbName}", expected "shagun-staging".`);
            process.exit(1);
        }

        const setting = await StoreSetting.findOne({ key: 'upi_config' }).lean();
        const exists = Boolean(setting);
        const upiData = setting?.value || setting || {};
        const hasVpa = Boolean(upiData.upi_vpa);
        const hasName = Boolean(upiData.upi_name);
        const enabled = Boolean(hasVpa && hasName);
        const timeoutMinutes = Number(upiData.timeout_minutes) || 30;

        console.log('--- Shagun Staging UPI Configuration Check ---');
        console.log(`Database Name:     ${dbName}`);
        console.log(`upi_config Exists: ${exists}`);
        console.log(`UPI Enabled:       ${enabled}`);
        console.log(`Timeout:           ${timeoutMinutes} minutes`);
        console.log(`UPI ID (VPA):      ${hasVpa ? maskString(upiData.upi_vpa) : '<missing>'}`);
        console.log(`Payee Name:        ${hasName ? maskString(upiData.upi_name) : '<missing>'}`);
        console.log('----------------------------------------------');

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Error checking UPI settings:', err.message);
        process.exit(1);
    }
}

checkUpiSettings();
