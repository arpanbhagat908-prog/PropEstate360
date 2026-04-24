// ─── AUTH MIDDLEWARE ────────────────────────────────────────────────────────
require('dotenv').config();
const jwt = require('jsonwebtoken');
const db  = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: no token' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id,name,email,phone,role,email_verified,is_restricted,agent_status FROM users WHERE id=?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.is_restricted) return res.status(403).json({ error: 'Your account has been restricted by admin.' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access only' });
  next();
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authMiddleware, adminOnly, signToken };
