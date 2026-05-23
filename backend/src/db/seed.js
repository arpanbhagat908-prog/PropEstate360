// ─── SEED DATABASE ──────────────────────────────────────────────────────────
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');

const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Arpan';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'arpan@propestate360.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@Secure123';
const ADMIN_PHONE    = process.env.ADMIN_PHONE    || '9900112233';

const IMGS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
  'https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=800&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80',
  'https://images.unsplash.com/photo-1582063289852-62e3ba2747f8?w=800&q=80',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
];

async function seed() {
  console.log('🌱 Seeding database...');

  // ── Admin user ──────────────────────────────────────────────────────────
  const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!existingAdmin) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare(`INSERT INTO users (id,name,email,phone,password_hash,role,email_verified,agent_status)
                VALUES (?,?,?,?,?,?,1,'approved')`)
      .run('admin_arpan', ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, hash, 'admin');
    console.log(`✅ Admin created: ${ADMIN_EMAIL}`);
  }

  // ── Demo buyer only (no demo agents) ───────────────────────────────────
  const demoUsers = [
    { id:'u_buyer1', name:'Harpreet Singh', email:'harpreet@demo.com', phone:'9876543210', password:'Buyer@123', role:'buyer', agent_status:'approved' },
  ];
  for (const u of demoUsers) {
    const ex = db.prepare('SELECT id FROM users WHERE email=?').get(u.email);
    if (!ex) {
      const hash = bcrypt.hashSync(u.password, 10);
      db.prepare(`INSERT INTO users (id,name,email,phone,password_hash,role,email_verified,agent_status)
                  VALUES (?,?,?,?,?,?,1,?)`)
        .run(u.id, u.name, u.email, u.phone, hash, u.role, u.agent_status);
    }
  }
  console.log('✅ Demo buyer seeded (no demo agents)');

  // ── Properties seeded under admin account ───────────────────────────────
  const propCount = db.prepare('SELECT COUNT(*) as c FROM properties').get().c;
  if (propCount === 0) {
    const props = [
      {
        id:'p001', title:'Elegant 4BHK Bungalow – Model Town Ludhiana',
        type:'house', listing:'sale', state:'Punjab', district:'Ludhiana',
        locality:'Model Town', price:8500000, area:2400, beds:4, baths:3, floors:2,
        featured:1, posted_by:'admin_arpan', agent_name: ADMIN_NAME,
        agent_phone: ADMIN_PHONE, agent_email: ADMIN_EMAIL,
        description:'Spacious double-storey bungalow with diamond-tile exterior and lush garden. Walking distance from market.',
        amenities:JSON.stringify(['Parking','Garden','CCTV','Power Backup']),
        photos:JSON.stringify([IMGS[0]]),
      },
      {
        id:'p002', title:'Premium Villa – Phase 7 Mohali',
        type:'villa', listing:'sale', state:'Punjab', district:'Mohali (SAS Nagar)',
        locality:'Phase 7', price:14500000, area:3800, beds:5, baths:4, floors:3,
        featured:1, posted_by:'admin_arpan', agent_name: ADMIN_NAME,
        agent_phone: ADMIN_PHONE, agent_email: ADMIN_EMAIL,
        description:'Ultra-modern villa with frameless glass railings, modular kitchen and gated society with 24/7 security.',
        amenities:JSON.stringify(['Pool','Gym','Parking','Garden','Generator','Vastu']),
        photos:JSON.stringify([IMGS[1]]),
      },
      {
        id:'p003', title:'3BHK Triple Storey House on Rent – Lajpat Nagar Jalandhar',
        type:'house', listing:'rent', state:'Punjab', district:'Jalandhar',
        locality:'Lajpat Nagar', price:22000, area:1600, beds:3, baths:2, floors:3,
        featured:0, posted_by:'admin_arpan', agent_name: ADMIN_NAME,
        agent_phone: ADMIN_PHONE, agent_email: ADMIN_EMAIL,
        description:'Well-maintained triple-storey house with balconies on every floor and convenient street parking.',
        amenities:JSON.stringify(['Parking','Power Backup','Balcony']),
        photos:JSON.stringify([IMGS[2]]),
      },
      {
        id:'p004', title:'3BHK Contemporary House – Urban Estate Patiala',
        type:'house', listing:'sale', state:'Punjab', district:'Patiala',
        locality:'Urban Estate Ph 2', price:6800000, area:1800, beds:3, baths:2, floors:2,
        featured:1, posted_by:'admin_arpan', agent_name: ADMIN_NAME,
        agent_phone: ADMIN_PHONE, agent_email: ADMIN_EMAIL,
        description:'Compact well-designed house with LED lighting, tiled driveway and covered parking.',
        amenities:JSON.stringify(['Parking','CCTV','Vastu']),
        photos:JSON.stringify([IMGS[3]]),
      },
      {
        id:'p005', title:'Commercial Shop – Hall Bazaar Amritsar',
        type:'shop', listing:'sale', state:'Punjab', district:'Amritsar',
        locality:'Hall Bazaar', price:4200000, area:350, beds:0, baths:1, floors:1,
        featured:1, posted_by:'admin_arpan', agent_name: ADMIN_NAME,
        agent_phone: ADMIN_PHONE, agent_email: ADMIN_EMAIL,
        description:'Prime location commercial shop on busy Hall Bazaar. Very high footfall, ideal for retail.',
        amenities:JSON.stringify(['Power Backup','CCTV']),
        photos:JSON.stringify([IMGS[6]]),
      },
      {
        id:'p006', title:'2BHK Apartment – Sector 70 Mohali',
        type:'apartment', listing:'rent', state:'Punjab', district:'Mohali (SAS Nagar)',
        locality:'Sector 70', price:16000, area:1100, beds:2, baths:2, floors:5,
        featured:0, posted_by:'admin_arpan', agent_name: ADMIN_NAME,
        agent_phone: ADMIN_PHONE, agent_email: ADMIN_EMAIL,
        description:'Modern apartment in gated society with 24/7 security, power backup and gym access.',
        amenities:JSON.stringify(['Gym','Parking','Security','Lift']),
        photos:JSON.stringify([IMGS[4]]),
      },
      {
        id:'p007', title:'Residential Plot – Thermal Colony Bathinda',
        type:'plot', listing:'sale', state:'Punjab', district:'Bathinda',
        locality:'Thermal Colony', price:2800000, area:600, beds:0, baths:0, floors:0,
        featured:0, posted_by:'admin_arpan', agent_name: ADMIN_NAME,
        agent_phone: ADMIN_PHONE, agent_email: ADMIN_EMAIL,
        description:'Clear-title residential plot. Ideal for custom construction. All utilities available.',
        amenities:JSON.stringify(['Vastu']),
        photos:JSON.stringify([IMGS[5]]),
      },
      {
        id:'p008', title:'Statement Villa – BRS Nagar Ludhiana',
        type:'villa', listing:'sale', state:'Punjab', district:'Ludhiana',
        locality:'BRS Nagar', price:18000000, area:4500, beds:6, baths:5, floors:4,
        featured:1, posted_by:'admin_arpan', agent_name: ADMIN_NAME,
        agent_phone: ADMIN_PHONE, agent_email: ADMIN_EMAIL,
        description:'Statement villa with premium finishes, home theatre, rooftop terrace and Italian marble flooring.',
        amenities:JSON.stringify(['Pool','Gym','Home Theatre','Parking','Terrace','Vastu']),
        photos:JSON.stringify([IMGS[7]]),
      },
      {
        id:'p009', title:'Luxury Villa on Rent – Civil Lines Patiala',
        type:'villa', listing:'rent', state:'Punjab', district:'Patiala',
        locality:'Civil Lines', price:85000, area:4200, beds:6, baths:5, floors:3,
        featured:1, posted_by:'admin_arpan', agent_name: ADMIN_NAME,
        agent_phone: ADMIN_PHONE, agent_email: ADMIN_EMAIL,
        description:'Opulent villa with swimming pool, manicured lawn and staff quarters.',
        amenities:JSON.stringify(['Pool','Lawn','Parking','Generator']),
        photos:JSON.stringify([IMGS[8]]),
      },
      {
        id:'p010', title:'2BHK PG Accommodation – Near GT Road Amritsar',
        type:'pg', listing:'rent', state:'Punjab', district:'Amritsar',
        locality:'GT Road', price:8500, area:400, beds:2, baths:1, floors:2,
        featured:0, posted_by:'admin_arpan', agent_name: ADMIN_NAME,
        agent_phone: ADMIN_PHONE, agent_email: ADMIN_EMAIL,
        description:'Comfortable PG with furnished rooms, Wi-Fi and meals. Suitable for working professionals.',
        amenities:JSON.stringify(['Wi-Fi','AC']),
        photos:JSON.stringify([IMGS[9]]),
      },
      {
        id:'p011', title:'Industrial Warehouse – Industrial Area Ludhiana',
        type:'warehouse', listing:'sale', state:'Punjab', district:'Ludhiana',
        locality:'Industrial Area A', price:22000000, area:12000, beds:0, baths:4, floors:1,
        featured:0, posted_by:'admin_arpan', agent_name: ADMIN_NAME,
        agent_phone: ADMIN_PHONE, agent_email: ADMIN_EMAIL,
        description:'Large industrial warehouse with loading docks, high-ceiling and power supply. Excellent connectivity.',
        amenities:JSON.stringify(['Power Backup','Security','CCTV']),
        photos:JSON.stringify([IMGS[10]]),
      },
      {
        id:'p012', title:'4BHK Independent House – Hoshiarpur',
        type:'house', listing:'sale', state:'Punjab', district:'Hoshiarpur',
        locality:'New Colony', price:5500000, area:2100, beds:4, baths:3, floors:2,
        featured:0, posted_by:'admin_arpan', agent_name: ADMIN_NAME,
        agent_phone: ADMIN_PHONE, agent_email: ADMIN_EMAIL,
        description:'Spacious independent house with marble flooring, modular kitchen and landscaped garden.',
        amenities:JSON.stringify(['Parking','Garden','CCTV','Vastu']),
        photos:JSON.stringify([IMGS[11]]),
      },
    ];

    const ins = db.prepare(`INSERT INTO properties
      (id,title,type,listing,state,district,locality,price,area,beds,baths,floors,description,amenities,featured,status,posted_by,agent_name,agent_phone,agent_email,photos)
      VALUES (@id,@title,@type,@listing,@state,@district,@locality,@price,@area,@beds,@baths,@floors,@description,@amenities,@featured,'active',@posted_by,@agent_name,@agent_phone,@agent_email,@photos)`);

    const tx = db.transaction(() => { for (const p of props) ins.run(p); });
    tx();
    console.log(`✅ ${props.length} properties seeded (Punjab properties under admin)`);
  }

  // ── Price History ────────────────────────────────────────────────────────
  const types = ['house','villa','apartment','plot'];
  const typeMultiplier = { house:1, villa:2.2, apartment:0.85, plot:0.55 };
  const years = [2024, 2025];

  const priceHistoryConfig = {
    'Punjab': {
      districts: ['Ludhiana','Amritsar','Jalandhar','Mohali (SAS Nagar)','Patiala','Bathinda','Barnala','Faridkot','Fatehgarh Sahib','Fazilka','Ferozepur','Gurdaspur','Hoshiarpur','Kapurthala','Malerkotla','Mansa','Moga','Muktsar (Sri Muktsar Sahib)','Pathankot','Rupnagar (Ropar)','Sangrur','Shaheed Bhagat Singh Nagar','Tarn Taran'],
      basePrices: { 'Ludhiana':4200,'Amritsar':3800,'Jalandhar':3500,'Mohali (SAS Nagar)':5200,'Patiala':3200,'Bathinda':2800,'Barnala':2600,'Faridkot':2700,'Fatehgarh Sahib':3000,'Fazilka':2500,'Ferozepur':2600,'Gurdaspur':2800,'Hoshiarpur':3100,'Kapurthala':3200,'Malerkotla':2900,'Mansa':2500,'Moga':2800,'Muktsar (Sri Muktsar Sahib)':2600,'Pathankot':3000,'Rupnagar (Ropar)':3300,'Sangrur':2700,'Shaheed Bhagat Singh Nagar':3200,'Tarn Taran':2700 },
    },
    'Haryana': {
      districts: ['Gurugram','Faridabad','Panipat','Kurukshetra','Ambala','Panchkula'],
      basePrices: { 'Gurugram':5400,'Faridabad':3600,'Panipat':3300,'Kurukshetra':3000,'Ambala':3100,'Panchkula':4400 },
    },
    'Maharashtra': {
      districts: ['Mumbai City','Pune','Thane','Nagpur','Nashik'],
      basePrices: { 'Mumbai City':9500,'Pune':6200,'Thane':5200,'Nagpur':3400,'Nashik':3300 },
    },
    'Karnataka': {
      districts: ['Bangalore Urban','Mysore','Mangalore','Hubli','Belagavi'],
      basePrices: { 'Bangalore Urban':7000,'Mysore':3800,'Mangalore':3600,'Hubli':3100,'Belagavi':3000 },
    },
    'Delhi': {
      districts: ['Central Delhi','South Delhi','West Delhi','North Delhi','East Delhi'],
      basePrices: { 'Central Delhi':9800,'South Delhi':9200,'West Delhi':7600,'North Delhi':6800,'East Delhi':6500 },
    },
    'Tamil Nadu': {
      districts: ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem'],
      basePrices: { 'Chennai':6400,'Coimbatore':4300,'Madurai':3300,'Tiruchirappalli':3200,'Salem':3100 },
    },
    'West Bengal': {
      districts: ['Kolkata','Howrah','Hooghly','North 24 Parganas','South 24 Parganas'],
      basePrices: { 'Kolkata':6200,'Howrah':3700,'Hooghly':3100,'North 24 Parganas':3000,'South 24 Parganas':2900 },
    },
    'Kerala': {
      districts: ['Thiruvananthapuram','Ernakulam','Thrissur','Kozhikode','Kollam'],
      basePrices: { 'Thiruvananthapuram':5200,'Ernakulam':4400,'Thrissur':3300,'Kozhikode':3200,'Kollam':3000 },
    },
    'Uttar Pradesh': {
      districts: ['Lucknow','Kanpur Nagar','Noida','Ghaziabad','Meerut'],
      basePrices: { 'Lucknow':3200,'Kanpur Nagar':3100,'Noida':4800,'Ghaziabad':4200,'Meerut':3000 },
    },
    'Gujarat': {
      districts: ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar'],
      basePrices: { 'Ahmedabad':4300,'Surat':4100,'Vadodara':3900,'Rajkot':3400,'Bhavnagar':3200 },
    },
    'Himachal Pradesh': {
      districts: ['Shimla','Manali','Kangra','Solan','Mandi'],
      basePrices: { 'Shimla':3800,'Manali':3500,'Kangra':2800,'Solan':3000,'Mandi':2700 },
    },
    'Jammu & Kashmir': {
      districts: ['Srinagar','Jammu','Anantnag','Baramulla','Samba'],
      basePrices: { 'Srinagar':4200,'Jammu':3600,'Anantnag':3200,'Baramulla':3000,'Samba':2900 },
    },
    'Rajasthan': {
      districts: ['Jaipur','Jodhpur','Udaipur','Ajmer','Bikaner'],
      basePrices: { 'Jaipur':4000,'Jodhpur':3300,'Udaipur':3500,'Ajmer':3000,'Bikaner':2800 },
    },
    'Bihar': {
      districts: ['Patna','Gaya','Bhagalpur','Muzaffarpur','Darbhanga'],
      basePrices: { 'Patna':2800,'Gaya':2300,'Bhagalpur':2200,'Muzaffarpur':2100,'Darbhanga':2000 },
    },
    'Uttrakhand': {
      districts: ['Dehradun','Haridwar','Almora','Nainital','Udham Singh Nagar'],
      basePrices: { 'Dehradun':3600,'Haridwar':3200,'Almora':2600,'Nainital':3100,'Udham Singh Nagar':2900 },
    },
  };

  const existingHistory = db.prepare(
    `SELECT state,district,property_type,listing_type,year,month FROM price_history`
  ).all().reduce((map, row) => {
    map.add(`${row.state}|${row.district}|${row.property_type}|${row.listing_type}|${row.year}|${row.month}`);
    return map;
  }, new Set());

  const ins2 = db.prepare(`INSERT INTO price_history (state,district,property_type,listing_type,avg_price,month,year)
                            VALUES (?,?,?,?,?,?,?)`);
  let inserted = 0;

  const tx2 = db.transaction(() => {
    for (const [state, config] of Object.entries(priceHistoryConfig)) {
      for (const district of config.districts) {
        for (const propertyType of types) {
          const basePrice = (config.basePrices[district] || 2800) * typeMultiplier[propertyType];
          for (const year of years) {
            for (let month = 1; month <= 12; month++) {
              // ── SALE history ────────────────────────────────────────────────
              const keySale = `${state}|${district}|${propertyType}|sale|${year}|${month}`;
              if (!existingHistory.has(keySale)) {
                const yearTrend = 1 + (year - 2024) * 0.06;
                const monthTrend = 1 + (month - 1) * 0.008;
                const seasonal = 1 + Math.sin((month / 12) * Math.PI * 2) * 0.03;
                const noise = 0.95 + Math.random() * 0.1;
                const price = Math.round(basePrice * yearTrend * monthTrend * seasonal * noise);

                ins2.run(state, district, propertyType, 'sale', price, month, year);
                inserted += 1;
              }

              // ── RENT history (monthly rent is ~0.5-0.8% of purchase price) ─
              const keyRent = `${state}|${district}|${propertyType}|rent|${year}|${month}`;
              if (!existingHistory.has(keyRent)) {
                const rentMultiplier = propertyType === 'plot' ? 0.002 : 0.006;
                const yearTrend = 1 + (year - 2024) * 0.05;
                const monthTrend = 1 + (month - 1) * 0.005;
                const seasonal = 1 + Math.sin((month / 12) * Math.PI * 2) * 0.02;
                const noise = 0.92 + Math.random() * 0.16;
                const rentPrice = Math.round(basePrice * rentMultiplier * yearTrend * monthTrend * seasonal * noise);

                ins2.run(state, district, propertyType, 'rent', rentPrice, month, year);
                inserted += 1;
              }
            }
          }
        }
      }
    }
  });

  tx2();
  if (inserted > 0) {
    console.log(`✅ Price history inserted/updated: ${inserted} rows for 2024-2025 across multiple states`);
  } else {
    console.log('✅ Price history already up-to-date for 2024-2025');
  }

  console.log('🎉 Database ready!');
  console.log(`   Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`   Demo buyer:  harpreet@demo.com / Buyer@123`);
}

seed().catch(console.error);
