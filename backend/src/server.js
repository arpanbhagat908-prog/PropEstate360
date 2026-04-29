// ─── PropEstate360 v4 — Main Server ─────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Allowed Origins ──────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL, // from Render env
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'https://prop-estate360.vercel.app', // ⭐ your deployed frontend
];

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('CORS not allowed for this origin: ' + origin));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static uploads ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/enquiries',  require('./routes/enquiries'));
app.use('/api/ai',         require('./routes/ai'));

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const db = require('./db/database');
  const props = db.prepare('SELECT COUNT(*) as c FROM properties').get().c;
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  res.json({ status: 'ok', version: '3.0.0', properties: props, users });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const db = require('./db/database');
  const props = db.prepare('SELECT COUNT(*) as c FROM properties').get().c;
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  console.log(`\n🏡 PropEstate360 v4 Backend`);
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log(`   Properties: ${props}`);
  console.log(`   Users:      ${users}`);
  console.log(`\n📋 API Endpoints:`);
  console.log(`   Auth:        /api/auth/*`);
  console.log(`   Properties:  /api/properties/*`);
  console.log(`   Admin:       /api/admin/* (Arpan only)`);
  console.log(`   AI:          /api/ai/chat`);
  console.log(`   Health:      /api/health\n`);
});
