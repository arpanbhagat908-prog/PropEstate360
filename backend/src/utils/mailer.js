// require('dotenv').config();
// const { Resend } = require('resend');

// const resend = new Resend(process.env.RESEND_API_KEY);

// async function sendOTPEmail(toEmail, otp, userName = 'User') {
//   const html = `
//   <!DOCTYPE html>
//   <html>
//   <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width,initial-scale=1">
//   </head>
//   <body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif">
//     <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,138,.12)">
//       <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:36px 40px;text-align:center">
//         <div style="font-size:32px;margin-bottom:8px">🏡</div>
//         <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:.5px">PropEstate360</h1>
//         <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">Punjab's Trusted Real Estate Platform</p>
//       </div>

//       <div style="padding:36px 40px">
//         <h2 style="color:#1e3a8a;margin:0 0 8px;font-size:18px">
//           Hello, ${userName}! 👋
//         </h2>

//         <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px">
//           Use the verification code below to complete your registration.
//           This code is valid for <strong>10 minutes</strong>.
//         </p>

//         <div style="background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px">
//           <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase">
//             Your OTP
//           </p>

//           <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#1e3a8a;font-family:'Courier New',monospace">
//             ${otp}
//           </div>
//         </div>

//         <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0">
//           🔒 Never share this code with anyone. PropEstate360 will never ask for your OTP.<br>
//           If you did not request this, please ignore this email.
//         </p>
//       </div>

//       <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0">
//         <p style="margin:0;color:#94a3b8;font-size:12px">
//           © 2026 PropEstate360 · Punjab Real Estate · All rights reserved
//         </p>
//       </div>
//     </div>
//   </body>
//   </html>`;

//   try {
//     const response = await resend.emails.send({
//       from: 'arpanbhagat908@gmail.com',
//       to: toEmail,
//       subject: `${otp} – Your PropEstate360 Verification Code`,
//       html,
//     });

//     console.log('✅ OTP Email Sent:', response);

//     return {
//       success: true,
//       mode: 'email',
//     };
//   } catch (error) {
//     console.error('❌ Email Error:', error);

//     return {
//       success: false,
//       error: error.message,
//     };
//   }
// }

// module.exports = { sendOTPEmail };

// ─── EMAIL UTILITY (Nodemailer + Gmail SMTP) ────────────────────────────────
// NOTE: Do NOT call dotenv.config() here — it is already called in server.js
const nodemailer = require('nodemailer');

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (
    !user || !pass ||
    user === 'your_gmail_address@gmail.com' ||
    user.trim() === '' || pass.trim() === ''
  ) {
    console.warn('⚠️  Email not configured. OTPs will appear in server console only.');
    console.warn('   Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
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
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📧 OTP EMAIL (console mode)`);
    console.log(`   To   : ${toEmail}`);
    console.log(`   Name : ${userName}`);
    console.log(`   OTP  : ${otp}`);
    console.log(`${'─'.repeat(50)}\n`);
    return { success: true, mode: 'console' };
  }

  try {
    await tp.sendMail({
      from: `"PropEstate360" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `${otp} – Your PropEstate360 Verification Code`,
      html,
      text: `Your PropEstate360 OTP is: ${otp}\nValid for 10 minutes.`,
    });
    console.log(`[MAILER] OTP email sent to ${toEmail}`);
    return { success: true, mode: 'email' };
  } catch (err) {
    console.error('[MAILER] Failed to send OTP email:');
    console.error('  Error   :', err.message);
    console.error('  Code    :', err.code);
    console.error('  Response:', err.response);
    throw new Error(`Gmail SMTP error: ${err.message}`);
  }
}

module.exports = { sendOTPEmail };