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

function findBestLocationMatch(text, list) {
  const normalized = text.toLowerCase();
  const sorted = [...list].sort((a, b) => b.length - a.length);
  for (const term of sorted) {
    const escaped = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(normalized)) return term;
  }
  return null;
}

function getProps(filters = {}, limit = 5) {
  let sql = "SELECT * FROM properties WHERE status='active'";
  const p = [];
  if (filters.state)    { sql += ' AND state LIKE ? COLLATE NOCASE';    p.push(`%${filters.state}%`); }
  if (filters.district) { sql += ' AND district LIKE ? COLLATE NOCASE'; p.push(`%${filters.district}%`); }
  if (filters.locality) { sql += ' AND locality LIKE ? COLLATE NOCASE'; p.push(`%${filters.locality}%`); }
  if (filters.type)     { sql += ' AND type=?';          p.push(filters.type); }
  if (filters.listing)  { sql += ' AND listing=?';       p.push(filters.listing); }
  if (filters.maxPrice) { sql += ' AND price<=?';        p.push(filters.maxPrice); }
  if (filters.minPrice) { sql += ' AND price>=?';        p.push(filters.minPrice); }
  if (filters.beds)     { sql += ' AND beds>=?';         p.push(filters.beds); }
  sql += ` ORDER BY featured DESC, created_at DESC LIMIT ${Number(limit)}`;
  return db.prepare(sql).all(...p);
}

function propCard(p) {
  const ppsf = calcPricePerSqft(p.price, p.area);
  const ppsfStr = ppsf ? ` | ₹${ppsf.toLocaleString('en-IN')}/sqft` : '';
  const bedsStr = (p.beds && p.beds > 0) ? ` | 🛏 ${p.beds} BHK` : '';
  const areaStr = (p.area && p.area > 0) ? `, ${p.area} sqft` : '';
  return `• **${p.title}** — ${fmt(p.price, p.listing)} | 📍 ${p.locality}, ${p.district}${ppsfStr}${bedsStr}${areaStr}`;
}

// ── Intent detection ─────────────────────────────────────────────────────────
function detectIntent(msg) {
  const m = msg.toLowerCase();
  const hasPropertyTerm = /(property|properties|house|flat|apartment|villa|plot|shop|pg|rent|sale|home|real estate)/.test(m);
  const hasLocationPreposition = /\b(in|at|near|around|from|of|for)\b/.test(m);
  const hasPriceTerm = /(price|cost|rate|budget|expensive|cheap|affordable|lakh|crore)/.test(m);
  const hasTrendTerm = /(trend|increase|decrease|growth|appreciation|depreciation|history|over time|last|past)/.test(m);
  const hasInvestmentTerm = /(invest|investment|best area|good area|profitable|return|roi|advice|recommend)/.test(m);
  const hasStatsTerm = /(how many|total|count|statistics|overview|summary|market|data)/.test(m);
  const hasLocationTerm = !!(extractState(msg) || extractDistrict(msg));
  const hasListRequest = /\b(show|find|search|list|looking for|need|want|available|any)\b/i.test(m);
  const hasPlaceHint = hasLocationTerm || /\b(district|state|city|area|sector|colony|town)\b/i.test(m);

  if (/(?:^|\b)(hi|hello|hey|namaste|ssa|good\s*(morning|evening|afternoon)|how are you|what.?s up|start|begin)(?:\b|$)/i.test(m)) return 'greeting';
  if (/my (property|properties|listing|listings|home|house)|properties i.*(list|post|add|upload|own|have)/i.test(m)) return 'my_properties';
  if (/\bemi\b|loan|mortgage|finance|monthly.*(pay|install)|installment|home loan/i.test(m)) return 'emi';
  if (hasTrendTerm && (hasPropertyTerm || hasLocationPreposition || hasLocationTerm)) return 'trend';
  if (hasInvestmentTerm && (hasLocationPreposition || hasPropertyTerm)) return 'investment';
  if (/compare|vs\.?|versus|differ|between|which is better/i.test(m)) return 'compare';
  if (hasStatsTerm && (hasPropertyTerm || /market|database|listings/i.test(m))) return 'stats';
  if (/website|platform|features|about|what.*do|how.*works?|pages|navigation/i.test(m)) return 'website_info';
  if ((hasPropertyTerm && (hasLocationPreposition || hasLocationTerm)) ||
      (hasListRequest && (hasPlaceHint || hasLocationPreposition)) ||
      /(show|find|search|list|looking for|need|want|available|any).*(property|house|flat|apartment|villa|plot|shop|pg|rent|buy|sale|home)/i.test(m) ||
      /(what|which|any).*(available|listed|there|find|get).*(in|at|near|for)/i.test(m) ||
      /(available|listed|properties|houses|flats|apartments|villas|plots|shops).*(in|at|near|around)/i.test(m) ||
      /(property|house|flat|apartment|villa|plot|shop|pg|home).*(in|at|near|around|from)/.test(m) ||
      /\d+\s*(bhk|bedroom|bed)/.test(m) ||
      (hasPropertyTerm && hasLocationTerm) ||
      (hasListRequest && hasLocationTerm) ||
      (hasLocationTerm && !hasInvestmentTerm && !hasTrendTerm) ||
      /(buy|sell|rent|lease).*(property|house|flat|apartment|villa|plot|shop|pg|home)/.test(m)) return 'search';
  if (/price per sq|price.sqft|sqft rate|per sq|rate per sq/i.test(m)) return 'price_per_sqft';
  if (hasPriceTerm && (hasPropertyTerm || hasLocationPreposition)) return 'price_query';
  if (/(?:how.*(?:work|use|post|add|register|login|signup|account)|what is propestate|explain|help me|guide|tutorial)/i.test(m)) return 'help';
  if (/thank|great|awesome|nice|good bot|helpful|appreciate/i.test(m)) return 'thanks';
  return 'general';
}

