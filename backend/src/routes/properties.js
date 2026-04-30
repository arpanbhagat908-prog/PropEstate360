// ─── PROPERTY ROUTES ────────────────────────────────────────────────────────
const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const db     = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// ── Multer setup ─────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    cb(null, `prop-${Date.now()}-${Math.round(Math.random()*1e6)}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB for high quality
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ── State → Districts mapping (for validation) ────────────────────────────
const STATE_DISTRICTS = {
  'Punjab': [
    'Amritsar','Barnala','Bathinda','Faridkot','Fatehgarh Sahib','Fazilka',
    'Ferozepur','Gurdaspur','Hoshiarpur','Jalandhar','Kapurthala','Ludhiana',
    'Malerkotla','Mansa','Moga','Mohali (SAS Nagar)','Muktsar (Sri Muktsar Sahib)',
    'Pathankot','Patiala','Rupnagar (Ropar)','Sangrur','Shaheed Bhagat Singh Nagar','Tarn Taran',
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseProperty(p) {
  if (!p) return null;
  return {
    ...p,
    amenities: JSON.parse(p.amenities || '[]'),
    photos:    JSON.parse(p.photos    || '[]'),
    featured:  Boolean(p.featured),
    floors:    p.floors || 0,
    price_per_sqft: (p.area && p.area > 0)
      ? Math.round(p.price / p.area)
      : null,
  };
}

// ── GET /api/properties ───────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { state, district, type, listing, minPrice, maxPrice, beds, q, sort, featured, status, posted_by } = req.query;

  let sql = `SELECT p.*,
    u.name AS agent_name_db, u.phone AS agent_phone_db, u.email AS agent_email_db
    FROM properties p LEFT JOIN users u ON p.posted_by = u.id WHERE 1=1`;
  const params = [];

  if (!status || status === 'active') { sql += ' AND p.status=?'; params.push('active'); }
  else { sql += ' AND p.status=?'; params.push(status); }

  if (state)     { sql += ' AND p.state=?';      params.push(state); }
  if (district)  { sql += ' AND LOWER(p.district)=LOWER(?)';   params.push(district); }
  if (type)      { sql += ' AND p.type=?';        params.push(type); }
  if (listing)   { sql += ' AND p.listing=?';     params.push(listing); }
  if (minPrice)  { sql += ' AND p.price>=?';      params.push(parseInt(minPrice)); }
  if (maxPrice)  { sql += ' AND p.price<=?';      params.push(parseInt(maxPrice)); }
  if (beds)      { sql += ' AND p.beds>=?';       params.push(parseInt(beds)); }
  if (featured)  { sql += ' AND p.featured=1'; }
  if (posted_by) { sql += ' AND p.posted_by=?';   params.push(posted_by); }
  if (q) {
    sql += ' AND (p.title LIKE ? OR p.locality LIKE ? OR p.district LIKE ? OR p.description LIKE ? OR p.state LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }

  if (sort === 'price_asc')   sql += ' ORDER BY p.price ASC';
  else if (sort === 'price_desc') sql += ' ORDER BY p.price DESC';
  else if (sort === 'newest') sql += ' ORDER BY p.created_at DESC';
  else sql += ' ORDER BY p.featured DESC, p.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  const properties = rows.map(row => {
    const p = parseProperty(row);
    p.agent_name  = p.agent_name  || row.agent_name_db  || '';
    p.agent_phone = p.agent_phone || row.agent_phone_db || '';
    p.agent_email = p.agent_email || row.agent_email_db || '';
    return p;
  });
  res.json({ properties, total: properties.length });
});

// ── GET /api/properties/states-summary ──────────────────────────────────────
router.get('/states-summary', (req, res) => {
  const rows = db.prepare(
    `SELECT state, COUNT(*) as count FROM properties WHERE status='active' GROUP BY state ORDER BY count DESC`
  ).all();
  res.json({ states: rows });
});

