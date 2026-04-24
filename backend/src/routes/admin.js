// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const AGENT_HARD_LIMIT = 10;

// All admin routes require auth + admin role
router.use(authMiddleware, adminOnly);

// ── GET /api/admin/stats ────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const props      = db.prepare('SELECT status FROM properties').all();
  const users      = db.prepare('SELECT role, agent_status FROM users').all();
  const enquiries  = db.prepare('SELECT COUNT(*) as c FROM enquiries').get().c;
  const districts  = db.prepare('SELECT COUNT(DISTINCT district) as c FROM properties').get().c;
  const totalValue = db.prepare("SELECT SUM(price) as s FROM properties WHERE listing='sale' AND status='active'").get().s || 0;
  const recentProp = db.prepare('SELECT COUNT(*) as c FROM properties WHERE created_at >= datetime("now","-30 days")').get().c;
  const recentUsers= db.prepare('SELECT COUNT(*) as c FROM users WHERE created_at >= datetime("now","-30 days")').get().c;
  const pendingAgents = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='agent' AND agent_status='pending'").get().c;
  const approvedAgents = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='agent' AND agent_status='approved'").get().c;

  res.json({
    properties: {
      total:    props.length,
      active:   props.filter(p => p.status === 'active').length,
      sold:     props.filter(p => p.status === 'sold').length,
      rented:   props.filter(p => p.status === 'rented').length,
      inactive: props.filter(p => p.status === 'inactive').length,
      recent:   recentProp,
    },
    users: {
      total:          users.length,
      buyers:         users.filter(u => u.role === 'buyer').length,
      agents:         approvedAgents,
      pendingAgents,
      agentSlots:     AGENT_HARD_LIMIT - (approvedAgents + pendingAgents),
      admins:         users.filter(u => u.role === 'admin').length,
      recent:         recentUsers,
    },
    enquiries,
    districts,
    totalValue,
  });
});

// ── GET /api/admin/users ────────────────────────────────────────────────────
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id,name,email,phone,role,agent_status,email_verified,is_restricted,about,created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

// ── GET /api/admin/agents/pending ──────────────────────────────────────────
router.get('/agents/pending', (req, res) => {
  const agents = db.prepare(
    "SELECT id,name,email,phone,agent_status,created_at FROM users WHERE role='agent' ORDER BY created_at DESC"
  ).all();
  res.json({ agents });
});

// ── PUT /api/admin/agents/:id/approve ─────────────────────────────────────
router.put('/agents/:id/approve', (req, res) => {
  const agent = db.prepare("SELECT * FROM users WHERE id=? AND role='agent'").get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const approvedCount = db.prepare(
    "SELECT COUNT(*) as c FROM users WHERE role='agent' AND agent_status='approved'"
  ).get().c;

  if (approvedCount >= AGENT_HARD_LIMIT) {
    return res.status(403).json({ error: `Cannot approve: agent limit of ${AGENT_HARD_LIMIT} reached.` });
  }

  db.prepare("UPDATE users SET agent_status='approved' WHERE id=?").run(req.params.id);
  console.log(`[ADMIN] Agent approved: ${agent.email}`);
  res.json({ success: true, message: `Agent ${agent.name} approved.` });
});

// ── PUT /api/admin/agents/:id/reject ──────────────────────────────────────
router.put('/agents/:id/reject', (req, res) => {
  const agent = db.prepare("SELECT * FROM users WHERE id=? AND role='agent'").get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  db.prepare("UPDATE users SET agent_status='rejected' WHERE id=?").run(req.params.id);
  console.log(`[ADMIN] Agent rejected: ${agent.email}`);
  res.json({ success: true, message: `Agent ${agent.name} rejected.` });
});

// ── PUT /api/admin/users/:id/restrict ──────────────────────────────────────
router.put('/users/:id/restrict', (req, res) => {
  const { restricted } = req.body;
  const target = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') return res.status(403).json({ error: 'Cannot restrict admin account' });

  db.prepare('UPDATE users SET is_restricted=? WHERE id=?').run(restricted ? 1 : 0, req.params.id);
  console.log(`[ADMIN] User ${target.email} ${restricted ? 'restricted' : 'unrestricted'} by admin`);
  res.json({ success: true, message: restricted ? 'User restricted' : 'User access restored' });
});

// ── PUT /api/admin/users/:id/role ──────────────────────────────────────────
router.put('/users/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['buyer','agent'].includes(role)) return res.status(400).json({ error: 'Role must be buyer or agent' });
  const target = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') return res.status(403).json({ error: 'Cannot change admin role' });
  
  if (role === 'agent') {
    const totalAgents = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='agent'").get().count;
    if (totalAgents >= AGENT_HARD_LIMIT) {
      return res.status(403).json({ error: 'Agent limit reached. Cannot change role to agent.' });
    }
    db.prepare("UPDATE users SET role=?, agent_status='approved' WHERE id=?").run(role, req.params.id);
  } else {
    db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  }
  res.json({ success: true });
});

// ── DELETE /api/admin/users/:id ─────────────────────────────────────────────
router.delete('/users/:id', (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin account' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  console.log(`[ADMIN] User deleted: ${target.email}`);
  res.json({ success: true, message: 'User deleted' });
});