// ── Extractors ────────────────────────────────────────────────────────────────
// COMPREHENSIVE DISTRICTS FOR ALL INDIAN STATES (Updated 2026)
const DISTRICTS = [
  // Punjab (25)
  'amritsar','bathinda','jalandhar','ludhiana','patiala','mohali','gurdaspur',
  'hoshiarpur','faridkot','mansa','moga','pathankot','ferozepur','kapurthala',
  'sangrur','tarn taran','rupnagar','barnala','fazilka','malerkotla','fatehgarh sahib',
  'muktsar','nawanshahr','fatehgarh','sas nagar','sahibzada ajit singh nagar',
  // Haryana (23)
  'gurgaon','gurugram','faridabad','panipat','ambala','yamunanagar','rohtak','hisar',
  'karnal','sonipat','panchkula','sirsa','bhiwani','jhajjar','mahendragarh','rewari',
  'jind','fatehabad','kaithal','palwal','charkhi dadri','nuh','tohana',
  // Delhi (12)
  'central delhi','east delhi','new delhi','north delhi','north east delhi','north west delhi',
  'south delhi','south east delhi','south west delhi','west delhi','shahdara','karol bagh',
  // Maharashtra (36)
  'mumbai','mumbai suburban','pune','nagpur','thane','nashik','aurangabad','solapur','kolhapur','amravati',
  'nanded','sangli','jalgaon','akola','latur','dhule','buldhana','chandrapur','parbhani','beed',
  'satara','raigad','ratnagiri','sindhudurg','hingoli','washim','gondia','washim','jalna','yavatmal',
  // Karnataka (31)
  'bangalore','bengaluru','mysore','hubli','mangalore','belgaum','gulbarga','davangere',
  'bellary','bijapur','shimoga','tumkur','raichur','bidar','hosapete','gadag','kolar','udupi',
  'uttara kannada','kodagu','chikmagalur','shivamogga','dakshina kannada','chikkaballapur','chamarajanagar','koppal',
  // Gujarat (33)
  'ahmedabad','surat','vadodara','rajkot','bhavnagar','jamnagar','junagadh','gandhinagar',
  'anand','navsari','morbi','nadiad','surendranagar','bharuch','mehsana','valsad','porbandar',
  'amreli','botad','patan','savli','kheda','banaskantha','devbhumi dwarka','kutch','gir somnath','chhota udaipur',
  // Rajasthan (33)
  'jaipur','jodhpur','kota','bikaner','ajmer','udaipur','bhilwara','alwar','bharatpur',
  'sikar','pali','ganganagar','chittorgarh','barmer','jhunjhunu','tonk','dungarpur','banswara',
  'hanumangarh','nagaur','sawai madhopur','pratapgarh','baran','dholpur','karauli','dausa','jaisalmer',
  // Uttar Pradesh (75)
  'lucknow','kanpur','ghaziabad','agra','meerut','varanasi','allahabad','bareilly','moradabad',
  'aligarh','gorakhpur','saharanpur','jhansi','rampur','firozabad','muzaffarnagar','mathura',
  'etah','bulandshahr','farukhabad','etawah','mainpuri','auraiya','fatehpur','banda','chitrakoot',
  'kaushambi','mirzapur','sonbhadra','azamgarh','mau','ballia','deoria','gonda','barabanki',
  'sultanpur','raibareli','ambedkar nagar','siddharthnagar','basti','sant kabir nagar','maharajganj',
  'kushinagar','shravasti','balrampur','lap','pilibhit','shahjahanpur','hardoi','unnao','lucknow',
  'sitapur','lakhimpur kheri','kheri','kanpur','jajmau','bijnor','sambhal','hathras','shamli',
  // Tamil Nadu (38)
  'chennai','coimbatore','madurai','tiruchirappalli','salem','tirunelveli','tiruppur','vellore',
  'thoothukkudi','erode','tiruvannamalai','kanchipuram','karur','namakkal','dharmapuri','krishnagiri',
  'ranipet','chengalpattu','villupuram','cuddalore','tiruvannamalai','kallakurichi','perambalur','ariyalur',
  'sivaganga','ramanathapuram','pudukkottai','virudunagar','tenkasi','kanyakumari','mayiladuthurai','nagapattinam',
  // West Bengal (23)
  'kolkata','howrah','durgapur','asansol','siliguri','kharagpur','haldia','raiganj','jhargram',
  'balurghat','malda','berhampore','suri','jangipur','bishnupur','rampurhat','krishnanagar',
  'nadia','purba medinipur','paschim medinipur','darjeeling','jalpaiguri','cooch behar','uttar dinajpur','dakshin dinajpur',
  // Telangana (33)
  'hyderabad','warangal','nizamabad','khammam','karimnagar','ramagundam','mahbubnagar','nalgonda',
  'adilabad','suryapet','miryalaguda','jagtial','kamareddy','wanaparthy','kothagudem','bodhan',
  'asifabad','nirmal','tandur','vikarabadh','medchal','ranga reddy','yadadri bhuvanagiri','medak',
  'siddipet','jangaon','bhongir','narayanpet','peddapalli','rajanna sircilla','vikarabad','dubbak',
  // Andhra Pradesh (26)
  'visakhapatnam','vijayawada','guntur','nellore','kurnool','rajahmundry','tirupati','kadapa',
  'anantapur','eluru','ongole','nandyal','machilipatnam','tenali','proddatur','chittoor','hindupur',
  'srikakulam','parvatipuram','anakapalli','vizianagaram','srikakullam','west godavari','east godavari',
  // Kerala (14)
  'thiruvananthapuram','kochi','kozhikode','kollam','thrissur','palakkad','alappuzha','kottayam',
  'kannur','malappuram','ernakulam','idukki','kasaragod','pathanamthitta','wayanad',
  // Madhya Pradesh (52)
  'bhopal','indore','jabalpur','gwalior','ujjain','sagar','dewas','satna','ratlam','rewa','murwara',
  'singrauli','burhanpur','khandwa','bhind','guna','shivpuri','vidisha','chhindwara','chhatarpur',
  'damoh','panna','katni','mandla','balaghat','seoni','narsinghpur','dindori','hoshangarabad',
  'narmadapuram','betul','harda','dhar','indore','khargone','khandwa','barwani','timarni',
  'alirajpur','manawar','sendhwa','shujalpur','morena','datia','rehli','ashoknagar',
  // Bihar (38)
  'patna','gaya','bhagalpur','muzaffarpur','darbhanga','bihar sharif','arrah','begusarai','katihar',
  'munger','chhapra','danapur','bettiah','saharsa','sasaram','hajipur','dehri','siwan','motihari',
  'east champaran','west champaran','madhubani','supaul','araria','kishanganj','purnia','khagaria',
  'lakhisarai','jamui','shekhpura','nalanda','buxar','rohtash','gopalganj','madhepura',
  // Odisha (30)
  'bhubaneswar','cuttack','rourkela','berhampur','sambalpur','puri','balasore','bhadrak','baripada',
  'jeypore','brahmapur','jharsuguda','dhenkanal','barbil','angul','talcher','sundargarh','rayagada',
  'koraput','nabarangpur','kalahandi','nuapada','balangir','sonepur','bolangir','bargarh',
  'jharsuguda','sundargarh','keonjhar','mayurbhanj','jajpur','kendrapara',
  // Jharkhand (24)
  'ranchi','dhanbad','giridih','bokaro','hazaribag','koderma','east singhbhum','west singhbhum',
  'jamshedpur','singhbhum','east singhbhum','chaibasa','noamundi','ramgarh','daltonganj',
  'medininagar','chatra','palamu','latehar','dumka','deoghar','pakur','sahibganj','godda',
  // Chhattisgarh (28)
  'raipur','bilaspur','durg','rajnandgaon','jagdalpur','raigarh','korba','chanda','chandrapur',
  'dhamtari','mahasamund','manpur','mungeli','kawardha','rajnandgaon','balrampur','manendragarh',
  'narayanpur','dantewada','bijapur','bastar','kanker','antagarh','sukma','gariaband',
  // Uttarakhand (13)
  'dehradun','haldwani','rishikesh','haridwar','almora','nainital','pithoragarh','rudraprayag',
  'chamoli','uttarkashi','mussourie','tehri','pauri',
  // Himachal Pradesh (12)
  'shimla','mandi','kangra','solan','sirmour','kinnaur','lahaul spiti','chamba','kullu',
  'bilaspur','hamirpur','una',
  // Jammu & Kashmir (20)
  'srinagar','jammu','anantnag','baramulla','samba','kathua','udhampur','kishtwar','leh',
  'kargil','doda','ganderbal','bandipora','shopian','pulwama','budgam','kulgam',
  // Goa (2)
  'north goa','south goa',
  // Puducherry (4)
  'puducherry','yanam','karaikal','mahe',
  // Chandigarh (1)
  'chandigarh',
  // Assam (33)
  'guwahati','silchar','barpeta','nagaon','sonitpur','karbi anglong','kamrup','udalguri',
  'baksa','chirang','bongaigaon','dhubri','goalpara','kamrup','nalbari','darrang','marigaon',
  'nagaon','morigaon','sonitpur','lakhimpur','dhemaji','tinsukia','dibrugarh','sivasagar',
  'jorhat','golaghat','sibsagar','cachar','hailakandi','karimganj',
  // Manipur (16)
  'imphal','bishnupur','thoubal','ukhrul','churachandpur','chandel','senapati','tamenglong',
  'jiribam','moirang','lilong',
  // Meghalaya (11)
  'shillong','cherrapunji','tura','nongpoh','jaintia hills','east khasi hills','west khasi hills',
  'east garo hills','west garo hills','south garo hills',
  // Mizoram (11)
  'aizawl','lunglei','saiha','mamit','serchhip','champhai','kolasib','lawngtlai','siaha',
  // Nagaland (11)
  'kohima','dimapur','mon','wokha','zunheboto','mokokchung','tuensang','longleng','peren',
  // Sikkim (4)
  'gangtok','namchi','gyalshing','mangan',
  // Arunachal Pradesh (25)
  'itanagar','naharlagun','ziro','tezu','changlang','lohit','papum pare','lower dibang valley',
  'upper dibang valley','west kameng','east kameng','tawang','kurung kumey','kra daadi',
  'lower subansiri','upper subansiri','west siang','east siang','siang','dibang valley',
  // Tripura (4)
  'agartala','udaipur','aizawl','khowai',
];

