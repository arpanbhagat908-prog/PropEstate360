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
    .run(id, property_id, req.user.id, req.user.name, req.user.email, user_phone || req.user.phone || '', message);

  res.status(201).json({ success: true, enquiry: db.prepare('SELECT * FROM enquiries WHERE id=?').get(id) });
});

// ── GET /api/enquiries  (buyer: sent | agent/admin: received on their properties)
router.get('/', authMiddleware, (req, res) => {
  const u = req.user;

  if (u.role === 'buyer') {
    // Buyers see enquiries they sent
    const enqs = db.prepare(
      `SELECT e.*, p.title AS property_title, p.district, p.price, p.listing
       FROM enquiries e LEFT JOIN properties p ON e.property_id=p.id
       WHERE e.user_id=? ORDER BY e.created_at DESC`
    ).all(u.id);
    return res.json({ enquiries: enqs });
  }

  // Agents see enquiries received on properties they posted
  // Admins see all enquiries
  let sql = `SELECT e.*, p.title AS property_title, p.district, p.price, p.listing
             FROM enquiries e LEFT JOIN properties p ON e.property_id=p.id`;

  if (u.role === 'agent') {
    sql += ` WHERE p.posted_by=?`;
    sql += ` ORDER BY e.created_at DESC`;
    const enqs = db.prepare(sql).all(u.id);
    return res.json({ enquiries: enqs });
  }

  // Admin
  sql += ` ORDER BY e.created_at DESC`;
  const enqs = db.prepare(sql).all();
  res.json({ enquiries: enqs });
});

// ── PATCH /api/enquiries/:id/status  (agent or admin can update) ─────────────
router.patch('/:id/status', authMiddleware, (req, res) => {
  const enq = db.prepare(
    `SELECT e.*, p.posted_by FROM enquiries e
     LEFT JOIN properties p ON e.property_id=p.id WHERE e.id=?`
  ).get(req.params.id);

  if (!enq) return res.status(404).json({ error: 'Enquiry not found' });

  const u = req.user;
  // Only the property owner (agent) or admin can update status
  if (u.role !== 'admin' && enq.posted_by !== u.id) {
    return res.status(403).json({ error: 'Not authorized to update this enquiry' });
  }

  const { status } = req.body;
  if (!['open', 'replied', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use: open, replied, closed' });
  }

  db.prepare('UPDATE enquiries SET status=? WHERE id=?').run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM enquiries WHERE id=?').get(req.params.id);
  res.json({ success: true, enquiry: updated });
});

module.exports = router;
