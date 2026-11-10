/**
 * One-off real test email sender using Gmail App Password / SMTP
 *
 * Usage:
 *   node backend/scripts/test_send_email.js recipient@example.com
 *
 * Environment variables used:
 *   SMTP_USER=your_gmail@gmail.com
 *   SMTP_PASS=your_16_char_app_password
 *   SMTP_HOST=smtp.gmail.com (default)
 *   SMTP_PORT=465 (default)
 *   MAIL_FROM_NAME="Shagun Mart" (default)
 */

import dotenv from 'dotenv';
dotenv.config();

import { sendOtp } from '../services/otpService.js';

const targetEmail = process.argv[2] || process.env.TEST_EMAIL_RECIPIENT;

if (!targetEmail || !targetEmail.includes('@')) {
    console.error('\n❌ Error: Please provide a valid recipient email.');
    console.error('Usage: node backend/scripts/test_send_email.js recipient@example.com\n');
    process.exit(1);
}

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('\n❌ Error: SMTP_USER and SMTP_PASS environment variables are required.');
    console.error('Example:');
    console.error('  $env:SMTP_USER="myemail@gmail.com"');
    console.error('  $env:SMTP_PASS="xxxx xxxx xxxx xxxx"');
    console.error('  node backend/scripts/test_send_email.js recipient@example.com\n');
    process.exit(1);
}

async function run() {
    console.log(`\n📧 Dispatching 1 real test reset email to recipient...`);
    // Mask target address for security
    const parts = targetEmail.split('@');
    const masked = `${parts[0].slice(0, 2)}***@${parts[1]}`;
    console.log(`Target: ${masked}`);

    // Generate a 6-digit random code
    const testCode = String(Math.floor(100000 + Math.random() * 900000));

    const result = await sendOtp({
        channel: 'email',
        to: targetEmail,
        code: testCode
    });

    if (result && result.success && !result.simulated) {
        console.log('✅ Real test email successfully sent and accepted by SMTP server!\n');
    } else if (result && result.simulated) {
        console.warn('⚠️ Warning: Email was simulated because credentials were treated as test mode.');
    } else {
        console.error(`❌ Failed to send email: ${result?.error || 'Unknown SMTP error'}\n`);
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Unexpected error:', err.message);
    process.exit(1);
});
