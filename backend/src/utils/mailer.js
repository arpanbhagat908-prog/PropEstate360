// ─── EMAIL UTILITY (Nodemailer + Gmail SMTP) ────────────────────────────────
require('dotenv').config();
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD ||
      process.env.GMAIL_USER === 'your_gmail_address@gmail.com') {
    console.warn('⚠️  Email not configured. OTPs will appear in server console only.');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

async function sendOTPEmail(toEmail, otp, userName = 'User') {
  const tp = getTransporter();

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif">
    <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,138,.12)">
      <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:36px 40px;text-align:center">
        <div style="font-size:32px;margin-bottom:8px">🏡</div>
        <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:.5px">PropEstate360</h1>
        <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">Punjab's Trusted Real Estate Platform</p>
      </div>
      <div style="padding:36px 40px">
        <h2 style="color:#1e3a8a;margin:0 0 8px;font-size:18px">Hello, ${userName}! 👋</h2>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px">
          Use the verification code below to complete your registration.
          This code is valid for <strong>10 minutes</strong>.
        </p>
        <div style="background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px">
          <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase">Your OTP</p>
          <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#1e3a8a;font-family:'Courier New',monospace">${otp}</div>
        </div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0">
          🔒 Never share this code with anyone. PropEstate360 will never ask for your OTP.<br>
          If you did not request this, please ignore this email.
        </p>
      </div>
      <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0">
        <p style="margin:0;color:#94a3b8;font-size:12px">© 2026 PropEstate360 · Punjab Real Estate · All rights reserved</p>
      </div>
    </div>
  </body>
  </html>`;

  if (!tp) {
    // Dev fallback: print to console
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📧 OTP EMAIL (console mode — configure Gmail in .env)`);
    console.log(`   To   : ${toEmail}`);
    console.log(`   Name : ${userName}`);
    console.log(`   OTP  : ${otp}`);
    console.log(`${'─'.repeat(50)}\n`);
    return { success: true, mode: 'console' };
  }

  await tp.sendMail({
    from: `"PropEstate360" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `${otp} – Your PropEstate360 Verification Code`,
    html,
    text: `Your PropEstate360 OTP is: ${otp}\nValid for 10 minutes.`,
  });

  return { success: true, mode: 'email' };
}

module.exports = { sendOTPEmail };
