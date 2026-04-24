// ─── DATABASE MIGRATION HELPER ────────────────────────────────────────────────
// Run this script if upgrading from PropEstate360 v3 original to v3-fixed.
// It safely adds new columns and fixes data issues without wiping existing data.
//
// Usage: node src/db/migrate.js
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const db = require('./database');

console.log('\n🔧 PropEstate360 — Database Migration\n');

const migrations = [];

// ── Migration 1: Add state column to properties (if missing) ──────────────────
try {
  db.prepare('SELECT state FROM properties LIMIT 1').get();
  console.log('✅ properties.state column already exists');
} catch (e) {
  db.exec("ALTER TABLE properties ADD COLUMN state TEXT NOT NULL DEFAULT 'Punjab'");
  migrations.push('Added state column to properties');
  console.log('✅ Added state column to properties table');
}

// ── Migration 2: Fix existing properties that have NULL or empty state ─────────
const nullStates = db.prepare("SELECT COUNT(*) as c FROM properties WHERE state IS NULL OR state = ''").get().c;
if (nullStates > 0) {
  db.prepare("UPDATE properties SET state = 'Punjab' WHERE state IS NULL OR state = ''").run();
  migrations.push(`Fixed ${nullStates} properties with missing state → set to 'Punjab'`);
  console.log(`✅ Fixed ${nullStates} properties with missing/null state`);
} else {
  console.log('✅ All properties have valid state values');
}

// ── Migration 3: Add state column to price_history (if missing) ───────────────
try {
  db.prepare('SELECT state FROM price_history LIMIT 1').get();
  console.log('✅ price_history.state column already exists');
} catch (e) {
  db.exec("ALTER TABLE price_history ADD COLUMN state TEXT NOT NULL DEFAULT 'Punjab'");
  // Update all existing rows to Punjab (they were all seeded as Punjab districts)
  db.prepare("UPDATE price_history SET state = 'Punjab' WHERE state IS NULL OR state = ''").run();
  migrations.push('Added state column to price_history');
  console.log('✅ Added state column to price_history and set all existing rows to Punjab');
}

// ── Migration 4: Validate price_per_sqft (log any invalid entries) ────────────
const invalidPpsf = db.prepare(
  "SELECT COUNT(*) as c FROM properties WHERE area <= 0 AND price > 0"
).get().c;
if (invalidPpsf > 0) {
  console.log(`⚠️  ${invalidPpsf} properties have area=0 (price/sqft cannot be calculated for these)`);
} else {
  console.log('✅ All properties with prices have valid area for price/sqft calculation');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────');
if (migrations.length === 0) {
  console.log('✅ Database is already up to date. No migrations needed.\n');
} else {
  console.log(`✅ ${migrations.length} migration(s) applied:`);
  migrations.forEach((m, i) => console.log(`   ${i + 1}. ${m}`));
  console.log('\n🎉 Migration complete!\n');
}

const props = db.prepare('SELECT COUNT(*) as c FROM properties').get().c;
const hist  = db.prepare('SELECT COUNT(*) as c FROM price_history').get().c;
console.log(`📊 Database stats: ${props} properties | ${hist} price_history rows\n`);
