# PropEstate360 v4 — Real Estate Platform

A full-featured real estate platform with role-based dashboards, agent approval flow, EMI calculator, and proper state-district mapping across India.

---

## 🚀 What's New in v4

### ✅ Bug Fixes
- **State-district mapping fixed**: Properties in Jalandhar, Amritsar etc. now correctly appear under Punjab, not duplicated/misplaced
- **Agent role replaces "Seller"**: Cleaner role system — `buyer`, `agent`, `admin`
- **Uploaded images displayed correctly**: High-quality images served from backend with proper URL paths

### 🏠 Role System
| Role   | Can List | Browse | Wishlist | EMI Calc | Admin Panel |
|--------|----------|--------|----------|----------|-------------|
| Buyer  | ❌       | ✅     | ✅       | ✅       | ❌          |
| Agent  | ✅       | ✅     | ✅       | ❌       | ❌          |
| Admin  | ✅       | ✅     | ✅       | ❌       | ✅          |

### 🔐 Agent Registration Flow
1. New agent registers → status = **pending**
2. Login blocked until approved
3. Admin sees **⚠️ Pending Agents** badge in admin panel
4. Admin approves/rejects from **Agents** tab
5. **Hard limit: 10 agents** at any time (pending + approved combined)
6. Deleting an agent frees up a slot

### 🏦 Buyer Dashboard — New Features
- **EMI Calculator**: Calculate monthly installments for any loan amount, rate, and tenure
  - No external APIs — pure math
  - Quick-fill from wishlisted sale properties (80% LTV)
  - Bank rate reference table (SBI, HDFC, ICICI, etc.)
- **Trending Properties**: Based on wishlist activity from user's preferred districts
- **Wishlist with EMI link**: Direct "Calculate EMI" CTA from wishlist

### 🏗️ Property Listing — New Fields
- **Number of Floors**: Total floors in the building
- **Vastu**: New amenity option (highlighted with 🕉️)
- **STATE_DISTRICTS**: Dropdown auto-populates for known states (Punjab, Haryana, Delhi, Maharashtra, 15+ states)

### 👤 Agent Dashboard
- **Only sees own listings** (data separation enforced on backend via `posted_by` filter)
- No EMI calculator, No "List Property" from buyer dashboard
- Property status management (active/sold/rented/inactive)

### 👑 Admin Dashboard
- **Agents tab**: Approve/reject agent registrations, see all agent statuses
- **Agent slots**: Live count of available agent slots (10 - current agents)
- **Properties**: Floors column added, state column added
- All original analytics, user management, enquiries retained

---

## 📁 Project Structure

```
PropEstate360_v4/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.js    # SQLite schema + migration-safe ALTER TABLE
│   │   │   ├── seed.js        # Admin + 1 demo buyer (no demo agents)
│   │   │   └── migrate.js
│   │   ├── routes/
│   │   │   ├── auth.js        # Registration with agent pending flow
│   │   │   ├── admin.js       # Agent approve/reject endpoints
│   │   │   ├── properties.js  # Floors, trending, state-district fix
│   │   │   ├── enquiries.js
│   │   │   └── ai.js
│   │   ├── middleware/auth.js
│   │   ├── utils/mailer.js
│   │   └── server.js
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # All role-differentiated dashboards
│   │   ├── api.ts             # + calcEMI, getTrending, getWishlistIds, approveAgent
│   │   ├── constants.ts       # + Vastu, STATE_DISTRICTS for 15+ states
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── README.md
```

---

## ⚡ Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env   # Edit admin credentials
npm run seed           # Creates admin + 1 demo buyer
npm run dev            # Starts on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # Starts on http://localhost:5173
```

---

## 🔑 Default Credentials

| Role  | Email                        | Password          |
|-------|------------------------------|-------------------|
| Admin | arpan@propestate360.com      | Admin@Secure123   |
| Buyer | harpreet@demo.com            | Buyer@123         |

**No demo agents** — register a real agent account (requires admin approval).

---

## 🗄️ Database

SQLite (`backend/data/propestate360.db`)

### Key Tables
- `users` — `role` (buyer/agent/admin), `agent_status` (approved/pending/rejected)
- `properties` — `floors`, `state`, `district` (correctly mapped)
- `wishlist` — Used for trending calculation
- `price_history` — Punjab district price trends

### Migration Safe
Running v4 on an existing v3 database auto-adds missing columns (`floors`, `agent_status`) via `ALTER TABLE IF NOT EXISTS`.

---

## 📸 Image Uploads

- Max **15MB** per image (increased from 10MB)
- Stored in `backend/uploads/`
- Served at `http://localhost:3001/uploads/<filename>`
- Frontend auto-prefixes `/uploads/` paths with backend URL

---

## 🔧 Environment Variables (.env)

```env
PORT=3001
JWT_SECRET=your-secret-key-here
DB_PATH=./data/propestate360.db
ADMIN_NAME=Arpan
ADMIN_EMAIL=arpan@propestate360.com
ADMIN_PASSWORD=Admin@Secure123
ADMIN_PHONE=9900112233
FRONTEND_URL=http://localhost:5173
# Optional: Gmail for real OTP emails
GMAIL_USER=your@gmail.com
GMAIL_PASS=your-app-password
```

---

## 🏡 Features Overview

- **Home**: Featured properties, stats, India map link
- **Properties Page**: Filter by state, district (dropdown for known states), type, price, BHK
- **Property Detail**: Gallery, floors info, Vastu badge, agent contact, WhatsApp link, enquiry form
- **Price Trends**: Historical price/sqft charts by district and property type
- **India States**: Browse properties by state → district
- **AI Assistant**: Property Q&A powered by Claude API
- **Buyer Dashboard**: Wishlist, Trending, EMI Calculator, Enquiries
- **Agent Dashboard**: My Listings (own only), Enquiries
- **Admin Dashboard**: Stats, Agent Approval, Properties, Users, Enquiries, Analytics
