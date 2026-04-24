// ─── ENQUIRY ROUTES ──────────────────────────────────────────────────────────
const router = require('express').Router();
const db     = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

// ── POST /api/enquiries ─────────────────────────────────────────────────────
router.post('/', authMiddleware, (req, res) => {
  const { property_id, message, user_phone } = req.body;
  if (!property_id || !message) return res.status(400).json({ error: 'Property ID and message are required' });

  const prop = db.prepare('SELECT id,title FROM properties WHERE id=?').get(property_id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const id = 'e_' + Date.now();
  db.prepare(`INSERT INTO enquiries (id,property_id,user_id,user_name,user_email,user_phone,message)
              VALUES (?,?,?,?,?,?,?)`)
    .run(id, property_id, req.user.id, req.user.name, req.user.email, user_phone||req.user.phone||'', message);

  res.status(201).json({ success: true, enquiry: db.prepare('SELECT * FROM enquiries WHERE id=?').get(id) });
});

// ── GET /api/enquiries (user's own) ────────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  const enqs = db.prepare(`SELECT e.*, p.title AS property_title, p.district, p.price, p.listing
    FROM enquiries e LEFT JOIN properties p ON e.property_id=p.id
    WHERE e.user_id=? ORDER BY e.created_at DESC`).all(req.user.id);
  res.json({ enquiries: enqs });
});

module.exports = router;