// ── GET /api/properties/state-breakdown ─────────────────────────────────────
// Punjab → all districts; Other states → their districts
router.get('/state-breakdown', (req, res) => {
  const { state } = req.query;
  if (!state) return res.status(400).json({ error: 'state param required' });

  const total = db.prepare(
    `SELECT COUNT(*) as c FROM properties WHERE status='active' AND state=?`
  ).get(state)?.c || 0;

  if (state === 'Punjab') {
    const districts = db.prepare(
      `SELECT district, COUNT(*) as count, AVG(price) as avg_price FROM properties
       WHERE status='active' AND state='Punjab' GROUP BY district ORDER BY count DESC`
    ).all();

    const withFeatured = districts.map(d => {
      const featured = db.prepare(
        `SELECT * FROM properties WHERE status='active' AND state='Punjab' AND district=?
         ORDER BY featured DESC, created_at DESC LIMIT 3`
      ).all(d.district).map(parseProperty);
      return {
        district: d.district,
        count: d.count,
        avg_price: Math.round(d.avg_price || 0),
        featured,
      };
    });

    return res.json({ type: 'punjab', state: 'Punjab', total, breakdown: withFeatured });
  }

  // Other states: show their own districts
  const districtRows = db.prepare(
    `SELECT district, COUNT(*) as count, AVG(price) as avg_price
     FROM properties WHERE status='active' AND state=?
     GROUP BY district ORDER BY count DESC`
  ).all(state);

  const withFeatured = districtRows.map(d => {
    const featured = db.prepare(
      `SELECT * FROM properties WHERE status='active' AND state=? AND district=?
       ORDER BY featured DESC, created_at DESC LIMIT 3`
    ).all(state, d.district).map(parseProperty);
    return {
      district: d.district,
      count: d.count,
      avg_price: Math.round(d.avg_price || 0),
      featured,
    };
  });

  res.json({ type: 'other', state, total, breakdown: withFeatured });
});

// ── GET /api/properties/trends ────────────────────────────────────────────────
router.get('/trends', (req, res) => {
  const { state = 'Punjab', district, type = 'house', listing = 'sale' } = req.query;

  let rows = [];
  if (district) {
    rows = db.prepare(
      `SELECT * FROM price_history WHERE state=? AND district=? AND property_type=? AND listing_type=?
       ORDER BY year, month`
    ).all(state, district, type, listing);
  } else {
    rows = db.prepare(
      `SELECT month, year, AVG(avg_price) as avg_price FROM price_history
       WHERE state=? AND property_type=? AND listing_type=? GROUP BY year, month ORDER BY year, month`
    ).all(state, type, listing);
  }

  // Real avg from actual listings
  let realQuery;
  const realParams = [];
  if (district) {
    realQuery = `SELECT AVG(CAST(price AS REAL)/NULLIF(area,0)) as avg_ppsf FROM properties
      WHERE status='active' AND state=? AND district=? AND type=? AND listing=? AND area>0`;
    realParams.push(state, district, type, listing);
  } else {
    realQuery = `SELECT AVG(CAST(price AS REAL)/NULLIF(area,0)) as avg_ppsf FROM properties
      WHERE status='active' AND state=? AND type=? AND listing=? AND area>0`;
    realParams.push(state, type, listing);
  }
  const realRow = db.prepare(realQuery).get(...realParams);

  res.json({
    trends: rows,
    real_avg_price_per_sqft: realRow?.avg_ppsf ? Math.round(realRow.avg_ppsf) : null,
  });
});

// ── GET /api/properties/user/wishlist ─────────────────────────────────────────
router.get('/user/wishlist', authMiddleware, (req, res) => {
  const rows = db.prepare(
    `SELECT p.* FROM properties p
     JOIN wishlist w ON p.id=w.property_id
     WHERE w.user_id=? AND p.status='active'
     ORDER BY w.created_at DESC`
  ).all(req.user.id);
  res.json({ properties: rows.map(parseProperty) });
});

// ── POST /api/properties/:id/wishlist ─────────────────────────────────────────
router.post('/:id/wishlist', authMiddleware, (req, res) => {
  const { id } = req.params;
  const exists = db.prepare('SELECT 1 FROM wishlist WHERE user_id=? AND property_id=?').get(req.user.id, id);
  if (exists) {
    db.prepare('DELETE FROM wishlist WHERE user_id=? AND property_id=?').run(req.user.id, id);
    res.json({ wishlisted: false });
  } else {
    db.prepare('INSERT INTO wishlist (user_id,property_id) VALUES (?,?)').run(req.user.id, id);
    res.json({ wishlisted: true });
  }
});

