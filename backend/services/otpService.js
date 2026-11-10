import nodemailer from 'nodemailer';

let testMockTransporter = null;

export function setTestMockTransporter(transporter) {
    testMockTransporter = transporter;
}

export async function sendOtp({ channel = null, to, code }) {
    const selectedChannel = channel || process.env.OTP_CHANNEL || 'email';
    const isTestMode = process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_OTP === 'true';

    // Test console / mock delivery hook
    if (isTestMode && testMockTransporter) {
        return await testMockTransporter.sendMail({
            to,
            subject: 'Shagun Mart Verification Code',
            text: `Your Shagun Mart verification code is ${code}. Valid for 5 minutes. Don't share it.`
        });
    }

    if (selectedChannel === 'email') {
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = Number(process.env.SMTP_PORT) || 465;
        const secure = port === 465;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const fromName = process.env.MAIL_FROM_NAME || 'Shagun Mart';

        if (!user || !pass) {
            if (isTestMode) {
                // In non-production test mode without credentials, succeed safely without logging address or code
                return { success: true, simulated: true };
            }
            console.error('[Email Provider] Missing SMTP credentials (SMTP_USER/SMTP_PASS).');
            return { success: false, error: 'SMTP credentials missing' };
        }

        try {
            const transporter = nodemailer.createTransport({
                host,
                port,
                secure,
                auth: { user, pass }
            });

            await transporter.sendMail({
                from: `"${fromName}" <${user}>`,
                to,
                subject: 'Your Shagun Mart Verification Code',
                text: `Hello,\n\nYour Shagun Mart verification code is: ${code}\n\nThis code is valid for 5 minutes. For your security, do not share it with anyone.\n\n— Shagun Mart`,
                html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:10px;">
                    <h2 style="color:#881337;margin-top:0;">Shagun Mart</h2>
                    <p style="font-size:14px;color:#333;">Your single-use verification code is:</p>
                    <div style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#18181b;background:#f4f4f5;padding:12px;text-align:center;border-radius:8px;margin:16px 0;">${code}</div>
                    <p style="font-size:12px;color:#666;">This code is valid for 5 minutes. Never share this code with anyone.</p>
                </div>`
            });

            return { success: true };
        } catch (mailErr) {
            console.error('[Email Provider] Failed to dispatch verification email');
            return { success: false, error: mailErr.message };
        }
    }

    if (selectedChannel === 'sms') {
        const cleanPhone = String(to || '').replace(/\D/g, '').slice(-10);
        if (process.env.FAST2SMS_API_KEY && (!isTestMode || process.env.FORCE_SMS_DISPATCH === 'true')) {
            try {
                await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.FAST2SMS_API_KEY}&route=otp&variables_values=${code}&flash=0&numbers=${cleanPhone}`);
                return { success: true };
            } catch (smsErr) {
                console.error('[SMS Provider] Failed to dispatch SMS via Fast2SMS');
                return { success: false, error: smsErr.message };
            }
        }
        return { success: true, simulated: true };
    }

    return { success: true };
}