const STATES = [
  'punjab','maharashtra','gujarat','rajasthan','delhi','haryana','karnataka',
  'tamil nadu','uttar pradesh','west bengal','bihar','madhya pradesh','andhra pradesh',
  'telangana','kerala','odisha','jharkhand','chhattisgarh','uttarakhand','himachal pradesh',
  'jammu and kashmir','goa','puducherry','chandigarh','dadra and nagar haveli','daman and diu',
  'lakshadweep','andaman and nicobar islands','sikkim','arunachal pradesh','nagaland','manipur',
  'mizoram','tripura','meghalaya','assam',
];

const dbLocations = {
  districts: new Set(),
  states: new Set(),
};

function normalizeLocationValue(value) {
  return value?.toString().trim().toLowerCase() || null;
}

function expandLocationAliases(values) {
  const expanded = new Set();
  for (const value of values) {
    const normalized = normalizeLocationValue(value);
    if (!normalized) continue;
    expanded.add(normalized);
    const aliasMatches = normalized.match(/\(([^)]+)\)/g);
    if (aliasMatches) {
      aliasMatches.forEach(alias => {
        expanded.add(alias.slice(1, -1).trim());
      });
    }
    if (normalized.includes(',')) {
      normalized.split(',').map(s => s.trim()).forEach(v => { if (v) expanded.add(v); });
    }
    if (normalized.includes('/')) {
      normalized.split('/').map(s => s.trim()).forEach(v => { if (v) expanded.add(v); });
    }
  }
  return Array.from(expanded);
}

function loadDatabaseLocations() {
  try {
    const dbDistricts = db.prepare(
      "SELECT DISTINCT district FROM properties WHERE district IS NOT NULL AND TRIM(district) != ''"
    ).all();
    const dbStates = db.prepare(
      "SELECT DISTINCT state FROM properties WHERE state IS NOT NULL AND TRIM(state) != ''"
    ).all();

    expandLocationAliases(dbDistricts.map(r => r.district)).forEach(name => dbLocations.districts.add(name));
    expandLocationAliases(dbStates.map(r => r.state)).forEach(name => dbLocations.states.add(name));
  } catch (err) {
    console.error('[AI] Failed to load DB location values', err);
  }
}

function getCombinedLocationList(staticList, dbSet) {
  return Array.from(new Set([...staticList.map(v => v.toLowerCase()), ...dbSet]));
}

loadDatabaseLocations();

const COMBINED_DISTRICTS = getCombinedLocationList(DISTRICTS, dbLocations.districts);
const COMBINED_STATES = getCombinedLocationList(STATES, dbLocations.states);

function extractDistrict(msg) {
  return findBestLocationMatch(msg, COMBINED_DISTRICTS);
}

function extractState(msg) {
  return findBestLocationMatch(msg, COMBINED_STATES);
}

function extractLocationHint(msg) {
  const lower = msg.toLowerCase();
  const parts = lower.split(/\b(?:in|at|near|around|from|of)\b/);
  if (parts.length < 2) return null;
  const tail = parts[parts.length - 1].trim();
  if (!tail) return null;
  const stop = tail.split(/\b(?:for|properties|property|house|flat|apartment|villa|plot|shop|pg|rent|sale|buy|sell|list|looking|need|want|under|above|below|budget|with|and|or|to|in|near)\b/i)[0].trim();
  if (!stop) return null;
  const cleaned = stop.replace(/[^a-z0-9\s]/g, '').trim();
  return cleaned || null;
}

function extractType(msg) {
  const m = msg.toLowerCase();
  const types = ['villa','apartment','flat','plot','land','shop','commercial','warehouse','pg','paying guest','house','bungalow','bhk'];
  const matches = types.filter(t => m.includes(t));
  if (matches.length === 0) return null;
  const last = matches.reduce((a, b) => m.lastIndexOf(a) > m.lastIndexOf(b) ? a : b);
  if (last === 'flat' || last === 'apartment') return 'apartment';
  if (last === 'land') return 'plot';
  if (last === 'paying guest') return 'pg';
  if (last === 'bungalow' || last === 'house' || last === 'bhk') return 'house';
  return last;
}