// ── GET /api/properties/user/wishlist-ids ─────────────────────────────────────
router.get('/user/wishlist-ids', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT property_id FROM wishlist WHERE user_id=?').all(req.user.id);
  res.json({ ids: rows.map(r => r.property_id) });
});

// ── GET /api/properties/trending ─────────────────────────────────────────────
// Based on wishlist activity + recency
router.get('/trending', (req, res) => {
  const { district, state } = req.query;
  let sql = `
    SELECT p.*, COUNT(w.user_id) as wish_count,
      u.name AS agent_name_db, u.phone AS agent_phone_db, u.email AS agent_email_db
    FROM properties p
    LEFT JOIN wishlist w ON p.id=w.property_id
    LEFT JOIN users u ON p.posted_by=u.id
    WHERE p.status='active'`;
  const params = [];
  if (state)    { sql += ' AND p.state=?';    params.push(state); }
  if (district) { sql += ' AND LOWER(p.district)=LOWER(?)'; params.push(district); }
  sql += ' GROUP BY p.id ORDER BY wish_count DESC, p.featured DESC, p.created_at DESC LIMIT 8';

  const rows = db.prepare(sql).all(...params);
  const properties = rows.map(row => {
    const p = parseProperty(row);
    p.agent_name  = p.agent_name  || row.agent_name_db  || '';
    p.agent_phone = p.agent_phone || row.agent_phone_db || '';
    p.agent_email = p.agent_email || row.agent_email_db || '';
    return p;
  });
  res.json({ properties });
});

// ── GET /api/properties/:id ───────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const row = db.prepare(
    `SELECT p.*, u.name AS agent_name_db, u.phone AS agent_phone_db, u.email AS agent_email_db
     FROM properties p LEFT JOIN users u ON p.posted_by=u.id WHERE p.id=?`
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Property not found' });
  const p = parseProperty(row);
  p.agent_name  = p.agent_name  || row.agent_name_db  || '';
  p.agent_phone = p.agent_phone || row.agent_phone_db || '';
  p.agent_email = p.agent_email || row.agent_email_db || '';
  res.json({ property: p });
});

