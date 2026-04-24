// ─── AUTH ROUTES ────────────────────────────────────────────────────────────
require('dotenv').config();
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const db      = require('../db/database');
const { signToken, authMiddleware } = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/mailer');

const OTP_TTL = 10 * 60 * 1000; // 10 minutes
const AGENT_HARD_LIMIT = 10;

// ── POST /api/auth/send-otp ─────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + OTP_TTL;

  db.prepare('INSERT OR REPLACE INTO otp_store (email,otp,expires_at,verified) VALUES (?,?,?,0)')
    .run(email, otp, expiresAt);

  try {
    const result = await sendOTPEmail(email, otp, name || 'User');
    res.json({
      success: true,
      message: result.mode === 'console'
        ? 'OTP generated (check server console — configure Gmail in .env for real emails)'
        : `OTP sent to ${email}`,
      mode: result.mode,
      ...(result.mode === 'console' && { dev_otp: otp }),
    });
  } catch (err) {
    console.error('Email send error:', err.message);
    res.status(500).json({ error: 'Failed to send OTP email. Check your Gmail credentials in .env' });
  }
});

// ── POST /api/auth/verify-otp ───────────────────────────────────────────────
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = db.prepare('SELECT * FROM otp_store WHERE email=?').get(email);

  if (!record)               return res.status(400).json({ error: 'No OTP found for this email. Please request again.' });
  if (Date.now() > record.expires_at) {
    db.prepare('DELETE FROM otp_store WHERE email=?').run(email);
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }
  if (record.otp !== String(otp)) return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });

  db.prepare('UPDATE otp_store SET verified=1 WHERE email=?').run(email);
  res.json({ success: true, message: 'Email verified successfully!' });
});

// ── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !phone || !password)
    return res.status(400).json({ error: 'All fields are required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email format' });
  if (!/^[6-9]\d{9}$/.test(phone))
    return res.status(400).json({ error: 'Invalid Indian phone number (10 digits, start 6-9)' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  // Check OTP was verified
  const otpRecord = db.prepare('SELECT * FROM otp_store WHERE email=? AND verified=1').get(email);
  if (!otpRecord)
    return res.status(400).json({ error: 'Email not verified. Please verify OTP first.' });

  if (db.prepare('SELECT id FROM users WHERE email=?').get(email))
    return res.status(409).json({ error: 'Email already registered' });
  if (db.prepare('SELECT id FROM users WHERE phone=?').get(phone))
    return res.status(409).json({ error: 'Phone number already registered' });

  // Role assignment with agent limit and approval flow
  let assignedRole = 'buyer';
  let agentStatus  = 'approved';

  if (role === 'agent') {
    // Count ALL agents (approved + pending) — hard limit
    const totalAgents = db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE role='agent'"
    ).get().count;

    if (totalAgents >= AGENT_HARD_LIMIT) {
      return res.status(403).json({
        error: `Agent registration limit reached (${AGENT_HARD_LIMIT} agents). Please contact admin.`,
      });
    }
    assignedRole = 'agent';
    agentStatus  = 'pending';  // Must be approved by admin
  } else if (role === 'buyer') {
    assignedRole = 'buyer';
  }

  const hash = bcrypt.hashSync(password, 10);
  const id   = 'u_' + Date.now();
  db.prepare(`INSERT INTO users (id,name,email,phone,password_hash,role,email_verified,agent_status)
              VALUES (?,?,?,?,?,?,1,?)`)
    .run(id, name, email, phone, hash, assignedRole, agentStatus);

  // Cleanup OTP
  db.prepare('DELETE FROM otp_store WHERE email=?').run(email);

  if (assignedRole === 'agent' && agentStatus === 'pending') {
    console.log(`[AUTH] New agent registration (PENDING approval): ${email}`);
    return res.status(201).json({
      success: true,
      pending: true,
      message: 'Registration submitted! Your agent account is pending admin approval. You will be notified once approved.',
    });
  }

  const user = db.prepare('SELECT id,name,email,phone,role,email_verified,is_restricted,agent_status FROM users WHERE id=?').get(id);
  const token = signToken(user);
  console.log(`[AUTH] New user: ${email} (${assignedRole})`);
  res.status(201).json({ success: true, token, user });
});

// ── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password' });

  if (user.is_restricted)
    return res.status(403).json({ error: 'Your account has been restricted. Contact admin.' });

  if (user.role === 'agent' && user.agent_status === 'pending')
    return res.status(403).json({
      error: 'Your agent account is pending approval by the admin. Please check back later.',
      pending: true,
    });

  if (user.role === 'agent' && user.agent_status === 'rejected')
    return res.status(403).json({
      error: 'Your agent registration was rejected. Please contact admin for more information.',
    });

  const token = signToken(user);
  const { password_hash, ...safeUser } = user;
  console.log(`[AUTH] Login: ${email}`);
  res.json({ success: true, token, user: safeUser });
});

// ── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ── PUT /api/auth/profile ───────────────────────────────────────────────────
router.put('/profile', authMiddleware, (req, res) => {
  const { name, phone, about } = req.body;
  if (phone && !/^[6-9]\d{9}$/.test(phone))
    return res.status(400).json({ error: 'Invalid phone number' });

  db.prepare('UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), about=COALESCE(?,about) WHERE id=?')
    .run(name || null, phone || null, about ?? null, req.user.id);

  const updated = db.prepare('SELECT id,name,email,phone,role,email_verified,is_restricted,about,agent_status FROM users WHERE id=?').get(req.user.id);
  res.json({ success: true, user: updated });
});

// ── PUT /api/auth/change-password ──────────────────────────────────────────
router.put('/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);

  if (!bcrypt.compareSync(currentPassword, user.password_hash))
    return res.status(400).json({ error: 'Current password is incorrect' });
  if (newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });

  db.prepare('UPDATE users SET password_hash=? WHERE id=?')
    .run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ success: true, message: 'Password changed successfully' });
});

module.exports = router;
