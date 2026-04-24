// ─── AI CHAT ROUTE ─────────────────────────────────────────────────────────
// Rule-based + database-driven AI — NO paid API required
const router = require('express').Router();
const db     = require('../db/database');

// ── Helper utilities ─────────────────────────────────────────────────────────
function fmt(price, listing) {
  if (listing === 'rent') return `₹${(price/1000).toFixed(0)}K/month`;
  if (price >= 10000000) return `₹${(price/10000000).toFixed(2)} Cr`;
  if (price >= 100000)   return `₹${(price/100000).toFixed(1)} Lakh`;
  return `₹${price.toLocaleString('en-IN')}`;
}

// Standard EMI formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
function calcEMI(principal, ratePercent, tenureYears) {
  if (!principal || principal <= 0) return 0;
  const r = (ratePercent / 12) / 100;
  const n = tenureYears * 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

// Price per sqft: total price / area in sqft (validated)
function calcPricePerSqft(price, area) {
  if (!area || area <= 0 || !price || price <= 0) return null;
  return Math.round(price / area);
}

function extractNumber(text) {
  const m = text.match(/[\d,]+\.?\d*/);
  return m ? parseFloat(m[0].replace(/,/g,'')) : null;
}

function getProps(filters = {}) {
  let sql = "SELECT * FROM properties WHERE status='active'";
  const p = [];
  if (filters.state)    { sql += ' AND state LIKE ?';    p.push(`%${filters.state}%`); }
  if (filters.district) { sql += ' AND district LIKE ?'; p.push(`%${filters.district}%`); }
  if (filters.type)     { sql += ' AND type=?';          p.push(filters.type); }
  if (filters.listing)  { sql += ' AND listing=?';       p.push(filters.listing); }
  if (filters.maxPrice) { sql += ' AND price<=?';        p.push(filters.maxPrice); }
  if (filters.minPrice) { sql += ' AND price>=?';        p.push(filters.minPrice); }
  if (filters.beds)     { sql += ' AND beds>=?';         p.push(filters.beds); }
  sql += ' ORDER BY featured DESC, created_at DESC LIMIT 5';
  return db.prepare(sql).all(...p);
}

function propCard(p) {
  const ppsf = calcPricePerSqft(p.price, p.area);
  const ppsfStr = ppsf ? ` | ₹${ppsf.toLocaleString('en-IN')}/sqft` : '';
  return `• **${p.title}** — ${fmt(p.price, p.listing)} | 📍 ${p.locality}, ${p.district}${ppsfStr} | 🛏 ${p.beds} BHK, ${p.area} sqft`;
}

// ── Intent detection ─────────────────────────────────────────────────────────
function detectIntent(msg) {
  const m = msg.toLowerCase();
  if (/(hi|hello|hey|namaste|ssa|good\s*(morning|evening|afternoon))/i.test(m)) return 'greeting';
  if (/\bemi\b|loan|mortgage|finance|monthly.*(pay|install)|installment/.test(m)) return 'emi';
  if (/trend|price.*(history|over time|last.*(month|year))|market|appreciation|depreciation/.test(m)) return 'trend';
  if (/invest|best area|good (location|area|district)|which (area|city|district)|where.*(buy|invest)/.test(m)) return 'investment';
  if (/compare|vs\.?|versus|differ|between/.test(m)) return 'compare';
  if (/how.*(work|use|list|post|add)|what is|explain|help me|guide/.test(m)) return 'help';
  if (/total|how many|count|stat|overview|summary/.test(m)) return 'stats';
  if (/(show|find|search|list|looking for|need|want|available|any).*(property|house|flat|apartment|villa|plot|shop|pg|rent|buy|sale)/.test(m) ||
      /(property|house|flat|apartment|villa|plot|shop|pg).*(in|at|near|around)/.test(m) ||
      /\d\s*bhk/.test(m)) return 'search';
  if (/price per sq|price.sqft|sqft rate|per sq/.test(m)) return 'price_per_sqft';
  if (/price|cost|rate|how much/.test(m)) return 'price_query';
  if (/thank|great|awesome|nice|good bot|helpful/.test(m)) return 'thanks';
  return 'general';
}

// ── Extractors ────────────────────────────────────────────────────────────────
const DISTRICTS = [
  'amritsar','bathinda','jalandhar','ludhiana','patiala','mohali','gurdaspur',
  'hoshiarpur','faridkot','mansa','moga','pathankot','ferozepur','kapurthala',
  'sangrur','tarn taran','rupnagar','barnala','fazilka','malerkotla','fatehgarh sahib',
  'muktsar','nawanshahr','fatehgarh',
];

const STATES = [
  'punjab','maharashtra','gujarat','rajasthan','delhi','haryana','karnataka',
  'tamil nadu','uttar pradesh','west bengal','bihar','madhya pradesh','andhra pradesh',
  'telangana','kerala','odisha',
];

function extractDistrict(msg) {
  const m = msg.toLowerCase();
  return DISTRICTS.find(d => m.includes(d)) || null;
}

function extractState(msg) {
  const m = msg.toLowerCase();
  return STATES.find(s => m.includes(s)) || null;
}

function extractType(msg) {
  const m = msg.toLowerCase();
  if (m.includes('villa'))     return 'villa';
  if (m.includes('apartment') || m.includes('flat')) return 'apartment';
  if (m.includes('plot') || m.includes('land')) return 'plot';
  if (m.includes('shop') || m.includes('commercial')) return 'shop';
  if (m.includes('warehouse')) return 'warehouse';
  if (m.includes('pg') || m.includes('paying guest')) return 'pg';
  if (m.includes('house') || m.includes('bungalow') || m.includes('bhk')) return 'house';
  return null;
}

function extractListing(msg) {
  const m = msg.toLowerCase();
  if (m.includes('rent') || m.includes('rental') || m.includes('lease')) return 'rent';
  if (m.includes('sale') || m.includes('sell') || m.includes('buy') || m.includes('purchase')) return 'sale';
  return null;
}

function extractBeds(msg) {
  const m = msg.match(/(\d)\s*(bhk|bedroom|bed)/i);
  return m ? parseInt(m[1]) : null;
}

function extractPrice(msg) {
  const crMatch   = msg.match(/(\d+\.?\d*)\s*(cr|crore)/i);
  const lakhMatch = msg.match(/(\d+\.?\d*)\s*(l|lakh|lac)/i);
  const kMatch    = msg.match(/(\d+)\s*(k|thousand)/i);
  if (crMatch)   return parseFloat(crMatch[1])   * 10000000;
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;
  if (kMatch)    return parseInt(kMatch[1])       * 1000;
  return null;
}

// ── Context accumulator from conversation history ─────────────────────────────
function extractContextFromHistory(history) {
  const ctx = { district: null, state: null, type: null, listing: null, beds: null, maxPrice: null, minPrice: null };
  // Only scan user messages from history (skip AI responses)
  const userMessages = history.filter(h => h.role === 'user').map(h => h.text || h.content || '');
  for (const text of userMessages) {
    if (!ctx.district) ctx.district = extractDistrict(text);
    if (!ctx.state)    ctx.state    = extractState(text);
    if (!ctx.type)     ctx.type     = extractType(text);
    if (!ctx.listing)  ctx.listing  = extractListing(text);
    if (!ctx.beds)     ctx.beds     = extractBeds(text);
    if (!ctx.maxPrice) {
      const p = extractPrice(text);
      if (p) {
        if (/under|below|max|budget/i.test(text)) ctx.maxPrice = p;
        else if (/above|more than|min/i.test(text)) ctx.minPrice = p;
        else ctx.maxPrice = p * 1.2;
      }
    }
  }
  return ctx;
}

// ── Main AI handler ───────────────────────────────────────────────────────────
function processMessage(userMsg, history = []) {
  const msg      = userMsg.trim();
  const intent   = detectIntent(msg);

  // Extract from current message
  const curDistrict = extractDistrict(msg);
  const curState    = extractState(msg);
  const curType     = extractType(msg);
  const curListing  = extractListing(msg);
  const curBeds     = extractBeds(msg);
  const curPrice    = extractPrice(msg);

  // Extract accumulated context from conversation history
  const histCtx = extractContextFromHistory(history);

  // Merge: current message takes priority over history context
  const district = curDistrict || histCtx.district;
  const state    = curState    || histCtx.state;
  const type     = curType     || histCtx.type;
  const listing  = curListing  || histCtx.listing;
  const beds     = curBeds     || histCtx.beds;

  // Price: current message overrides history
  let priceVal = curPrice;
  let histMaxPrice = histCtx.maxPrice;
  let histMinPrice = histCtx.minPrice;

  switch (intent) {
    case 'greeting': {
      return '👋 **Sat Sri Akal!** Welcome to PropEstate360 AI Assistant!\n\n' +
        'I can help you:\n' +
        '• 🔍 **Find properties** — by location, type, budget\n' +
        '• 💰 **Calculate EMI** — e.g. "EMI for 60 lakh at 8.5% for 20 years"\n' +
        '• 📈 **Price trends** — e.g. "Trend for houses in Ludhiana, Punjab"\n' +
        '• 🏙️ **Investment advice** — e.g. "Best areas to invest in Punjab"\n' +
        '• 💡 **Price per sqft** — e.g. "Price per sqft in Mohali"\n' +
        '• 📊 **Market statistics**\n\n' +
        'What are you looking for today?';
    }

    case 'emi': {
      const loanAmt = priceVal || extractNumber(msg);
      if (!loanAmt || loanAmt < 10000) {
        return '🏦 **Home Loan EMI Calculator**\n\n' +
          'To calculate EMI, please share:\n' +
          '• **Loan amount** (e.g. "50 lakh", "1 crore")\n' +
          '• **Interest rate** (optional, default 8.5% p.a.)\n' +
          '• **Loan tenure** (optional, default 20 years)\n\n' +
          'Formula used: **EMI = P × r × (1+r)ⁿ / ((1+r)ⁿ − 1)**\n' +
          'where r = monthly rate, n = total months\n\n' +
          'Example: *"EMI for 60 lakh loan at 8.5% for 20 years"*';
      }

      const rateMatch   = msg.match(/(\d+\.?\d*)\s*%/);
      const tenureMatch = msg.match(/(\d+)\s*(year|yr)/i);
      const rate   = rateMatch   ? parseFloat(rateMatch[1])  : 8.5;
      const tenure = tenureMatch ? parseInt(tenureMatch[1])  : 20;

      // Standard EMI formula
      const emi      = calcEMI(loanAmt, rate, tenure);
      const total    = emi * tenure * 12;
      const interest = total - loanAmt;
      const downPmt  = loanAmt * 0.2; // typical 20% down payment

      return '🏦 **EMI Calculation Result**\n\n' +
        '| Detail | Amount |\n|---|---|\n' +
        `| Loan Amount | **${fmt(loanAmt, 'sale')}** |\n` +
        `| Interest Rate | **${rate}% p.a. (${(rate/12).toFixed(3)}% monthly)** |\n` +
        `| Tenure | **${tenure} years (${tenure*12} months)** |\n` +
        `| **Monthly EMI** | **₹${Math.round(emi).toLocaleString('en-IN')}** |\n` +
        `| Total Payment | ₹${Math.round(total).toLocaleString('en-IN')} |\n` +
        `| Total Interest Paid | ₹${Math.round(interest).toLocaleString('en-IN')} |\n` +
        `| Suggested Down Payment (20%) | ₹${Math.round(downPmt).toLocaleString('en-IN')} |\n\n` +
        `📊 **EMI Breakdown:** Principal = ${Math.round((loanAmt/total)*100)}% | Interest = ${Math.round((interest/total)*100)}% of total\n\n` +
        '💡 *Tip: A 20% down payment reduces your EMI and saves significantly on interest. Want me to recalculate with different terms?*';
    }

    case 'trend': {
      // Require state + district + type for accurate trends
      const d = district || null;
      const s = state || (d ? 'punjab' : null);
      const t = type || 'house';

      if (!d) {
        return '📊 **Price Trend Analysis**\n\n' +
          'For accurate trend data, please specify:\n' +
          '• **State** (e.g. Punjab, Maharashtra)\n' +
          '• **District** (e.g. Ludhiana, Amritsar, Mohali)\n' +
          '• **Property Type** (house, apartment, villa, plot)\n\n' +
          'Example: *"Price trend for houses in Ludhiana, Punjab"*\n' +
          '*"Apartment trend in Mohali over last 12 months"*';
      }

      const rows = db.prepare(
        `SELECT month, year, avg_price FROM price_history
         WHERE district LIKE ? AND property_type=? ORDER BY year, month LIMIT 16`
      ).all(`%${d}%`, t);

      if (rows.length === 0) {
        return `📊 No trend data found for ${d} — ${t}.\n\nTry the **Price Trends** page for interactive charts with all districts.`;
      }

      const first = rows[0].avg_price;
      const last  = rows[rows.length-1].avg_price;
      const change = ((last - first) / first * 100).toFixed(1);
      const trend  = Number(change) > 0 ? '📈 Upward' : '📉 Downward';

      // Calculate growth per year
      const months  = rows.length;
      const annualGrowth = ((Math.pow(last / first, 12 / months) - 1) * 100).toFixed(1);

      // Real price per sqft from actual properties
      const realPpsf = db.prepare(
        `SELECT AVG(CAST(price AS REAL) / NULLIF(area, 0)) as ppsf
         FROM properties WHERE status='active' AND district LIKE ? AND type=? AND area > 0`
      ).get(`%${d}%`, t);
      const ppsfValue = realPpsf?.ppsf ? Math.round(realPpsf.ppsf) : last;

      const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const preview = rows.slice(-6).map(r =>
        `${MONTH_NAMES[r.month-1]} ${r.year}: ₹${r.avg_price.toLocaleString('en-IN')}/sqft`
      ).join('\n');

      // Investment advice based on trend
      let advice = '';
      if (Number(annualGrowth) > 10) {
        advice = '🔥 **Strong Buy** — High appreciation zone. Ideal for long-term capital gains.';
      } else if (Number(annualGrowth) > 5) {
        advice = '✅ **Good Investment** — Steady growth above inflation. Suitable for buy-and-hold.';
      } else if (Number(annualGrowth) > 0) {
        advice = '⚠️ **Moderate** — Mild appreciation. Consider rental yield alongside capital gains.';
      } else {
        advice = '📉 **Caution** — Prices declining. Wait for stabilization before investing.';
      }

      return `📊 **Price Trend — ${d.charAt(0).toUpperCase()+d.slice(1)} | ${t} | ${months} months**\n\n` +
        `| Metric | Value |\n|---|---|\n` +
        `| Overall Trend | **${trend} (${Number(change) >= 0?'+':''}${change}%)** |\n` +
        `| Annualized Growth | **${annualGrowth}% per year** |\n` +
        `| Avg Price/sqft (history) | **₹${last.toLocaleString('en-IN')}/sqft** |\n` +
        `| Avg Price/sqft (real listings) | **₹${ppsfValue.toLocaleString('en-IN')}/sqft** |\n` +
        `| Starting Price | ₹${first.toLocaleString('en-IN')}/sqft |\n\n` +
        `📅 **Recent 6 months:**\n${preview}\n\n` +
        `💡 **Investment Advice:** ${advice}\n\n` +
        '👉 Visit the **Price Trends** page for interactive line & bar charts!';
    }

    case 'investment': {
      // Fully DB-driven investment advice
      const topDistricts = db.prepare(
        `SELECT district,
           COUNT(*) as listings,
           AVG(price) as avg_price,
           SUM(CASE WHEN listing='sale' THEN 1 ELSE 0 END) as sale_count,
           SUM(CASE WHEN listing='rent' THEN 1 ELSE 0 END) as rent_count
         FROM properties WHERE status='active'
         GROUP BY district ORDER BY listings DESC LIMIT 8`
      ).all();

      if (topDistricts.length === 0) {
        return '🏙️ No investment data available yet. List more properties to enable AI analysis!';
      }

      // Get price trends to determine growth rates
      const trendData = db.prepare(
        `SELECT district, AVG(avg_price) as avg_hist_price,
           MAX(avg_price) as peak_price, MIN(avg_price) as base_price
         FROM price_history WHERE property_type='house'
         GROUP BY district`
      ).all();
      const trendMap = Object.fromEntries(trendData.map(t => [t.district, t]));

      const ranked = topDistricts.map(d => {
        const tr = trendMap[d.district];
        const growth = tr ? ((tr.peak_price - tr.base_price) / tr.base_price * 100).toFixed(1) : null;
        const demandScore = d.listings + (d.rent_count * 0.5); // rental demand adds value
        return { ...d, growth, demandScore };
      }).sort((a, b) => b.demandScore - a.demandScore);

      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];
      const list = ranked.map((d, i) => {
        const growthStr = d.growth ? ` | 📈 ${d.growth}% growth` : '';
        const rentStr   = d.rent_count > 0 ? ` | 🏠 ${d.rent_count} rentals` : '';
        return `${medals[i]} **${d.district}** — ${d.listings} listings | Avg: ${fmt(Math.round(d.avg_price), 'sale')}${growthStr}${rentStr}`;
      }).join('\n');

      return '🏙️ **Best Investment Areas — Based on Live Data**\n\n' +
        `*Ranked by listing density, demand & price growth*\n\n${list}\n\n` +
        '📊 **Key Insights:**\n' +
        `• **High Demand:** ${ranked[0]?.district} leads with ${ranked[0]?.listings} active listings\n` +
        `• **Rental Market:** ${ranked.filter(d => d.rent_count > 0).map(d => d.district).slice(0,3).join(', ')} have strong rental demand\n` +
        `• **Price Growth:** ${ranked.filter(d => d.growth && Number(d.growth) > 5).map(d => `${d.district} (${d.growth}%)`).slice(0,2).join(', ') || 'See Price Trends page for growth data'}\n\n` +
        '💡 *For specific district trends, ask: "Price trend for houses in [District]"*';
    }

    case 'stats': {
      const stats = db.prepare(
        `SELECT COUNT(*) as total,
           SUM(CASE WHEN listing='sale' THEN 1 ELSE 0 END) as sale,
           SUM(CASE WHEN listing='rent' THEN 1 ELSE 0 END) as rent,
           AVG(CASE WHEN area > 0 THEN CAST(price AS REAL)/area END) as avg_ppsf
         FROM properties WHERE status='active'`
      ).get();
      const districts = db.prepare("SELECT COUNT(DISTINCT district) as c FROM properties WHERE status='active'").get().c;
      const states    = db.prepare("SELECT COUNT(DISTINCT state) as c FROM properties WHERE status='active'").get().c;
      const featured  = db.prepare("SELECT COUNT(*) as c FROM properties WHERE featured=1 AND status='active'").get().c;
      const avgPpsf   = stats.avg_ppsf ? Math.round(stats.avg_ppsf) : 0;

      return '📊 **PropEstate360 Market Overview**\n\n' +
        '| Metric | Value |\n|---|---|\n' +
        `| Total Active Listings | **${stats.total}** |\n` +
        `| For Sale | **${stats.sale}** |\n` +
        `| For Rent | **${stats.rent}** |\n` +
        `| Featured Properties | **${featured}** |\n` +
        `| Districts Covered | **${districts}** |\n` +
        `| States Covered | **${states}** |\n` +
        `| Avg Price/sqft (all) | **₹${avgPpsf.toLocaleString('en-IN')}** |\n\n` +
        '🏘️ Growing database with properties across India!';
    }

    case 'price_per_sqft': {
      const d = district || null;
      const s = state || null;

      if (!d && !s) {
        return '💡 **Price Per Square Foot Calculator**\n\n' +
          'Formula: **Price per sqft = Total Price ÷ Area (sqft)**\n\n' +
          'Specify a location for accurate data:\n' +
          'Example: *"Price per sqft in Ludhiana"* or *"Rate per sqft for apartments in Mohali"*';
      }

      let sql = `SELECT
          COUNT(*) as count,
          AVG(CAST(price AS REAL) / NULLIF(area, 0)) as avg_ppsf,
          MIN(CAST(price AS REAL) / NULLIF(area, 0)) as min_ppsf,
          MAX(CAST(price AS REAL) / NULLIF(area, 0)) as max_ppsf
        FROM properties WHERE status='active' AND area > 0`;
      const params = [];
      if (s)    { sql += ' AND state LIKE ?';    params.push(`%${s}%`); }
      if (d)    { sql += ' AND district LIKE ?'; params.push(`%${d}%`); }
      if (type) { sql += ' AND type=?';          params.push(type); }

      const res = db.prepare(sql).get(...params);
      if (!res.count || res.count === 0) {
        return `❌ No property data found for ${d || s} to calculate price per sqft.\n\nTry the **Price Trends** page for historical averages.`;
      }

      const loc = d ? d.charAt(0).toUpperCase()+d.slice(1) : s?.charAt(0).toUpperCase()+s?.slice(1);
      return `💰 **Price Per Sqft — ${loc}${type ? ` (${type})` : ''}**\n\n` +
        `Formula: Total Price ÷ Area in sqft\n\n` +
        `| | Rate |\n|---|---|\n` +
        `| Average | **₹${Math.round(res.avg_ppsf).toLocaleString('en-IN')}/sqft** |\n` +
        `| Minimum | **₹${Math.round(res.min_ppsf).toLocaleString('en-IN')}/sqft** |\n` +
        `| Maximum | **₹${Math.round(res.max_ppsf).toLocaleString('en-IN')}/sqft** |\n` +
        `| Based on | **${res.count} listings** |\n\n` +
        '📈 Check **Price Trends** for historical price/sqft data per district.';
    }

    case 'search': {
      const filters = {};
      if (state)    filters.state    = state;
      if (district) filters.district = district;
      if (type)     filters.type     = type;
      if (listing)  filters.listing  = listing;
      if (beds)     filters.beds     = beds;

      // Price resolution: current message > history context
      if (priceVal) {
        if (/under|below|max|budget/i.test(msg)) filters.maxPrice = priceVal;
        else if (/above|more than|min/i.test(msg)) filters.minPrice = priceVal;
        else filters.maxPrice = priceVal * 1.2;
      } else if (histMaxPrice) {
        filters.maxPrice = histMaxPrice;
      } else if (histMinPrice) {
        filters.minPrice = histMinPrice;
      }

      const results = getProps(filters);
      if (results.length === 0) {
        return `🔍 No properties found matching your criteria${district ? ` in ${district}` : ''}.\n\n` +
          'Try:\n• Broader location\n• Different property type\n• Higher budget range\n\nOr visit the **Properties** page for advanced filters.';
      }

      const filterDesc = [
        state    && `in **${state}**`,
        district && `district: **${district}**`,
        type     && `type: **${type}**`,
        listing  && `for **${listing}**`,
        beds     && `**${beds}BHK+**`,
        (filters.maxPrice) && `budget: **${fmt(filters.maxPrice, listing||'sale')}**`,
      ].filter(Boolean).join(', ');

      return `🔍 **Found ${results.length} properties${filterDesc ? ` (${filterDesc})` : ''}:**\n\n` +
        results.map(propCard).join('\n') +
        '\n\n👉 Visit the **Properties** page for full details, photos & to contact agents!';
    }

    case 'price_query': {
      const d = district || null;
      const s = state || null;
      let sql = `SELECT AVG(price) as avg, MIN(price) as min, MAX(price) as max,
          AVG(CASE WHEN area > 0 THEN CAST(price AS REAL)/area END) as avg_ppsf
         FROM properties WHERE status='active'`;
      const params = [];
      if (s)       { sql += ' AND state LIKE ?';    params.push(`%${s}%`); }
      if (d)       { sql += ' AND district LIKE ?'; params.push(`%${d}%`); }
      if (type)    { sql += ' AND type=?';          params.push(type); }
      if (listing) { sql += ' AND listing=?';       params.push(listing); }

      const stats = db.prepare(sql).get(...params);
      if (!stats || stats.avg === null || stats.avg === undefined) {
        const loc = d || s || 'the specified filters';
        return `💰 No active listings found for ${loc}. Try broadening your search or checking the Properties page.`;
      }
      const ppsfStr = stats.avg_ppsf ? ` | Avg ₹${Math.round(stats.avg_ppsf).toLocaleString('en-IN')}/sqft` : '';
      const loc = d || s || 'all locations';
      return `💰 **Property Prices — ${loc}**\n\n` +
        `| | Price |\n|---|---|\n` +
        `| Average | **${fmt(Math.round(stats.avg||0), listing||'sale')}${ppsfStr}** |\n` +
        `| Minimum | **${fmt(stats.min||0, listing||'sale')}** |\n` +
        `| Maximum | **${fmt(stats.max||0, listing||'sale')}** |\n\n` +
        '📈 Check the **Price Trends** page for historical data and charts.';
    }

    case 'help': {
      return '📋 **How to use PropEstate360:**\n\n' +
        '**🔍 Find Properties:**\n• *"Find 3BHK house in Ludhiana under 80 lakh"*\n• Use filters on the Properties page\n\n' +
        '**💰 EMI Calculator:**\n• *"EMI for 60 lakh at 8.5% for 20 years"*\n• Formula: P×r×(1+r)ⁿ / ((1+r)ⁿ−1)\n\n' +
        '**📊 Price Trends:**\n• *"Price trend for apartments in Mohali, Punjab"*\n• Requires: State + District + Property Type\n\n' +
        '**💡 Price Per Sqft:**\n• *"Price per sqft in Amritsar"*\n• Formula: Total Price ÷ Area\n\n' +
        '**🏙️ Investment Advice:**\n• *"Best areas to invest in Punjab"*\n• Based on live DB data & trends\n\n' +
        '**📝 List Property:**\n• Register/Login → Click "List Property"\n• Select your actual state & district\n\n' +
        'What would you like to do?';
    }

    case 'thanks':
      return '😊 You\'re welcome! I\'m here anytime for real estate queries.\n\nIs there anything else I can help with — property search, EMI, trends, or investment advice?';

    default: {
      // Try to do a property search using merged context (current + history)
      if (district || type || state || beds || histMaxPrice) {
        const filters = { district, type, listing, state };
        if (beds)         filters.beds     = beds;
        if (histMaxPrice) filters.maxPrice = histMaxPrice;
        if (histMinPrice) filters.minPrice = histMinPrice;
        const results = getProps(filters);
        if (results.length > 0) {
          const contextUsed = [
            state    && state,
            district && district,
            type     && type,
            beds     && `${beds}BHK`,
            histMaxPrice && `under ${fmt(histMaxPrice, listing||'sale')}`,
          ].filter(Boolean).join(', ');
          return `🏘️ **Here are properties matching your context${contextUsed ? ` (${contextUsed})` : ''}:**\n\n` +
            results.slice(0,3).map(propCard).join('\n') +
            '\n\n💬 Need more help? Ask me about:\n• EMI calculation\n• Price trends (specify state + district + type)\n• Price per sqft\n• Investment advice';
        }
      }

      return '🤔 I\'m not sure I understood that. Here\'s what I can help with:\n\n' +
        '• **"Find 3BHK in Ludhiana under 80 lakh"** — property search\n' +
        '• **"EMI for 50 lakh at 8.5% for 20 years"** — loan calculator\n' +
        '• **"Price trend for houses in Amritsar, Punjab"** — market data (need state+district+type)\n' +
        '• **"Price per sqft in Mohali"** — sqft rate calculator\n' +
        '• **"Best areas to invest in Punjab"** — investment advice\n' +
        '• **"How many properties are listed?"** — statistics\n\n' +
        'Try one of these or rephrase your question!';
    }
  }
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
router.post('/chat', (req, res) => {
  const { message, history } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  try {
    const reply = processMessage(message.trim(), history || []);
    res.json({ success: true, reply, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[AI Error]', err);
    res.status(500).json({ error: 'AI processing error', reply: 'Sorry, I encountered an error. Please try again!' });
  }
});

module.exports = router;
