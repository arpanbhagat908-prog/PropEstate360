// ─── DATABASE SETUP ────────────────────────────────────────────────────────
require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, process.env.DB_PATH?.replace('./data/', '') || 'propestate360.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT DEFAULT 'buyer',
    agent_status    TEXT DEFAULT 'approved',
    email_verified  INTEGER DEFAULT 0,
    is_restricted   INTEGER DEFAULT 0,
    agent_license   TEXT DEFAULT '',
    about           TEXT DEFAULT '',
    created_at      TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS otp_store (
    email      TEXT PRIMARY KEY,
    otp        TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    verified   INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS properties (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'house',
    listing      TEXT NOT NULL DEFAULT 'sale',
    state        TEXT NOT NULL DEFAULT 'Punjab',
    district     TEXT NOT NULL,
    locality     TEXT DEFAULT '',
    price        INTEGER NOT NULL,
    area         INTEGER DEFAULT 0,
    beds         INTEGER DEFAULT 0,
    baths        INTEGER DEFAULT 0,
    floors       INTEGER DEFAULT 0,
    description  TEXT DEFAULT '',
    amenities    TEXT DEFAULT '[]',
    featured     INTEGER DEFAULT 0,
    status       TEXT DEFAULT 'active',
    posted_by    TEXT,
    agent_name   TEXT DEFAULT '',
    agent_phone  TEXT DEFAULT '',
    agent_email  TEXT DEFAULT '',
    photos       TEXT DEFAULT '[]',
    created_at   TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (posted_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS enquiries (
    id           TEXT PRIMARY KEY,
    property_id  TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    user_name    TEXT NOT NULL,
    user_email   TEXT NOT NULL,
    user_phone   TEXT DEFAULT '',
    message      TEXT NOT NULL,
    status       TEXT DEFAULT 'open',
    created_at   TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    state         TEXT NOT NULL DEFAULT 'Punjab',
    district      TEXT NOT NULL,
    property_type TEXT NOT NULL,
    listing_type  TEXT NOT NULL DEFAULT 'sale',
    avg_price     INTEGER NOT NULL,
    month         INTEGER NOT NULL,
    year          INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wishlist (
    user_id     TEXT NOT NULL,
    property_id TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now','localtime')),
    PRIMARY KEY (user_id, property_id)
  );
`);

// ── Migrate: add missing columns to existing databases ────────────────────
const safeAddColumn = (table, col, def) => {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`); } catch (_) {}
};
safeAddColumn('properties', 'floors',  'INTEGER DEFAULT 0');
safeAddColumn('properties', 'state',   "TEXT NOT NULL DEFAULT 'Punjab'");
safeAddColumn('users', 'agent_status', "TEXT DEFAULT 'approved'");

module.exports = db;
