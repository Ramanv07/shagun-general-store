import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import StoreSetting from '../models/StoreSetting.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let uri = process.env.STAGING_MONGODB_URI;
if (!uri) {
    if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('mongodb.net')) {
        uri = process.env.MONGODB_URI;
    } else {
        uri = 'mongodb://127.0.0.1:27017/shagun-staging';
    }
}

if (uri.includes('mongodb.net') && process.env.APPROVE_LIVE_UPI_SETUP !== 'true') {
    console.error('FATAL SAFETY TRIGGER: setup_upi_settings points to Atlas (mongodb.net). Set APPROVE_LIVE_UPI_SETUP=true to confirm running on live.');
    process.exit(1);
}

// Arguments or environment variables - STRICTLY NO HARDCODED SECRET DEFAULTS
const args = process.argv.slice(2);
const hasConfirmFlag = args.includes('--confirm');

// Filter out flags to get positional arguments
const positionalArgs = args.filter(a => !a.startsWith('--'));

let upiVpa = (process.env.STORE_UPI_VPA || '').trim();
let upiName = (process.env.STORE_UPI_NAME || '').trim();
let timeoutMinutes = parseInt(process.env.STORE_UPI_TIMEOUT || '30', 10);

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--vpa' && args[i + 1] && !args[i + 1].startsWith('--')) {
        upiVpa = args[i + 1].trim();
        i++;
    } else if (args[i] === '--name' && args[i + 1] && !args[i + 1].startsWith('--')) {
        upiName = args[i + 1].trim();
        i++;
    } else if (args[i] === '--timeout' && args[i + 1] && !args[i + 1].startsWith('--')) {
        timeoutMinutes = parseInt(args[i + 1], 10);
        i++;
    }
}

if (!upiVpa && positionalArgs[0]) upiVpa = positionalArgs[0].trim();
if (!upiName && positionalArgs[1]) upiName = positionalArgs[1].trim();
if (positionalArgs[2]) timeoutMinutes = parseInt(positionalArgs[2], 10) || timeoutMinutes;

if (!upiVpa || !upiName) {
    console.error('ERROR: Both UPI ID (VPA) and Payee Display Name are required.');
    console.error('Usage: node backend/scripts/setup_upi_settings.js --vpa <UPI_VPA> --name "<PAYEE_NAME>" [--timeout <MINUTES>] --confirm');
    console.error('   or: node backend/scripts/setup_upi_settings.js <UPI_VPA> "<PAYEE_NAME>" [TIMEOUT_MINUTES] --confirm');
    console.error('   or: $env:STORE_UPI_VPA="your@vpa"; $env:STORE_UPI_NAME="Store Name"; node backend/scripts/setup_upi_settings.js --confirm');
    process.exit(1);
}

console.log('Pending UPI Configuration to be saved:');
console.log('--------------------------------------');
console.log(`Target Database: ${uri.replace(/:\/\/[^@]+@/, '://***:***@')}`);
console.log(`UPI VPA:         ${upiVpa}`);
console.log(`Payee Name:      ${upiName}`);
console.log(`Timeout:         ${timeoutMinutes} minutes`);
console.log('--------------------------------------');

if (!hasConfirmFlag) {
    console.log('\nDRY-RUN: Refusing to apply changes without --confirm flag.');
    console.log('To persist this configuration to MongoDB StoreSetting, re-run with --confirm flag:');
    console.log(`node backend/scripts/setup_upi_settings.js --vpa "${upiVpa}" --name "${upiName}" --timeout ${timeoutMinutes} --confirm`);
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
            upi_vpa: result.value.upi_vpa ? '<set>' : '<missing>',
            upi_name: result.value.upi_name ? '<set>' : '<missing>',
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
