import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import StoreSetting from '../models/StoreSetting.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.STAGING_MONGODB_URI || process.env.MONGODB_URI;
if (!uri) {
    console.error('ERROR: MONGODB_URI or STAGING_MONGODB_URI is not set in backend/.env');
    process.exit(1);
}

if (uri.includes('mongodb.net') && process.env.APPROVE_LIVE_UPI_SETUP !== 'true') {
    console.error('FATAL SAFETY TRIGGER: setup_upi_settings points to Atlas (mongodb.net). Set APPROVE_LIVE_UPI_SETUP=true to confirm running on live.');
    process.exit(1);
}

// Arguments or environment variables - STRICTLY NO DEFAULTS
const args = process.argv.slice(2);
const hasConfirmFlag = args.includes('--confirm');

// Filter out flags to get positional arguments
const positionalArgs = args.filter(a => !a.startsWith('--'));

const upiVpa = (process.env.STORE_UPI_VPA || positionalArgs[0] || '').trim();
const upiName = (process.env.STORE_UPI_NAME || positionalArgs[1] || '').trim();
const timeoutMinutes = parseInt(process.env.STORE_UPI_TIMEOUT || positionalArgs[2] || '30', 10);

if (!upiVpa || !upiName) {
    console.error('ERROR: Both UPI ID (VPA) and Payee Display Name are required.');
    console.error('Usage: node backend/scripts/setup_upi_settings.js <UPI_VPA> "<PAYEE_NAME>" [TIMEOUT_MINUTES] --confirm');
    console.error('Or set env vars: STORE_UPI_VPA="your@vpa" STORE_UPI_NAME="Store Name" node backend/scripts/setup_upi_settings.js --confirm');
    process.exit(1);
}

console.log('Pending UPI Configuration to be saved:');
console.log('--------------------------------------');
console.log(`UPI VPA:         ${upiVpa}`);
console.log(`Payee Name:      ${upiName}`);
console.log(`Timeout:         ${timeoutMinutes} minutes`);
console.log('--------------------------------------');

if (!hasConfirmFlag) {
    console.log('\nDRY-RUN: Refusing to apply changes without --confirm flag.');
    console.log('To persist this configuration to MongoDB StoreSetting, re-run with --confirm flag:');
    console.log(`node backend/scripts/setup_upi_settings.js "${upiVpa}" "${upiName}" ${timeoutMinutes} --confirm`);
    process.exit(0);
}

async function setupUpi() {
    try {
        console.log(`Connecting to database to save UPI settings...`);
        await mongoose.connect(uri);

        const configPayload = {
            upi_vpa: upiVpa,
            upi_name: upiName,
            timeout_minutes: timeoutMinutes
        };

        const result = await StoreSetting.findOneAndUpdate(
            { key: 'upi_config' },
            { $set: { value: configPayload } },
            { upsert: true, new: true }
        );

        console.log('SUCCESS: StoreSetting "upi_config" saved successfully.');
        console.log('Active Configuration:', {
            upi_vpa: result.value.upi_vpa,
            upi_name: result.value.upi_name,
            timeout_minutes: result.value.timeout_minutes
        });
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Failed to configure UPI settings:', err);
        process.exit(1);
    }
}

setupUpi();