// ── GET /api/admin/properties ───────────────────────────────────────────────
router.get('/properties', (req, res) => {
  const rows = db.prepare(`SELECT p.*, u.name AS poster_name, u.email AS poster_email
    FROM properties p LEFT JOIN users u ON p.posted_by=u.id ORDER BY p.created_at DESC`).all();
  const props = rows.map(p => ({
    ...p,
    amenities: JSON.parse(p.amenities || '[]'),
    photos:    JSON.parse(p.photos    || '[]'),
    featured:  Boolean(p.featured),
  }));
  res.json({ properties: props });
});

// ── GET /api/admin/enquiries ────────────────────────────────────────────────
router.get('/enquiries', (req, res) => {
  const enqs = db.prepare(`SELECT e.*, p.title AS property_title, p.district, p.price
    FROM enquiries e LEFT JOIN properties p ON e.property_id=p.id ORDER BY e.created_at DESC`).all();
  res.json({ enquiries: enqs });
});

// ── PUT /api/admin/enquiries/:id ────────────────────────────────────────────
router.put('/enquiries/:id', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE enquiries SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});

// ── GET /api/admin/sales-perf ───────────────────────────────────────────────
router.get('/sales-perf', (req, res) => {
  // Sold properties by role
  const agentSold = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(p.price),0) as revenue
    FROM properties p JOIN users u ON p.posted_by = u.id
    WHERE p.status='sold' AND u.role='agent'
  `).get();

  const adminSold = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(p.price),0) as revenue
    FROM properties p JOIN users u ON p.posted_by = u.id
    WHERE p.status='sold' AND u.role='admin'
  `).get();

  // All listings (active+sold) by role for contribution pie
  const agentTotal = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(p.price),0) as value
    FROM properties p JOIN users u ON p.posted_by = u.id
    WHERE u.role='agent'
  `).get();

  const adminTotal = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(p.price),0) as value
    FROM properties p JOIN users u ON p.posted_by = u.id
    WHERE u.role='admin'
  `).get();

  // Top performing agents with sold count, revenue, active listings
  const topAgents = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone,
      COUNT(p.id) as total_listed,
      SUM(CASE WHEN p.status='sold'   THEN 1 ELSE 0 END) as sold_count,
      SUM(CASE WHEN p.status='active' THEN 1 ELSE 0 END) as active_count,
      COALESCE(SUM(CASE WHEN p.status='sold' THEN p.price ELSE 0 END),0) as revenue
    FROM users u
    LEFT JOIN properties p ON p.posted_by = u.id
    WHERE u.role='agent' AND u.agent_status='approved'
    GROUP BY u.id
    ORDER BY sold_count DESC, total_listed DESC
  `).all();

  // Monthly trend: agent vs admin sales (last 6 months by listing month)
  const monthlyTrend = db.prepare(`
    SELECT
      strftime('%Y-%m', p.created_at) as month,
      SUM(CASE WHEN u.role='agent' AND p.status='sold' THEN 1 ELSE 0 END) as agent_sales,
      SUM(CASE WHEN u.role='admin' AND p.status='sold' THEN 1 ELSE 0 END) as admin_sales
    FROM properties p JOIN users u ON p.posted_by = u.id
    WHERE p.created_at >= datetime('now','-6 months')
    GROUP BY month ORDER BY month
  `).all();

  res.json({
    soldByRole: {
      agent: { count: agentSold.count || 0, revenue: agentSold.revenue || 0 },
      admin: { count: adminSold.count || 0, revenue: adminSold.revenue || 0 },
    },
    listingsByRole: {
      agent: { count: agentTotal.count || 0, value: agentTotal.value || 0 },
      admin: { count: adminTotal.count || 0, value: adminTotal.value || 0 },
    },
    topAgents,
    monthlyTrend,
  });
});

// ── GET /api/admin/analytics ────────────────────────────────────────────────
router.get('/analytics', (req, res) => {
  const byDistrict = db.prepare(`SELECT district, state, COUNT(*) as count, AVG(price) as avg_price
    FROM properties WHERE status='active' GROUP BY district ORDER BY count DESC`).all();
  const byType = db.prepare(`SELECT type, COUNT(*) as count FROM properties GROUP BY type`).all();
  const byListing = db.prepare(`SELECT listing, COUNT(*) as count FROM properties GROUP BY listing`).all();
  const byState = db.prepare(`SELECT state, COUNT(*) as count FROM properties WHERE status='active' GROUP BY state ORDER BY count DESC`).all();
  const priceRanges = db.prepare(`
    SELECT
      CASE WHEN price < 2000000 THEN 'Under 20L'
           WHEN price < 5000000 THEN '20L - 50L'
           WHEN price < 10000000 THEN '50L - 1Cr'
           WHEN price < 20000000 THEN '1Cr - 2Cr'
           ELSE 'Above 2Cr' END AS range,
      COUNT(*) as count
    FROM properties WHERE listing='sale' GROUP BY range`).all();
  res.json({ byDistrict, byType, byListing, priceRanges, byState });
});

module.exports = router;