// ── POST /api/properties ──────────────────────────────────────────────────────
router.post('/', authMiddleware, upload.array('photos', 8), (req, res) => {
  const u = req.user;
  // Only approved agents and admins can list
  if (u.role === 'buyer') {
    return res.status(403).json({ error: 'Buyers cannot list properties.' });
  }
  if (u.role === 'agent' && u.agent_status !== 'approved') {
    return res.status(403).json({ error: 'Your agent account is not yet approved.' });
  }

  const { title, type, listing, state, district, locality, price, area, beds, baths, floors,
          description, amenities, featured, agent_name, agent_phone, agent_email } = req.body;

  if (!title || !district || !price) {
    return res.status(400).json({ error: 'Title, district and price are required' });
  }

  // Validate state-district consistency for Punjab
  const selectedState = state || 'Punjab';
  if (selectedState === 'Punjab' && district) {
    const validDistricts = STATE_DISTRICTS['Punjab'];
    if (!validDistricts.includes(district)) {
      return res.status(400).json({
        error: `"${district}" is not a valid Punjab district. Please select a correct Punjab district.`,
      });
    }
  }

  // Build photos array — use full URL path for serving
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const photos = req.files?.map(f => `/uploads/${f.filename}`) || [];

  const id = 'p_' + Date.now();
  db.prepare(`INSERT INTO properties
    (id,title,type,listing,state,district,locality,price,area,beds,baths,floors,description,amenities,featured,status,posted_by,agent_name,agent_phone,agent_email,photos)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(
      id, title, type || 'house', listing || 'sale',
      selectedState, district, locality || '',
      parseInt(price), parseInt(area)||0, parseInt(beds)||0, parseInt(baths)||0, parseInt(floors)||0,
      description || '',
      amenities || '[]',
      featured === 'true' ? 1 : 0,
      'active', u.id,
      agent_name || u.name || '',
      agent_phone || u.phone || '',
      agent_email || u.email || '',
      JSON.stringify(photos),
    );

  const prop = parseProperty(db.prepare('SELECT * FROM properties WHERE id=?').get(id));
  console.log(`[PROP] New listing: ${title} by ${u.email}`);
  res.status(201).json({ success: true, property: prop });
});

// ── PUT /api/properties/:id ───────────────────────────────────────────────────
router.put('/:id', authMiddleware, upload.array('photos', 8), (req, res) => {
  const prop = db.prepare('SELECT * FROM properties WHERE id=?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const u = req.user;
  if (u.role !== 'admin' && prop.posted_by !== u.id) {
    return res.status(403).json({ error: 'Not authorized to edit this property' });
  }

  const { title, type, listing, state, district, locality, price, area, beds, baths, floors,
          description, amenities, featured, agent_name, agent_phone, agent_email } = req.body;

  const selectedState = state || prop.state || 'Punjab';
  if (selectedState === 'Punjab' && district) {
    const validDistricts = STATE_DISTRICTS['Punjab'];
    if (!validDistricts.includes(district)) {
      return res.status(400).json({
        error: `"${district}" is not a valid Punjab district.`,
      });
    }
  }

  // Handle new photo uploads
  let photos = JSON.parse(prop.photos || '[]');

if (req.files?.length) {
  photos = req.files.map(f => `/uploads/${f.filename}`); // ✅ overwrite
}

  db.prepare(`UPDATE properties SET
    title=COALESCE(?,title), type=COALESCE(?,type), listing=COALESCE(?,listing),
    state=COALESCE(?,state), district=COALESCE(?,district), locality=COALESCE(?,locality),
    price=COALESCE(?,price), area=COALESCE(?,area), beds=COALESCE(?,beds), baths=COALESCE(?,baths),
    floors=COALESCE(?,floors), description=COALESCE(?,description),
    amenities=COALESCE(?,amenities), featured=COALESCE(?,featured),
    agent_name=COALESCE(?,agent_name), agent_phone=COALESCE(?,agent_phone),
    agent_email=COALESCE(?,agent_email), photos=?
    WHERE id=?`)
    .run(
      title||null, type||null, listing||null,
      selectedState||null, district||null, locality||null,
      price ? parseInt(price) : null,
      area  ? parseInt(area)  : null,
      beds  ? parseInt(beds)  : null,
      baths ? parseInt(baths) : null,
      floors !== undefined ? parseInt(floors)||0 : null,
      description||null, amenities||null,
      featured !== undefined ? (featured==='true'?1:0) : null,
      agent_name||null, agent_phone||null, agent_email||null,
      JSON.stringify(photos),
      req.params.id,
    );

  res.json({ success: true, property: parseProperty(db.prepare('SELECT * FROM properties WHERE id=?').get(req.params.id)) });
});

// ── DELETE /api/properties/:id ────────────────────────────────────────────────
router.delete('/:id', authMiddleware, (req, res) => {
  const prop = db.prepare('SELECT * FROM properties WHERE id=?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  if (req.user.role !== 'admin' && prop.posted_by !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to delete this property' });
  }

  // Delete uploaded files
  try {
    const photos = JSON.parse(prop.photos || '[]');
    photos.forEach(p => {
      if (p.startsWith('/uploads/')) {
        const fp = path.join(__dirname, '../../', p);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    });
  } catch (_) {}

  db.prepare('DELETE FROM properties WHERE id=?').run(req.params.id);
  res.json({ success: true, message: 'Property deleted' });
});

// ── PATCH /api/properties/:id/status ─────────────────────────────────────────
router.patch('/:id/status', authMiddleware, (req, res) => {
  const prop = db.prepare('SELECT * FROM properties WHERE id=?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  if (req.user.role !== 'admin' && prop.posted_by !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { status } = req.body;
  if (!['active','sold','rented','inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.prepare('UPDATE properties SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});

module.exports = router;