function extractListing(msg) {
  const m = msg.toLowerCase();
  const matches = ['rent','rental','lease','sale','sell','buy','purchase'].filter(t => m.includes(t));
  if (matches.length === 0) return null;
  const last = matches.reduce((a, b) => m.lastIndexOf(a) > m.lastIndexOf(b) ? a : b);
  if (['rent','rental','lease'].includes(last)) return 'rent';
  return 'sale';
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
  // Only scan user messages from history (skip AI responses), newest first
  const userMessages = history.filter(h => h.role === 'user').map(h => h.text || h.content || '').reverse();
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
function processMessage(userMsg, history = [], userId = null) {
  const msg      = userMsg.trim();
  const intent   = detectIntent(msg);

  // Extract from current message
  const curDistrict = extractDistrict(msg);
  const curState    = extractState(msg);
  const curType     = extractType(msg);
  const curListing  = extractListing(msg);
  const curBeds     = extractBeds(msg);
  const curPrice    = extractPrice(msg);

  console.log('[AI] processMessage', {
    message: msg,
    intent,
    district: curDistrict,
    state: curState,
    type: curType,
    listing: curListing,
    beds: curBeds,
    price: curPrice,
    historyLength: Array.isArray(history) ? history.length : 0,
  });

  // Extract accumulated context from conversation history
  const histCtx = extractContextFromHistory(history);

  // If the user explicitly mentions a location search but the current message
  // does not resolve to a known district or state, do not reuse an old
  // district/state from earlier conversation history.
  const hasLocationIndicator = /\b(in|at|near|around|from|of|district|state|city|area|sector|colony|town)\b/i.test(msg);
  const hasSearchRequest = /\b(show|find|search|list|looking for|need|want|available|any)\b/i.test(msg);
  if (hasSearchRequest && hasLocationIndicator && !curDistrict && !curState) {
    histCtx.district = null;
    histCtx.state = null;
  }

  // Merge: current message takes priority over history context
  let district = curDistrict || histCtx.district;
  let state    = curState    || histCtx.state;
  const type     = curType     || histCtx.type;
  const listing  = curListing  || histCtx.listing;
  const beds     = curBeds     || histCtx.beds;

  // If the current message names a district without a state, do not reuse a
  // previously mentioned state unless that district actually belongs to it.
  if (curDistrict && !curState && histCtx.state) {
    try {
      const row = db.prepare(
        `SELECT COUNT(*) as c FROM properties WHERE LOWER(district)=LOWER(?) AND LOWER(state)=LOWER(?)`
      ).get(curDistrict, histCtx.state);
      if (!row || row.c === 0) {
        state = null;
      }
    } catch (e) {
      state = null;
    }
  }

  // Price: current message overrides history
  let priceVal = curPrice;
  let histMaxPrice = histCtx.maxPrice;
  let histMinPrice = histCtx.minPrice;

  // If the user specified a state but did NOT specify a district in the current
  // message, avoid silently inheriting a district from history unless it is
  // clearly associated with the same state. This prevents queries like
  // "Show properties in Punjab" from being constrained to a previously
  // mentioned district in a different state.
  if (curState && !curDistrict && histCtx.district) {
    // If the history also contains a state and it doesn't match, drop district
    if (histCtx.state && histCtx.state.toLowerCase() !== curState.toLowerCase()) {
      district = null;
    } else {
      // Otherwise, verify the historical district actually belongs to the
      // requested state by checking the DB for any matching properties. If no
      // match, drop the district so the search uses only the state filter.
      try {
        const row = db.prepare(
          `SELECT COUNT(*) as c FROM properties WHERE LOWER(district)=LOWER(?) AND LOWER(state)=LOWER(?)`
        ).get(histCtx.district, curState);
        if (!row || row.c === 0) district = null;
      } catch (e) {
        // If DB check fails for any reason, be conservative and drop the district
        district = null;
      }
    }
  }

  switch (intent) {
    case 'greeting': {
      return '👋 **Sat Sri Akal!** Welcome to PropEstate360 — Your Complete Real Estate Companion!\n\n' +
        '🏠 **What I can help you with:**\n\n' +
        '🔍 **Property Search & Discovery**\n' +
        '• *"Find 3BHK house in Ludhiana under 80 lakh"*\n' +
        '• *"Show apartments in Gurgaon, Haryana"*\n' +
        '• *"Properties for rent in Bangalore"*\n\n' +
        '💰 **Financial Planning**\n' +
        '• *"EMI for 60 lakh at 8.5% for 20 years"* (Home loan calculator)\n' +
        '• *"Price per sqft in Mohali"* (Market rates)\n\n' +
        '📊 **Market Intelligence**\n' +
        '• *"Price trend for houses in Amritsar, Punjab"* (Historical data)\n' +
        '• *"Best areas to invest in Maharashtra"* (Investment advice)\n' +
        '• *"How many properties are listed?"* (Market statistics)\n' +
        '• *"Compare Ludhiana vs Amritsar"* (Location comparison)\n\n' +
        '🗺️ **Explore India**\n' +
        '• Browse properties across all states and districts\n' +
        '• Compare prices between cities\n' +
        '• View interactive trend charts\n' +
        '• **All 500+ Indian districts supported**\n\n' +
        '📱 **Website Features**\n' +
        '• **Properties Page**: Advanced filters & search\n' +
        '• **Price Trends**: Historical market data with charts\n' +
        '• **India Map**: Properties across all states\n' +
        '• **List Property**: Post your own listings\n' +
        '• **Dashboard**: Manage your account & listings\n\n' +
        '💡 **Pro Tips:**\n' +
        '• Be specific with location (city/district + state)\n' +
        '• Include budget, property type, or BHK for better results\n' +
        '• Ask about trends with "state + district + property type"\n' +
        '• Compare areas by mentioning multiple locations\n\n' +
        'What would you like to explore today? 🏡';
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
      // IMPROVED: More flexible trend analysis - works with just district OR state
      let d = district || null;
      let s = state || null;
      const t = type || 'house';

      // If we have just state, get top district in that state
      if (!d && s) {
        const topInState = db.prepare(
          `SELECT district FROM properties WHERE status='active' AND LOWER(state)=LOWER(?) GROUP BY district ORDER BY COUNT(*) DESC LIMIT 1`
        ).get(s);
        if (topInState) d = topInState.district;
      }

      // If we have state but no district data, provide general state insights
      if (!d && s) {
        // Get general market insights for the state
        const stateStats = db.prepare(
          `SELECT COUNT(*) as listings, AVG(price) as avg_price,
           AVG(CASE WHEN area > 0 THEN CAST(price AS REAL)/area END) as avg_ppsf
           FROM properties WHERE status='active' AND state LIKE ? COLLATE NOCASE AND type=?`
        ).get(`%${s}%`, t);

        if (stateStats?.listings > 0) {
          return `📊 **${s.charAt(0).toUpperCase() + s.slice(1)} — General Market Insights**\n\n` +
            `While we don't have specific trend data for ${s}, here's the current market snapshot:\n\n` +
            `| Metric | Value |\n|---|---|\n` +
            `| Active Listings | **${stateStats.listings}** |\n` +
            `| Average Price | **${fmt(Math.round(stateStats.avg_price), 'sale')}** |\n` +
            `| Average Price/sqft | **₹${Math.round(stateStats.avg_ppsf).toLocaleString('en-IN')}/sqft** |\n\n` +
            `💡 **General Real Estate Insights for ${s.charAt(0).toUpperCase() + s.slice(1)}:**\n\n` +
            `🏙️ **${s === 'maharashtra' ? 'Mumbai Metropolitan Region' : 
                  s === 'karnataka' ? 'Bangalore & Mysore Regions' :
                  s === 'gujarat' ? 'Ahmedabad & Surat Corridors' :
                  s === 'rajasthan' ? 'Jaipur & Jodhpur Areas' :
                  s === 'tamil nadu' ? 'Chennai & Coimbatore Regions' :
                  s === 'uttar pradesh' ? 'Lucknow & Noida-Greater Noida' :
                  s === 'west bengal' ? 'Kolkata Metropolitan Area' :
                  s === 'delhi' ? 'Delhi NCR' :
                  s === 'haryana' ? 'Gurgaon & Faridabad' :
                  s === 'punjab' ? 'Ludhiana & Amritsar' :
                  'Major urban centers'}** typically see:\n\n` +
            `• **Price Range**: ${s === 'maharashtra' || s === 'karnataka' || s === 'delhi' ? '₹1-5 Cr for 2-3BHK' : 
                               s === 'gujarat' || s === 'rajasthan' ? '₹50L-2Cr for 2-3BHK' :
                               s === 'punjab' || s === 'haryana' ? '₹40L-1.5Cr for 2-3BHK' :
                               '₹30L-1Cr for 2-3BHK'}\n` +
            `• **Rental Yield**: ${s === 'maharashtra' || s === 'karnataka' ? '2.5-4%' : 
                                s === 'delhi' || s === 'haryana' ? '3-5%' :
                                '2-4%'} annually\n` +
            `• **Growth Trend**: ${s === 'maharashtra' || s === 'karnataka' || s === 'haryana' ? 'Strong growth (6-10% YoY)' :
                                s === 'gujarat' || s === 'rajasthan' ? 'Moderate growth (4-7% YoY)' :
                                'Stable growth (3-6% YoY)'} in major cities\n\n` +
            `🎯 **Investment Potential**: ${s === 'maharashtra' ? 'High - Mumbai, Pune metro areas' :
                                        s === 'karnataka' ? 'High - Bangalore tech corridor' :
                                        s === 'gujarat' ? 'High - Ahmedabad, Surat industrial zones' :
                                        s === 'rajasthan' ? 'Medium-High - Jaipur tourism, Jodhpur heritage' :
                                        s === 'tamil nadu' ? 'High - Chennai IT, Coimbatore manufacturing' :
                                        s === 'uttar pradesh' ? 'Medium - Lucknow, Noida growth centers' :
                                        s === 'west bengal' ? 'Medium - Kolkata established market' :
                                        s === 'delhi' ? 'High - NCR development' :
                                        s === 'haryana' ? 'High - Gurgaon corporate hub' :
                                        s === 'punjab' ? 'Medium - Ludhiana industrial, Amritsar border trade' :
                                        'Medium - Emerging opportunities in tier-2 cities'}\n\n` +
            `📈 **For specific district trends** → Visit **Price Trends** page or ask: *"Trend in [District], ${s.charAt(0).toUpperCase() + s.slice(1)}"*`;
        }

        // No data at all for this state - provide general insights
        return `📊 **${s.charAt(0).toUpperCase() + s.slice(1)} — General Real Estate Insights**\n\n` +
          `We don't have specific market data for ${s} yet, but here's what we know about the state's real estate landscape:\n\n` +
          `🏙️ **Key Real Estate Markets in ${s.charAt(0).toUpperCase() + s.slice(1)}:**\n\n` +
          `${s === 'maharashtra' ? '• **Mumbai**: Premium waterfront properties, luxury apartments\n• **Pune**: IT hub with affordable housing\n• **Nagpur**: Emerging commercial center\n• **Aurangabad**: Heritage tourism impact' :
           s === 'karnataka' ? '• **Bangalore**: Tech capital, high rental demand\n• **Mysore**: Heritage city, affordable living\n• **Mangalore**: Port city, commercial growth\n• **Hubli**: Industrial hub, affordable properties' :
           s === 'gujarat' ? '• **Ahmedabad**: Cultural capital, mixed developments\n• **Surat**: Diamond industry, affordable housing\n• **Vadodara**: Educational hub, residential growth\n• **Rajkot**: Industrial center, commercial properties' :
           s === 'rajasthan' ? '• **Jaipur**: Pink City, heritage tourism boost\n• **Jodhpur**: Blue City, affordable housing\n• **Udaipur**: Lake city, luxury resorts\n• **Kota**: Educational hub, student housing' :
           s === 'tamil nadu' ? '• **Chennai**: IT corridor, premium apartments\n• **Coimbatore**: Textile hub, affordable housing\n• **Madurai**: Temple city, cultural significance\n• **Tiruchirappalli**: Educational center, stable market' :
           s === 'uttar pradesh' ? '• **Lucknow**: State capital, administrative demand\n• **Noida/Greater Noida**: IT/Tech parks, modern apartments\n• **Ghaziabad**: Delhi suburb, affordable housing\n• **Kanpur**: Industrial city, commercial properties' :
           s === 'west bengal' ? '• **Kolkata**: Cultural capital, heritage properties\n• **Howrah**: Industrial area, affordable housing\n• **Salt Lake**: IT hub, modern offices\n• **Durgapur**: Steel city, industrial properties' :
           s === 'delhi' ? '• **South Delhi**: Premium residential, luxury apartments\n• **Dwarka**: Modern developments, IT hub\n• **Rohini**: Affordable housing, family homes\n• **Karol Bagh**: Commercial center, retail spaces' :
           s === 'haryana' ? '• **Gurgaon**: Corporate hub, premium apartments\n• **Faridabad**: Industrial area, affordable housing\n• **Panipat**: Textile industry, commercial properties\n• **Ambala**: Border city, strategic location' :
           s === 'punjab' ? '• **Ludhiana**: Industrial hub, affordable housing\n• **Amritsar**: Border trade, heritage tourism\n• **Jalandhar**: Commercial center, retail spaces\n• **Patiala**: Cultural center, educational hub' :
           '• Major urban centers and district headquarters\n• Emerging industrial and commercial zones\n• Heritage and tourism-driven locations\n• Educational and administrative centers'}\n\n` +
          `💰 **Typical Price Ranges:**\n` +
          `• **Urban Centers**: ₹30L-1.5Cr for residential\n• **Commercial Properties**: ₹50L-5Cr depending on location\n• **Agricultural Land**: ₹5L-50L per acre\n\n` +
          `📈 **Market Trends:**\n` +
          `• **Urban Growth**: 4-8% annual appreciation in major cities\n` +
          `• **Infrastructure**: Government projects driving development\n` +
          `• **Investment**: Focus on tier-2 cities for better returns\n\n` +
          `🎯 **Investment Advice:** Consider local market conditions, infrastructure development, and economic indicators. For specific areas, check with local real estate experts.\n\n` +
          `📊 **For detailed data** → Visit **Price Trends** page as we add more listings!`;
      }

      if (!d && !s) {
        // Provide comprehensive market overview with top trends
        const topAreas = db.prepare(
          `SELECT p.district, p.state, COUNT(*) as listings,
           AVG(p.price) as avg_price,
           COALESCE((SELECT AVG(avg_price) FROM price_history WHERE district LIKE p.district AND property_type=?), AVG(p.price)) as hist_avg
           FROM properties p WHERE p.status='active'
           GROUP BY p.district, p.state ORDER BY listings DESC LIMIT 8`
        ).all(t);

        if (topAreas.length > 0) {
          const trendList = topAreas.map(area => {
            const growth = area.hist_avg && area.avg_price 
              ? ((area.avg_price - area.hist_avg) / area.hist_avg * 100).toFixed(1)
              : '0';
            const trend = Number(growth) > 5 ? '📈' : Number(growth) > 0 ? '→' : '📉';
            return `• **${area.district}, ${area.state}** ${trend} ${area.listings} listings | Avg: ${fmt(Math.round(area.avg_price), 'sale')} | Growth: ${growth}%`;
          }).join('\n');

          return '📊 **Price Trend Analysis — Top Markets**\n\n' +
            'Based on current market data:\n\n' + trendList + '\n\n' +
            '📈 **For Detailed Trends, Specify:**\n' +
            '• *"Trend for houses in Ludhiana, Punjab"*\n' +
            '• *"Apartment trend in Bangalore"* (state auto-detected)\n' +
            '• *"Villa prices in Gurgaon"*\n\n' +
            '💡 **Tip:** I analyze both current listings and historical price data automatically. Visit **Price Trends** page for interactive charts!';
        }

        return '📊 **Price Trend Analysis**\n\n' +
          'To see trends, mention a district or city. Examples:\n' +
          '• *"Price trend for houses in Ludhiana, Punjab"*\n' +
          '• *"Apartment trend in Bangalore"*\n' +
          '• *"Villa prices in Gurgaon"*\n\n' +
          '✅ I work with all Indian districts and states!';
      }

      const rows = db.prepare(
        `SELECT month, year, avg_price FROM price_history
         WHERE district LIKE ? AND property_type=? ORDER BY year DESC, month DESC LIMIT 24`
      ).all(`%${d}%`, t);

      if (rows.length === 0) {
        // No historical data, but check current market data
        const currentStats = db.prepare(
          `SELECT COUNT(*) as count, AVG(price) as avg_price, 
           MIN(CAST(price AS REAL) / NULLIF(area, 0)) as min_ppsf,
           MAX(CAST(price AS REAL) / NULLIF(area, 0)) as max_ppsf,
           AVG(CAST(price AS REAL) / NULLIF(area, 0)) as avg_ppsf
           FROM properties WHERE status='active' AND district LIKE ? AND type=? AND area > 0`
        ).get(`%${d}%`, t);

        if (currentStats?.count > 0) {
          const listingStats = db.prepare(
            `SELECT COUNT(*) as total, SUM(CASE WHEN listing='sale' THEN 1 ELSE 0 END) as for_sale,
             SUM(CASE WHEN listing='rent' THEN 1 ELSE 0 END) as for_rent
             FROM properties WHERE status='active' AND district LIKE ?`
          ).get(`%${d}%`);

          return `📊 **${d.charAt(0).toUpperCase()+d.slice(1)} — ${t} | Current Market**\n\n` +
            `**No historical data yet**, but here's the current market snapshot:\n\n` +
            `| Metric | Value |\n|---|---|\n` +
            `| Active Listings | **${currentStats.count}** |\n` +
            `| Avg Price | **${fmt(Math.round(currentStats.avg_price), 'sale')}** |\n` +
            `| Price Range | ₹${(Math.round(currentStats.min_ppsf)).toLocaleString('en-IN')} - ₹${(Math.round(currentStats.max_ppsf)).toLocaleString('en-IN')}/sqft |\n` +
            `| Avg Price/sqft | **₹${Math.round(currentStats.avg_ppsf).toLocaleString('en-IN')}/sqft** |\n` +
            `| For Sale | ${listingStats?.for_sale || 0} |\n` +
            `| For Rent | ${listingStats?.for_rent || 0} |\n\n` +
            `💡 **Insights:** This is an emerging market. As more transactions occur, trend data will become available.\n\n` +
            `👉 Visit **Price Trends** page to explore all Indian markets!`;
        }

        return `📊 No market data found for ${d} — ${t}.\n\nTry:\n• *"Trend in [nearby major city]"*\n• Visiting the **Price Trends** page for comprehensive charts`;
      }

      // Sort rows chronologically (oldest first)
      const sortedRows = [...rows].reverse();
      const first = sortedRows[0].avg_price;
      const last  = sortedRows[sortedRows.length-1].avg_price;
      const change = ((last - first) / first * 100).toFixed(1);
      const trend  = Number(change) > 0 ? '📈 Upward' : '📉 Downward';

      // Calculate growth per year
      const months  = sortedRows.length;
      const annualGrowth = ((Math.pow(last / first, 12 / months) - 1) * 100).toFixed(1);

      // Current market stats
      const currentStats = db.prepare(
        `SELECT COUNT(*) as count, AVG(price) as avg_price,
         AVG(CAST(price AS REAL) / NULLIF(area, 0)) as avg_ppsf
         FROM properties WHERE status='active' AND district LIKE ? AND type=? AND area > 0`
      ).get(`%${d}%`, t);
      const ppsfValue = currentStats?.avg_ppsf ? Math.round(currentStats.avg_ppsf) : last;

      const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const preview = sortedRows.slice(-6).map(r =>
        `${MONTH_NAMES[r.month-1]} ${r.year}: ₹${r.avg_price.toLocaleString('en-IN')}/sqft`
      ).join('\\n');

      // Investment advice based on comprehensive analysis
      let advice = '';
      const currentPrice = currentStats?.avg_price || last;
      const priceChange = ((currentPrice - last) / last * 100);
      
      if (Number(annualGrowth) > 10) {
        advice = '🔥 **Strong Buy** — High appreciation zone. Excellent for capital gains.';
      } else if (Number(annualGrowth) > 5) {
        advice = '✅ **Good Investment** — Steady growth above inflation. Suitable for buy-and-hold.';
      } else if (Number(annualGrowth) > 0) {
        advice = '⚠️ **Moderate Growth** — Mild appreciation. Consider rental yield.';
      } else {
        advice = '📉 **Caution** — Prices declining. Wait for stabilization before investing.';
      }

      // Get rental market data for additional insights
      const rentalData = db.prepare(
        `SELECT COUNT(*) as rentals, AVG(price) as avg_rent FROM properties 
         WHERE status='active' AND district LIKE ? AND listing='rent'`
      ).get(`%${d}%`);

      // Calculate rental yield if both sale and rent data available
      let rentalYield = 'N/A';
      if (currentStats?.avg_price && rentalData?.avg_rent && rentalData.rentals > 0) {
        const annualRent = rentalData.avg_rent * 12;
        const yieldPct = (annualRent / currentStats.avg_price * 100).toFixed(2);
        rentalYield = `${yieldPct}% p.a.`;
      }

      return `📊 **Price Trend Analysis — ${d.charAt(0).toUpperCase()+d.slice(1)} | ${t}**\n\n` +
        `**Data Period:** ${months} months | **Overall Trend:** ${trend} (${Number(change) >= 0?'+':''}${change}%)\n\n` +
        `| Metric | Value |\n|---|---|\n` +
        `| Annualized Growth | **${annualGrowth}% per year** |\n` +
        `| Historical Avg/sqft | ₹${last.toLocaleString('en-IN')}/sqft |\n` +
        `| Current Market Avg | **₹${ppsfValue.toLocaleString('en-IN')}/sqft** |\n` +
        `| Active Listings | ${currentStats?.count || 'N/A'} |\n` +
        `| Rental Yield | ${rentalYield} |\n\n` +
        `📅 **6-Month History:**\n${preview}\n\n` +
        `🎯 **Investment Analysis:**\n${advice}\n\n` +
        `💼 **Market Snapshot:**\n` +
        `• Most properties: ${t}\n` +
        `• Rental demand: ${rentalData?.rentals || 0} properties\n` +
        `• Price momentum: ${Number(annualGrowth) > 0 ? '✅ Positive' : '⚠️ Negative'}\n\n` +
        `📈 **For interactive charts & deeper analysis** → Visit **Price Trends** page!`;
    }

    case 'website_info': {
      return '🌐 **About PropEstate360 — India\'s Real Estate Platform**\n\n' +
        '🏢 **What We Offer:**\n' +
        'PropEstate360 is a comprehensive real estate platform connecting property buyers, sellers, and investors across India. We provide tools for property discovery, market analysis, and financial planning.\n\n' +
        '📱 **Key Features:**\n\n' +
        '🔍 **Property Marketplace**\n' +
        '• Browse properties for sale and rent across all Indian states\n' +
        '• Advanced filters: location, price, type, BHK, amenities\n' +
        '• High-quality photos and detailed property information\n' +
        '• Direct contact with agents and owners\n\n' +
        '📊 **Market Intelligence**\n' +
        '• Real-time price trends and historical data\n' +
        '• Price per square foot calculators\n' +
        '• Investment analysis and recommendations\n' +
        '• Interactive charts and comparisons\n\n' +
        '💰 **Financial Tools**\n' +
        '• Home loan EMI calculator with detailed breakdowns\n' +
        '• Budget planning and down payment suggestions\n' +
        '• Property valuation estimates\n\n' +
        '🗺️ **Pan-India Coverage**\n' +
        '• Properties from all major cities and districts\n' +
        '• State-wise and district-wise breakdowns\n' +
        '• Local market insights and statistics\n\n' +
        '👥 **User Types**\n' +
        '• **Buyers**: Find your dream home with smart search\n' +
        '• **Agents**: List properties and connect with clients\n' +
        '• **Investors**: Access market data and investment insights\n' +
        '• **Admins**: Platform management and user oversight\n\n' +
        '🔒 **Security & Trust**\n' +
        '• Verified user accounts\n' +
        '• Secure data handling\n' +
        '• Direct communication channels\n' +
        '• Quality property listings\n\n' +
        '📈 **Data-Driven Insights**\n' +
        '• Live database with thousands of properties\n' +
        '• Price history tracking across districts\n' +
        '• Market trend analysis\n' +
        '• Investment opportunity identification\n\n' +
        '🎯 **Our Mission**\n' +
        'To democratize real estate information and make property transactions transparent, informed, and efficient across India.\n\n' +
        '💡 **Why Choose Us?**\n' +
        '• **Comprehensive**: All major cities and property types\n' +
        '• **Data-Rich**: Extensive market data and analytics\n' +
        '• **User-Friendly**: Intuitive interface and AI assistance\n' +
        '• **Free**: No hidden costs for basic features\n\n' +
        'Ready to explore? Start with our homepage or ask me about specific features! 🏡';
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
      if (s)    { sql += ' AND state LIKE ? COLLATE NOCASE';    params.push(`%${s}%`); }
      if (d)    { sql += ' AND district LIKE ? COLLATE NOCASE'; params.push(`%${d}%`); }
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

      // If no district/state was found but the message mentions a location, try locality.
      if (!filters.state && !filters.district) {
        const localityHint = extractLocationHint(msg);
        if (localityHint) {
          filters.locality = localityHint;
        }
      }

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

      // Show more results when searching a specific district or state (broad search)
      const broadSearch = (filters.state || filters.district) && !filters.type && !filters.listing && !filters.beds && !filters.maxPrice && !filters.minPrice;
      const results = getProps(filters, broadSearch ? 10 : 5);
      const locationName = filters.district || filters.locality || district || state || null;
      if (results.length === 0) {
        // Check if there are sold/inactive properties at this location to give a better hint
        let soldCount = 0;
        try {
          if (filters.district) {
            soldCount = db.prepare(
              `SELECT COUNT(*) as c FROM properties WHERE LOWER(district) LIKE LOWER(?) AND status != 'active'`
            ).get(`%${filters.district}%`)?.c || 0;
          } else if (filters.state) {
            soldCount = db.prepare(
              `SELECT COUNT(*) as c FROM properties WHERE LOWER(state) LIKE LOWER(?) AND status != 'active'`
            ).get(`%${filters.state}%`)?.c || 0;
          }
        } catch(e) {}
        const soldNote = soldCount > 0 ? `\n\n💡 *Note: ${soldCount} sold/inactive listing(s) exist in this area. Visit **Properties** page to see all.*` : '';
        return `🔍 No active properties found${locationName ? ` in **${locationName}**` : ''} matching your criteria.\n\n` +
          'Try:\n• Broaden your location (e.g. just state name)\n• Different property type\n• Adjust budget range' + soldNote + '\n\n👉 Visit the **Properties** page for advanced filters.';
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
      if (s)       { sql += ' AND state LIKE ? COLLATE NOCASE';    params.push(`%${s}%`); }
      if (d)       { sql += ' AND district LIKE ? COLLATE NOCASE'; params.push(`%${d}%`); }
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
      return '📋 **Complete Guide to PropEstate360**\n\n' +
        '🏠 **Getting Started**\n' +
        '• **Register/Login**: Create account to list properties & save favorites\n' +
        '• **Browse**: Explore properties across India without account\n' +
        '• **AI Assistant**: Ask me anything about real estate (I\'m here!)\n\n' +
        '🔍 **Finding Properties**\n' +
        '• **Search Examples:**\n' +
        '  • *"Find 3BHK house in Ludhiana under 80 lakh"*\n' +
        '  • *"Show apartments in Gurgaon, Haryana"*\n' +
        '  • *"Properties for rent in Bangalore"*\n' +
        '  • *"Plots in Mohali"*\n' +
        '• **Advanced Filters**: Use Properties page for beds, baths, area, amenities\n' +
        '• **Location Search**: Works with any Indian city/district + state\n\n' +
        '💰 **Financial Tools**\n' +
        '• **EMI Calculator**: *"EMI for 60 lakh at 8.5% for 20 years"*\n' +
        '• **Price Per Sqft**: *"Price per sqft in Amritsar"*\n' +
        '• **Budget Planning**: Get down payment suggestions\n\n' +
        '📊 **Market Intelligence**\n' +
        '• **Price Trends**: *"Trend for houses in Ludhiana, Punjab"* (needs state+district+type)\n' +
        '• **Investment Advice**: *"Best areas to invest in Maharashtra"*\n' +
        '• **Compare Areas**: *"Compare Ludhiana vs Amritsar"* or *"Gurgaon vs Bangalore"*\n' +
        '• **Market Stats**: *"How many properties are listed?"*\n\n' +
        '🗺️ **Exploring India**\n' +
        '• **States Page**: Browse properties by state\n' +
        '• **District Breakdown**: See listings per district\n' +
        '• **Interactive Maps**: Visual property distribution\n\n' +
        '📝 **Listing Your Property**\n' +
        '• **Agent/Buyer Account**: Required to post listings\n' +
        '• **Photo Upload**: Add up to 8 high-quality photos\n' +
        '• **Complete Details**: Title, location, price, area, amenities\n' +
        '• **Contact Info**: Buyers can reach you directly\n\n' +
        '⚙️ **Account Management**\n' +
        '• **Dashboard**: View your listings, favorites, enquiries\n' +
        '• **Profile**: Update contact info & preferences\n' +
        '• **Admin Panel**: Manage users (admin only)\n\n' +
        '💡 **Tips for Best Results**\n' +
        '• Be specific: Include city + state for accurate results\n' +
        '• Use BHK: "3BHK", "2 bedroom", etc.\n' +
        '• Budget: "under 50 lakh", "above 1 crore"\n' +
        '• Property types: house, apartment, villa, plot, shop\n\n' +
        '❓ **Still Need Help?**\n' +
        '• Ask me specific questions about any feature\n' +
        '• Try the search examples above\n' +
        '• Visit different pages to explore functionality\n\n' +
        'What would you like to learn more about? 🏡';
    }

    case 'thanks':
      return '😊 You\'re welcome! I\'m here anytime for real estate queries.\n\nIs there anything else I can help with — property search, EMI, trends, or investment advice?';

    case 'my_properties': {
      if (!userId) {
        return '🔐 To see your listed properties, please make sure you are **logged in** and try again.\n\n' +
          'If you are logged in, try asking: *"Show houses in Ludhiana"* or *"Find properties in Mohali"*';
      }
      const myProps = db.prepare(
        "SELECT * FROM properties WHERE posted_by=? AND status='active' ORDER BY created_at DESC LIMIT 5"
      ).all(userId);
      if (myProps.length === 0) {
        return '🏘️ You have no active listings yet.\n\n' +
          '👉 Click **"List Property"** in the navigation to add your first property!';
      }
      return `🏘️ **Your Active Listings (${myProps.length}):**\n\n` +
        myProps.map(propCard).join('\n') +
        '\n\n💡 *Go to your Dashboard → My Listings to manage these properties.*';
    }

    case 'compare': {
      // Extract ALL locations mentioned in the message and history
      const locations = [];
      const allText = msg + ' ' + (history || []).filter(h => h.role === 'user').map(h => h.text || h.content || '').join(' ');
      
      // Find all districts
      DISTRICTS.forEach(d => {
        if (allText.toLowerCase().includes(d)) {
          locations.push({ name: d, type: 'district' });
        }
      });

      // Remove duplicates
      const uniqueLocs = Array.from(new Set(locations.map(l => l.name))).slice(0, 4).map(name => ({ name, type: 'district' }));

      if (uniqueLocs.length < 2) {
        return '🔄 **Compare Locations**\n\n' +
          'To compare properties/prices, mention at least 2 cities or districts.\n\n' +
          'Examples:\n' +
          '• *"Compare Ludhiana vs Amritsar"*\n' +
          '• *"Ludhiana vs Mohali vs Chandigarh"*\n' +
          '• *"Which is better — Gurgaon or Bangalore?"*\n' +
          '• *"Ludhiana vs Amritsar vs Chandigarh — price comparison"*\n\n' +
          '📊 I\'ll compare: price ranges, price per sqft, rental yield, and investment potential.';
      }

      // Get stats for each location
      const compareData = uniqueLocs.map(loc => {
        const stats = db.prepare(
          `SELECT
             COUNT(*) as listings,
             AVG(price) as avg_price,
             MIN(CAST(price AS REAL) / NULLIF(area, 0)) as min_ppsf,
             MAX(CAST(price AS REAL) / NULLIF(area, 0)) as max_ppsf,
             AVG(CAST(price AS REAL) / NULLIF(area, 0)) as avg_ppsf,
             SUM(CASE WHEN listing='rent' THEN 1 ELSE 0 END) as rentals
           FROM properties WHERE status='active' AND district LIKE ? AND area > 0`
        ).get(`%${loc.name}%`);

        const trendData = db.prepare(
          `SELECT AVG(avg_price) as avg_hist FROM price_history WHERE district LIKE ? AND property_type='house'`
        ).get(`%${loc.name}%`);

        return {
          name: loc.name,
          listings: stats?.listings || 0,
          avgPrice: stats?.avg_price || 0,
          avgPpsf: stats?.avg_ppsf ? Math.round(stats.avg_ppsf) : 0,
          minPpsf: stats?.min_ppsf ? Math.round(stats.min_ppsf) : 0,
          maxPpsf: stats?.max_ppsf ? Math.round(stats.max_ppsf) : 0,
          rentals: stats?.rentals || 0,
          histPrice: trendData?.avg_hist || 0,
        };
      }).filter(d => d.listings > 0);

      if (compareData.length < 2) {
        return `📊 No sufficient data found for all locations. Try with major cities like:\n• Ludhiana, Amritsar, Mohali (Punjab)\n• Gurgaon, Faridabad (Haryana)\n• Bangalore, Pune (South)`;
      }

      // Build comparison table
      const rows = compareData.map(d => {
        const trend = d.histPrice && d.avgPrice ? ((d.avgPrice - d.histPrice) / d.histPrice * 100).toFixed(1) : 'N/A';
        return `| **${d.name}** | ${d.listings} | ${fmt(Math.round(d.avgPrice), 'sale')} | ₹${d.avgPpsf.toLocaleString('en-IN')} | ${d.rentals} | ${trend}% |`;
      }).join('\n');

      // Investment ranking
      const ranked = compareData
        .map((d, i) => ({
          ...d,
          score: (d.listings * 2) + (d.rentals * 0.5) + (d.avgPpsf / 100),
          growth: d.histPrice && d.avgPrice ? ((d.avgPrice - d.histPrice) / d.histPrice * 100) : 0,
        }))
        .sort((a, b) => b.score - a.score);

      const recommendations = ranked.map((d, i) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣'][i] || '•';
        let advice = '';
        if (d.growth > 5) advice = '📈 Strong growth market';
        else if (d.growth > 0) advice = '✅ Stable market';
        else advice = '⚠️ Price stable/declining';
        return `${medal} **${d.name}** — ${d.listings} listings, ${advice}`;
      }).join('\n');

      return `📊 **Property Market Comparison**\n\n` +
        `Comparing: ${uniqueLocs.map(l => l.name).join(' vs ')}\n\n` +
        `| Location | Listings | Avg Price | Price/sqft | Rentals | Trend |\n` +
        `|---|---|---|---|---|---|\n` +
        rows + '\n\n' +
        `🏆 **Investment Ranking:**\n${recommendations}\n\n` +
        `💡 **Insights:**\n` +
        `• Most active: **${ranked[0]?.name}** (${ranked[0]?.listings} listings)\n` +
        `• Best value: **${compareData.reduce((a, b) => a.avgPpsf < b.avgPpsf ? a : b).name}** (₹${compareData.reduce((a, b) => a.avgPpsf < b.avgPpsf ? a : b).avgPpsf}/sqft)\n` +
        `• Strong rentals: **${compareData.reduce((a, b) => a.rentals > b.rentals ? a : b).name}** (${compareData.reduce((a, b) => a.rentals > b.rentals ? a : b).rentals} rentals)\n\n` +
        `👉 Visit **Price Trends** page for detailed charts!`;
    }

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

      // Analyze the message for potential intent and provide targeted suggestions
      const m = msg.toLowerCase();
      const hasLocation = district || state || /(in|at|near|around|from|of)\s+\w+/.test(m);
      const hasNumbers = /\d+/.test(m);
      const hasMoney = /(lakh|crore|price|cost|budget|expensive|cheap)/.test(m);
      const hasProperty = /(property|house|flat|apartment|villa|plot|shop|pg|home|real estate)/.test(m);
      const hasQuestion = /(what|how|where|when|why|which|can|do|does|is|are)/.test(m);

      let suggestions = [];

      if (hasLocation && hasProperty) {
        suggestions.push('🔍 **Property Search**: Try *"Find houses in [City]"* or *"Apartments in [District], [State]"*');
      }
      if (hasMoney && !hasLocation) {
        suggestions.push('💰 **Budget Questions**: Try *"EMI for [amount]"* or *"Price per sqft in [area]"*');
      }
      if (hasQuestion && /(trend|increase|decrease|growth|market)/.test(m)) {
        suggestions.push('📊 **Market Trends**: Try *"Price trend for [type] in [district], [state]"*');
      }
      if (hasQuestion && /(invest|investment|best|good|profitable)/.test(m)) {
        suggestions.push('🏙️ **Investment Advice**: Try *"Best areas to invest in [state]"*');
      }
      if (hasQuestion && /(how|what|work|use)/.test(m)) {
        suggestions.push('📋 **How-to Questions**: Ask *"How do I list a property?"* or *"What is EMI?"*');
      }

      if (suggestions.length === 0) {
        suggestions = [
          '🔍 **Property Search**: *"Find 3BHK in Ludhiana under 80 lakh"*',
          '💰 **EMI Calculator**: *"EMI for 60 lakh at 8.5% for 20 years"*',
          '📊 **Price Trends**: *"Trend for houses in Amritsar, Punjab"*',
          '💡 **Price per Sqft**: *"Price per sqft in Mohali"*',
          '🏙️ **Investment**: *"Best areas to invest in Punjab"*',
          '📋 **Help**: *"How does the website work?"*'
        ];
      }

      return `🤔 **I want to help, but need more details!**\n\n` +
        `Based on your message "${msg}", here are some relevant options:\n\n` +
        suggestions.join('\n') + '\n\n' +
        '💡 **Tips for better results:**\n' +
        '• Include specific locations (city + state)\n' +
        '• Mention property types (house, apartment, villa)\n' +
        '• Add budget or BHK requirements\n' +
        '• Be specific about what you\'re looking for\n\n' +
        'Try rephrasing your question or ask for help! 📞';
    }
  }
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
router.post('/chat', (req, res) => {
  const { message, history, user_id } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  try {
    const reply = processMessage(message.trim(), history || [], user_id || null);
    res.json({ success: true, reply, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[AI Error]', err);
    res.status(500).json({ error: 'AI processing error', reply: 'Sorry, I encountered an error. Please try again!' });
  }
});

module.exports = router;
