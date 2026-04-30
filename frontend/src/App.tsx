import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api, saveUser, loadUser, clearUser, fmtPrice, timeAgo, calcEMI } from './api';
import { INDIA_STATES, PUNJAB_DISTRICTS, PROPERTY_TYPES, AMENITIES_LIST, TYPE_EMOJI, STATE_DISTRICTS } from './constants';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
interface User {
  id: string; name: string; email: string; phone: string;
  role: 'buyer' | 'agent' | 'admin'; agent_status?: string; email_verified: number; is_restricted: number; about?: string;
}
interface Property {
  id: string; title: string; type: string; listing: string; state: string;
  district: string; locality: string; price: number; area: number;
  beds: number; baths: number; description: string; amenities: string[];
  featured: boolean; status: string; posted_by: string;
  agent_name: string; agent_phone: string; agent_email: string;
  floors: number; photos: string[]; created_at: string;
}
interface Toast { msg: string; type: 'ok' | 'err'; }

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL STYLES
// ═══════════════════════════════════════════════════════════════════════════
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
:root{
  --blue:#1e3a8a;--blue2:#2563eb;--blue3:#3b82f6;--blue4:#93c5fd;--blue5:#eff6ff;
  --teal:#0f766e;--teal2:#14b8a6;
  --slate:#475569;--slate2:#64748b;--slate3:#94a3b8;--slate4:#cbd5e1;--slate5:#f1f5f9;--slate6:#f8fafc;
  --white:#ffffff;--dark:#0f172a;
  --red:#dc2626;--green:#16a34a;--amber:#d97706;
  --shadow-sm:0 1px 3px rgba(0,0,0,.08);
  --shadow:0 4px 16px rgba(30,58,138,.1);
  --shadow-lg:0 12px 40px rgba(30,58,138,.15);
  --radius:12px;--radius-sm:8px;--radius-lg:18px;--radius-xl:24px;
}
html{scroll-behavior:smooth}
body{font-family:'Inter',sans-serif;background:var(--slate6);color:var(--dark);line-height:1.6}
.serif{font-family:'Playfair Display',serif}
.container{max-width:1280px;margin:0 auto;padding:0 24px}
.grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px}
.grid3{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
.grid4{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.flex{display:flex;align-items:center}
.flex-col{display:flex;flex-direction:column}
.gap4{gap:4px}.gap8{gap:8px}.gap12{gap:12px}.gap16{gap:16px}.gap20{gap:20px}.gap24{gap:24px}

/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 22px;border:none;border-radius:var(--radius);font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none;white-space:nowrap}
.btn-primary{background:var(--blue);color:#fff}.btn-primary:hover{background:#1e40af;box-shadow:var(--shadow)}
.btn-blue2{background:var(--blue2);color:#fff}.btn-blue2:hover{background:var(--blue);transform:translateY(-1px);box-shadow:var(--shadow)}
.btn-outline{background:transparent;color:var(--blue);border:2px solid var(--blue)}.btn-outline:hover{background:var(--blue);color:#fff}
.btn-ghost{background:transparent;color:var(--slate);border:1.5px solid var(--slate4)}.btn-ghost:hover{background:var(--slate5);border-color:var(--slate3)}
.btn-red{background:var(--red);color:#fff}.btn-red:hover{background:#b91c1c}
.btn-green{background:var(--green);color:#fff}.btn-green:hover{background:#15803d}
.btn-sm{padding:7px 14px;font-size:13px}
.btn-lg{padding:14px 32px;font-size:16px}
.btn:disabled{opacity:.5;cursor:not-allowed;pointer-events:none}

/* Inputs */
.inp{width:100%;padding:11px 14px;border:1.5px solid var(--slate4);border-radius:var(--radius);font-family:'Inter',sans-serif;font-size:14px;background:var(--white);outline:none;transition:all .2s;color:var(--dark)}
.inp:focus{border-color:var(--blue2);box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.inp::placeholder{color:var(--slate3)}
.sel{padding:10px 14px;border:1.5px solid var(--slate4);border-radius:var(--radius);font-family:'Inter',sans-serif;font-size:14px;background:var(--white);outline:none;color:var(--dark);cursor:pointer;transition:border .2s}
.sel:focus{border-color:var(--blue2)}
.lbl{display:block;font-size:13px;font-weight:600;color:var(--slate);margin-bottom:5px}

/* Cards */
.card{background:var(--white);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);border:1px solid var(--slate4);overflow:hidden;transition:all .25s}
.card:hover{transform:translateY(-3px);box-shadow:var(--shadow-lg)}
.card-flat{background:var(--white);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);border:1px solid var(--slate4);overflow:hidden}

/* Badges */
.badge{display:inline-flex;align-items:center;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:.3px}
.badge-blue{background:var(--blue5);color:var(--blue)}
.badge-teal{background:#f0fdfa;color:var(--teal)}
.badge-red{background:#fef2f2;color:var(--red)}
.badge-green{background:#f0fdf4;color:var(--green)}
.badge-amber{background:#fffbeb;color:var(--amber)}
.badge-slate{background:var(--slate5);color:var(--slate)}

/* Toast */
.toast{position:fixed;bottom:28px;right:28px;padding:14px 22px;border-radius:var(--radius);font-weight:600;font-size:14px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.2);animation:slideIn .3s ease;display:flex;align-items:center;gap:8px;max-width:340px}
@keyframes slideIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}

/* OTP boxes */
.otp-input{width:50px;height:58px;border:2px solid var(--slate4);border-radius:var(--radius);text-align:center;font-size:22px;font-weight:700;color:var(--blue);font-family:'Inter',sans-serif;outline:none;transition:all .2s;background:var(--white)}
.otp-input:focus{border-color:var(--blue2);box-shadow:0 0 0 3px rgba(37,99,235,.15);transform:scale(1.05)}

/* Chip filters */
.chip{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;border:1.5px solid var(--slate4);background:var(--white);color:var(--slate);user-select:none}
.chip:hover{border-color:var(--blue2);color:var(--blue)}
.chip.active{background:var(--blue);color:#fff;border-color:var(--blue)}

/* Nav link */
.nav-link{color:var(--slate);font-weight:500;font-size:14px;cursor:pointer;padding:6px 12px;border-radius:var(--radius-sm);transition:all .2s;text-decoration:none;white-space:nowrap}
.nav-link:hover{background:var(--blue5);color:var(--blue)}
.nav-link.active{color:var(--blue);font-weight:600}

/* Sidebar item */
.side-item{display:flex;align-items:center;gap:10px;padding:11px 16px;border-radius:var(--radius);cursor:pointer;font-weight:500;font-size:14px;transition:all .2s;color:var(--slate)}
.side-item:hover{background:var(--blue5);color:var(--blue)}
.side-item.active{background:var(--blue);color:#fff}

/* Upload zone */
.upload-zone{border:2px dashed var(--slate4);border-radius:var(--radius-lg);padding:36px;text-align:center;cursor:pointer;transition:all .2s;background:var(--slate6)}
.upload-zone:hover,.upload-zone.drag{border-color:var(--blue2);background:var(--blue5)}

/* Stat card */
.stat-card{background:var(--white);border-radius:var(--radius-lg);padding:24px;border:1px solid var(--slate4);box-shadow:var(--shadow-sm)}

/* Section */
.section{padding:64px 0}
.section-title{font-family:'Playfair Display',serif;font-size:clamp(26px,4vw,38px);font-weight:700;color:var(--dark)}
.section-sub{color:var(--slate2);font-size:16px;margin-top:8px}

/* AI chat bubbles */
.bubble-user{background:var(--blue);color:#fff;border-radius:18px 18px 4px 18px;padding:12px 18px;max-width:80%;align-self:flex-end;font-size:14px;line-height:1.7}
.bubble-ai{background:var(--white);color:var(--dark);border-radius:18px 18px 18px 4px;padding:14px 18px;max-width:88%;align-self:flex-start;border:1px solid var(--slate4);font-size:14px;line-height:1.7;box-shadow:var(--shadow-sm)}
.bubble-ai table{border-collapse:collapse;margin:8px 0;width:100%}
.bubble-ai td,.bubble-ai th{padding:6px 10px;border:1px solid var(--slate4);font-size:13px}
.bubble-ai th{background:var(--slate5);font-weight:600}
.bubble-ai strong{color:var(--blue);font-weight:700}
.bubble-ai ul,.bubble-ai ol{padding-left:20px;margin:6px 0}

/* Pulse animation */
.pulse{animation:pulse 1.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}

/* Table */
.table{width:100%;border-collapse:collapse}
.table th{background:var(--blue);color:#fff;padding:12px 16px;font-size:13px;font-weight:600;text-align:left}
.table td{padding:11px 16px;border-bottom:1px solid var(--slate5);font-size:13px;color:var(--slate)}
.table tr:hover td{background:var(--slate6)}
.table tr:last-child td{border-bottom:none}

/* Progress bar */
.progress{height:6px;border-radius:3px;background:var(--slate4);overflow:hidden}
.progress-bar{height:100%;background:var(--blue2);transition:width .4s ease}

/* Scrollbar */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:var(--slate5)}
::-webkit-scrollbar-thumb{background:var(--slate3);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--slate2)}

/* Responsive */
@media(max-width:768px){
  .container{padding:0 16px}
  .grid2,.grid3,.grid4{grid-template-columns:1fr}
  .hide-mobile{display:none!important}
  .section{padding:40px 0}
}
`;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
type Page = 'home'|'properties'|'detail'|'login'|'register'|'dashboard'|'admin'|'ai'|'list'|'trends'|'states';

export default function App() {
  const [page, setPage]   = useState<Page>('home');
  const [pageData, setPageData] = useState<any>(null);
  const [user, setUser]   = useState<User | null>(loadUser);
  const [toast, setToast] = useState<Toast | null>(null);

  const msg = useCallback((m: string, type: 'ok'|'err' = 'ok') => {
    setToast({ msg: m, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const nav = (p: Page, data?: any) => {
    setPage(p); setPageData(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const doLogin = async (email: string, password: string) => {
    const d = await api.login(email, password);
    saveUser(d.token, d.user);
    setUser(d.user);
    return d.user;
  };

  const doLogout = () => { clearUser(); setUser(null); nav('home'); };

  const ctx = { nav, user, setUser, doLogin, doLogout, msg };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--slate6)', color: 'var(--dark)' }}>
      <style>{STYLES}</style>
      <Navbar {...ctx} page={page} />

      {page === 'home'       && <Home {...ctx} />}
      {page === 'properties' && <PropertiesPage {...ctx} filters={pageData} />}
      {page === 'detail'     && <PropertyDetail {...ctx} id={pageData} />}
      {page === 'login'      && <LoginPage {...ctx} />}
      {page === 'register'   && <RegisterPage {...ctx} />}
      {page === 'dashboard'  && <Dashboard {...ctx} />}
      {page === 'admin'      && <AdminPanel {...ctx} />}
      {page === 'ai'         && <AIAssistant {...ctx} />}
      {page === 'list'       && <ListProperty {...ctx} editId={pageData} />}
      {page === 'trends'     && <PriceTrends {...ctx} />}
      {page === 'states'     && <IndiaStatesPage {...ctx} />}

      <Footer nav={nav} />

      {toast && (
        <div className="toast" style={{ background: toast.type === 'ok' ? '#16a34a' : '#dc2626', color: '#fff' }}>
          <span style={{ fontSize: 18 }}>{toast.type === 'ok' ? '✓' : '✗'}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════════════════════
function Navbar({ nav, user, doLogout, page }: any) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav style={{
      background: '#fff', borderBottom: '1px solid var(--slate4)',
      position: 'sticky', top: 0, zIndex: 200,
      boxShadow: '0 2px 12px rgba(30,58,138,.06)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 66 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => nav('home')}>
          <div style={{
            width: 42, height: 42, background: 'linear-gradient(135deg,var(--blue),var(--blue2))',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>🏡</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color: 'var(--dark)', lineHeight: 1 }}>
              PropEstate<span style={{ color: 'var(--blue2)' }}>360</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--slate3)', fontWeight: 600, letterSpacing: .8, textTransform: 'uppercase' }}>Punjab Real Estate</div>
          </div>
        </div>

        {/* Desktop nav */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className={`nav-link ${page==='home'?'active':''}`} onClick={() => nav('home')}>Home</span>
          <span className={`nav-link ${page==='properties'?'active':''}`} onClick={() => nav('properties')}>Properties</span>
          <span className={`nav-link ${page==='trends'?'active':''}`} onClick={() => nav('trends')}>📊 Trends</span>
          <span className={`nav-link ${page==='states'?'active':''}`} onClick={() => nav('states')}>🗺️ India</span>
          <span className={`nav-link ${page==='ai'?'active':''}`} onClick={() => nav('ai')}>🤖 AI</span>
          {user && (user.role === 'agent' || user.role === 'admin') && (
            <span className={`nav-link ${page==='list'?'active':''}`} onClick={() => nav('list')}>+ List Property</span>
          )}
          {user?.role === 'admin' && (
            <span className="nav-link" style={{ color: 'var(--blue)', fontWeight: 700 }} onClick={() => nav('admin')}>⚙ Admin</span>
          )}
        </div>

        {/* Auth buttons */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user ? (
            <>
              <div onClick={() => nav('dashboard')} style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '6px 12px', borderRadius: 40, background: 'var(--blue5)',
              }}>
                <div style={{
                  width: 30, height: 30, background: 'var(--blue)', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13,
                }}>{user.name[0]}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>{user.name.split(' ')[0]}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={doLogout}>Logout</button>
            </>
          ) : (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => nav('login')}>Login</button>
              <button className="btn btn-blue2 btn-sm" onClick={() => nav('register')}>Register</button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="btn btn-ghost btn-sm"
          style={{ display: 'none' }}
          onClick={() => setMobileOpen(!mobileOpen)}
        >☰</button>
      </div>

      {/* Mobile menu placeholder — hidden via CSS above for brevity */}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════

function Home({ nav, user, msg }: any) {
  const [featured, setFeatured]     = useState<Property[]>([]);
  const [stats, setStats]           = useState({ properties: { total: 0, active: 0 }, users: { total: 0 } });
  const [heroSearch, setHeroSearch] = useState('');
  const [heroListing, setHeroListing] = useState('sale');
  const [heroDistrict, setHeroDistrict] = useState('');

  useEffect(() => {
    api.getProperties({ featured: '1', status: 'active' })
      .then(d => setFeatured(d.properties.slice(0, 6)))
      .catch(() => {});
    api.adminStats().catch(() => {}).then(d => d && setStats(d));
  }, []);

  const handleSearch = () => {
    nav('properties', { q: heroSearch, listing: heroListing, district: heroDistrict });
  };

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--blue) 0%, #1e40af 50%, #1d4ed8 100%)',
        padding: '80px 0 60px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: [400, 250, 180][i], height: [400, 250, 180][i],
            borderRadius: '50%', border: '1px solid rgba(255,255,255,.08)',
            top: ['-100px', '20px', '60px'][i], right: ['-100px', '10%', '25%'][i],
            pointerEvents: 'none',
          }} />
        ))}

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.1)',
              padding: '6px 18px', borderRadius: 40, marginBottom: 20,
            }}>
              <span style={{ fontSize: 12 }}>🌟</span>
              <span style={{ color: '#bfdbfe', fontSize: 13, fontWeight: 600 }}>Punjab's #1 Real Estate Platform</span>
            </div>
            <h1 className="serif" style={{
              fontSize: 'clamp(32px, 6vw, 60px)', color: '#fff', fontWeight: 800, lineHeight: 1.2, marginBottom: 16,
            }}>
              Find Your Dream Property<br />
              <span style={{ color: '#93c5fd' }}>Across Punjab</span>
            </h1>
            <p style={{ color: '#bfdbfe', fontSize: 18, maxWidth: 500, margin: '0 auto' }}>
              23 districts · 1000s of listings · Trusted agents · Real prices
            </p>
          </div>

          {/* Search box */}
          <div style={{
            background: '#fff', borderRadius: 24, padding: 8,
            maxWidth: 820, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap',
            boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          }}>
            <select
              className="sel"
              value={heroListing}
              onChange={e => setHeroListing(e.target.value)}
              style={{ flex: '0 0 130px', border: 'none', background: 'var(--blue5)', color: 'var(--blue)', fontWeight: 600 }}
            >
              <option value="sale">🏠 Buy</option>
              <option value="rent">🔑 Rent</option>
            </select>
            <select
              className="sel"
              value={heroDistrict}
              onChange={e => setHeroDistrict(e.target.value)}
              style={{ flex: '0 0 180px', border: 'none' }}
            >
              <option value="">All Districts</option>
              {PUNJAB_DISTRICTS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
            <input
              className="inp"
              style={{ flex: 1, minWidth: 160, border: 'none' }}
              placeholder="Search by area, locality..."
              value={heroSearch}
              onChange={e => setHeroSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn btn-blue2" style={{ padding: '10px 28px' }} onClick={handleSearch}>
              🔍 Search
            </button>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 40, flexWrap: 'wrap' }}>
            {[
              { label: 'Active Listings', value: stats.properties?.active || '100+' },
              { label: 'Districts Covered', value: '23' },
              { label: 'Verified Agents', value: stats.users?.agents || '10+' },
              { label: 'Happy Customers', value: '500+' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#93c5fd' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick type filters */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--slate4)', padding: '16px 0' }}>
        <div className="container" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { label: 'All', v: '' }, { label: '🏠 Houses', v: 'house' },
            { label: '🏡 Villas', v: 'villa' }, { label: '🏢 Apartments', v: 'apartment' },
            { label: '📐 Plots', v: 'plot' }, { label: '🏪 Shops', v: 'shop' },
            { label: '🛏️ PG', v: 'pg' },
          ].map(t => (
            <span key={t.v} className="chip" onClick={() => nav('properties', { type: t.v })}>{t.label}</span>
          ))}
        </div>
      </div>

      {/* Featured */}
      <div className="section">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
            <div>
              <h2 className="section-title">Featured Properties</h2>
              <p className="section-sub">Hand-picked premium listings across Punjab</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => nav('properties')}>View All →</button>
          </div>
          {featured.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--slate2)' }}>
              <div style={{ fontSize: 48 }}>🏗️</div>
              <p>Loading properties...</p>
            </div>
          ) : (
            <div className="grid2">
              {featured.map(p => <PropertyCard key={p.id} prop={p} nav={nav} />)}
            </div>
          )}
        </div>
      </div>

      {/* Districts grid */}
      <div style={{ background: 'var(--blue5)', padding: '64px 0' }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 8 }}>Explore by District</h2>
          <p className="section-sub" style={{ textAlign: 'center', marginBottom: 36 }}>All 23 districts of Punjab — capital Chandigarh</p>
          <div className="grid4">
            {PUNJAB_DISTRICTS.slice(0, 12).map(d => (
              <div
                key={d.name}
                onClick={() => nav('properties', { district: d.name })}
                className="card"
                style={{ padding: '20px', cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🏙️</div>
                <div style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 14 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 2 }}>HQ: {d.hq}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="btn btn-primary" onClick={() => nav('properties')}>View All Districts →</button>
          </div>
        </div>
      </div>

      {/* Why us */}
      <div className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 8 }}>Why PropEstate360?</h2>
          <p className="section-sub" style={{ textAlign: 'center', marginBottom: 48 }}>Built exclusively for Punjab's real estate market</p>
          <div className="grid3">
            {[
              { icon: '🔍', title: 'Smart Search', desc: 'Filter by district, type, price, BHK — find exactly what you want.' },
              { icon: '📊', title: 'Price Trends', desc: 'Real market data showing price appreciation in every district.' },
              { icon: '🤖', title: 'AI Assistant', desc: 'Get instant answers, EMI calculations, and investment advice.' },
              { icon: '🔒', title: 'Verified Listings', desc: 'Every property verified with agent contacts and details.' },
              { icon: '📱', title: 'Real OTP Verification', desc: 'Secure email OTP during registration — no fake accounts.' },
              { icon: '⚡', title: 'Instant Enquiry', desc: 'Contact agents directly — phone, email, WhatsApp.' },
            ].map(f => (
              <div key={f.title} className="card-flat" style={{ padding: 28 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: 'var(--slate2)', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      {!user && (
        <div style={{ background: 'linear-gradient(135deg,var(--blue),#1d4ed8)', padding: '60px 0' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <h2 className="serif" style={{ color: '#fff', fontSize: 36, marginBottom: 12 }}>Ready to Find Your Property?</h2>
            <p style={{ color: '#bfdbfe', marginBottom: 32, fontSize: 16 }}>Join thousands of buyers, sellers and renters on Punjab's best platform.</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn" style={{ background: '#fff', color: 'var(--blue)', fontWeight: 700, padding: '14px 32px' }} onClick={() => nav('register')}>
                Register Free
              </button>
              <button className="btn btn-outline" style={{ color: '#fff', borderColor: '#fff', padding: '14px 32px' }} onClick={() => nav('properties')}>
                Browse Properties
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// helper to reference CSS vars in inline styles




// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY CARD
// ═══════════════════════════════════════════════════════════════════════════

function PropertyCard({ prop: p, nav }: { prop: Property; nav: any }) {
  const [wishlisted, setWishlisted] = useState(false);
  const rawImg = p.photos?.[0] || `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=95`;
  const img = rawImg.startsWith('/uploads/') ? `http://localhost:3001${rawImg}` : rawImg;
  const listingColor = p.listing === 'rent' ? 'var(--teal)' : 'var(--blue)';

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const d = await api.toggleWishlist(p.id);
      setWishlisted(d.wishlisted);
    } catch {
      nav('login');
    }
  };

  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={() => nav('detail', p.id)}>
      {/* Image */}
      <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
        <img
          src={img} alt={p.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .35s' }}
          onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
          onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=95'; }}
        />
        {/* Listing badge */}
        <div style={{
          position: 'absolute', top: 12, left: 12,
          background: listingColor, color: '#fff',
          padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: .5,
        }}>
          {p.listing === 'rent' ? 'FOR RENT' : 'FOR SALE'}
        </div>
        {/* Type emoji */}
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(255,255,255,.9)', borderRadius: 8, padding: '4px 8px', fontSize: 16,
        }}>
          {TYPE_EMOJI[p.type] || '🏠'}
        </div>
        {p.featured && (
          <div style={{
            position: 'absolute', bottom: 12, left: 12,
            background: '#f59e0b', color: '#fff',
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          }}>⭐ FEATURED</div>
        )}
        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          style={{
            position: 'absolute', bottom: 12, right: 12,
            background: wishlisted ? '#dc2626' : 'rgba(255,255,255,.9)',
            border: 'none', borderRadius: '50%', width: 34, height: 34,
            fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,.15)',
          }}>
          {wishlisted ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: listingColor, marginBottom: 4 }}>
          {fmtPrice(p.price, p.listing)}
        </div>
        <h3 style={{ fontWeight: 600, fontSize: 15, color: 'var(--dark)', marginBottom: 8, lineHeight: 1.4 }}>
          {p.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--slate2)', fontSize: 13, marginBottom: 12 }}>
          📍 {p.locality ? `${p.locality}, ` : ''}{p.district}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 16, padding: '10px 0', borderTop: '1px solid var(--slate5)',
          color: 'var(--slate2)', fontSize: 13,
        }}>
          {p.beds > 0 && <span>🛏 {p.beds} BHK</span>}
          {p.baths > 0 && <span>🚿 {p.baths}</span>}
          {p.area > 0 && <span>📐 {p.area.toLocaleString()} sqft</span>}
          {p.price_per_sqft && p.price_per_sqft > 0 && (
            <span style={{ color:'var(--blue2)', fontWeight:600 }}>₹{p.price_per_sqft.toLocaleString('en-IN')}/sqft</span>
          )}
          <span style={{ marginLeft: 'auto' }}>{TYPE_EMOJI[p.type]} {p.type}</span>
        </div>

        {/* Agent */}
        {p.agent_name && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
            padding: '8px 10px', background: 'var(--blue5)', borderRadius: 8,
          }}>
            <div style={{
              width: 26, height: 26, background: 'var(--blue)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700,
            }}>{p.agent_name[0]}</div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--slate2)' }}>Listed by</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>{p.agent_name}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTIES PAGE
// ═══════════════════════════════════════════════════════════════════════════

function PropertiesPage({ nav, user, msg, filters: initFilters }: any) {
  const [props, setProps]       = useState<Property[]>([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [filters, setFilters]   = useState({
    listing: '', state: '', district: '', type: '', beds: '', q: '', sort: '',
    minPrice: '', maxPrice: '',
    ...initFilters,
  });

  const fetchProps = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = String(v); });
    try {
      const d = await api.getProperties(params);
      setProps(d.properties);
      setTotal(d.total);
    } catch { msg('Failed to load properties', 'err'); }
    setLoading(false);
  };

  useEffect(() => { fetchProps(); }, [filters]);

  const upd = (k: string, v: string) => setFilters((f: any) => ({ ...f, [k]: v }));
  const reset = () => setFilters({ listing:'',state:'',district:'',type:'',beds:'',q:'',sort:'',minPrice:'',maxPrice:'' });

  return (
    <div style={{ padding: '32px 0 64px' }}>
      <div className="container">
        <div style={{ marginBottom: 28 }}>
          <h1 className="serif" style={{ fontSize: 32, color: 'var(--dark)', marginBottom: 4 }}>
            Properties{filters.state ? ` in ${filters.state}` : filters.district ? ` in ${filters.district}` : ''}
          </h1>
          <p style={{ color: 'var(--slate2)' }}>{total} {total === 1 ? 'property' : 'properties'} found</p>
        </div>

        {/* Filters panel */}
        <div className="card-flat" style={{ padding: 20, marginBottom: 28 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <div>
              <label className="lbl">Search</label>
              <input className="inp" style={{ width: 220 }} placeholder="Locality, title..."
                value={filters.q} onChange={e => upd('q', e.target.value)} />
            </div>
            <div>
              <label className="lbl">Listing</label>
              <select className="sel" value={filters.listing} onChange={e => upd('listing', e.target.value)}>
                <option value="">All</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>
            <div>
              <label className="lbl">State</label>
              <select className="sel" value={filters.state} onChange={e => { upd('state', e.target.value); upd('district',''); }}>
                <option value="">All States</option>
                {INDIA_STATES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">District</label>
              {STATE_DISTRICTS[filters.state] ? (
                <select className="sel" value={filters.district} onChange={e => upd('district', e.target.value)}>
                  <option value="">All Districts</option>
                  {(STATE_DISTRICTS[filters.state] || []).map((d: string) => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input className="inp" value={filters.district} placeholder="Enter district"
                  onChange={e => upd('district', e.target.value)} style={{ width:140 }} />
              )}
            </div>
            <div>
              <label className="lbl">Type</label>
              <select className="sel" value={filters.type} onChange={e => upd('type', e.target.value)}>
                <option value="">All Types</option>
                {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">BHK</label>
              <select className="sel" value={filters.beds} onChange={e => upd('beds', e.target.value)}>
                <option value="">Any</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Sort by</label>
              <select className="sel" value={filters.sort} onChange={e => upd('sort', e.target.value)}>
                <option value="">Featured first</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
                <option value="newest">Newest</option>
              </select>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={reset}>✕ Clear</button>
          </div>

          {/* Price range */}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="lbl">Min Price (₹)</label>
              <input className="inp" style={{ width: 160 }} type="number" placeholder="e.g. 500000"
                value={filters.minPrice} onChange={e => upd('minPrice', e.target.value)} />
            </div>
            <div>
              <label className="lbl">Max Price (₹)</label>
              <input className="inp" style={{ width: 160 }} type="number" placeholder="e.g. 10000000"
                value={filters.maxPrice} onChange={e => upd('maxPrice', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Under 20L', max: '2000000' },
                { label: '20L–50L',   min: '2000000',  max: '5000000' },
                { label: '50L–1Cr',   min: '5000000',  max: '10000000' },
                { label: 'Above 1Cr', min: '10000000' },
              ].map(r => (
                <span key={r.label} className="chip"
                  onClick={() => setFilters((f: any) => ({ ...f, minPrice: r.min || '', maxPrice: r.max || '' }))}>
                  {r.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48 }} className="pulse">🏠</div>
            <p style={{ color: 'var(--slate2)', marginTop: 16 }}>Loading properties...</p>
          </div>
        ) : props.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--slate2)' }}>
            <div style={{ fontSize: 64 }}>🔍</div>
            <h3 style={{ marginTop: 16 }}>No properties found</h3>
            <p>Try adjusting your filters</p>
            <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={reset}>Clear All Filters</button>
          </div>
        ) : (
          <div className="grid2">
            {props.map(p => <PropertyCard key={p.id} prop={p} nav={nav} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY DETAIL
// ═══════════════════════════════════════════════════════════════════════════

function PropertyDetail({ nav, user, msg, id }: any) {
  const [prop, setProp]       = useState<Property | null>(null);
  const [imgIdx, setImgIdx]   = useState(0);
  const [enquiryMsg, setEnquiryMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getProperty(id).then(d => { setProp(d.property); }).catch(() => msg('Property not found', 'err'));
  }, [id]);

  if (!prop) return (
    <div style={{ textAlign: 'center', padding: 100 }}>
      <div className="pulse" style={{ fontSize: 64 }}>🏡</div>
    </div>
  );

  const imgs = prop.photos?.length ? prop.photos.map((p: string) => p.startsWith('/uploads/') ? `http://localhost:3001${p}` : p) : [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=95',
  ];

  const handleEnquiry = async () => {
    if (!user) { nav('login'); return; }
    if (!enquiryMsg.trim()) { msg('Please write a message', 'err'); return; }
    setSending(true);
    try {
      await api.sendEnquiry(prop.id, enquiryMsg, user.phone);
      msg('Enquiry sent! Agent will contact you soon ✓');
      setEnquiryMsg('');
    } catch (e: any) { msg(e.message, 'err'); }
    setSending(false);
  };

  const handleWishlist = async () => {
    if (!user) { nav('login'); return; }
    try {
      const d = await api.toggleWishlist(prop.id);
      setWishlisted(d.wishlisted);
      msg(d.wishlisted ? 'Added to wishlist ♥' : 'Removed from wishlist');
    } catch (e: any) { msg(e.message, 'err'); }
  };

  const listingColor = prop.listing === 'rent' ? 'var(--teal)' : 'var(--blue)';

  return (
    <div style={{ padding: '28px 0 64px' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: 6, fontSize: 13, color: 'var(--slate2)', marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer', color: 'var(--blue)' }} onClick={() => nav('home')}>Home</span>
          <span>›</span>
          <span style={{ cursor: 'pointer', color: 'var(--blue)' }} onClick={() => nav('properties')}>Properties</span>
          <span>›</span>
          <span>{prop.title}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' }}>
          {/* Left column */}
          <div>
            {/* Gallery */}
            <div className="card-flat" style={{ overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ position: 'relative', height: 420, overflow: 'hidden', background: '#0f172a' }}>
                <img
                  src={imgs[imgIdx]} alt={prop.title}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'auto' }}
                  onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=95'; }}
                />
                <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
                  <div style={{ background: listingColor, color: '#fff', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                    {prop.listing === 'rent' ? 'FOR RENT' : 'FOR SALE'}
                  </div>
                  {prop.featured && (
                    <div style={{ background: '#f59e0b', color: '#fff', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                      ⭐ FEATURED
                    </div>
                  )}
                </div>
                <button
                  onClick={handleWishlist}
                  style={{
                    position: 'absolute', top: 16, right: 16,
                    background: wishlisted ? '#dc2626' : 'rgba(255,255,255,.9)',
                    border: 'none', borderRadius: '50%', width: 42, height: 42,
                    fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {wishlisted ? '❤️' : '🤍'}
                </button>
              </div>
              {imgs.length > 1 && (
                <div style={{ display: 'flex', gap: 8, padding: 12, overflowX: 'auto' }}>
                  {imgs.map((img, i) => (
                    <img key={i} src={img} alt=""
                      style={{
                        width: 80, height: 60, objectFit: 'cover', borderRadius: 8, cursor: 'pointer',
                        border: i === imgIdx ? '3px solid var(--blue2)' : '2px solid transparent',
                        opacity: i === imgIdx ? 1 : 0.7, flexShrink: 0,
                      }}
                      onClick={() => setImgIdx(i)}
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Title & price */}
            <div className="card-flat" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--dark)', marginBottom: 8, lineHeight: 1.3 }}>{prop.title}</h1>
                  <div style={{ color: 'var(--slate2)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                    📍 {prop.locality ? `${prop.locality}, ` : ''}{prop.district}, {prop.state || 'Punjab'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: listingColor }}>{fmtPrice(prop.price, prop.listing)}</div>
                  {prop.area > 0 && prop.listing === 'sale' && (
                    <div style={{ fontSize: 13, color: 'var(--slate2)' }}>
                      ≈ ₹{Math.round(prop.price / prop.area).toLocaleString('en-IN')}/sqft
                    </div>
                  )}
                </div>
              </div>

              {/* Key stats */}
              <div style={{
                display: 'flex', gap: 0, marginTop: 20,
                background: 'var(--blue5)', borderRadius: 12, overflow: 'hidden',
              }}>
                {[
                  { icon: '🛏', label: 'Bedrooms', value: prop.beds || '—' },
                  { icon: '🚿', label: 'Bathrooms', value: prop.baths || '—' },
                  { icon: '📐', label: 'Area', value: prop.area ? `${prop.area.toLocaleString()} sqft` : '—' },
                  { icon: '💰', label: 'Price/sqft', value: prop.price_per_sqft && prop.price_per_sqft > 0 ? `₹${prop.price_per_sqft.toLocaleString('en-IN')}/sqft` : (prop.area > 0 ? `₹${Math.round(prop.price/prop.area).toLocaleString('en-IN')}/sqft` : '—') },
                  { icon: '🏠', label: 'Type', value: prop.type },
                  { icon: '🏗️', label: 'Floors', value: (prop as any).floors > 0 ? String((prop as any).floors) : '—' },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    flex: 1, textAlign: 'center', padding: '16px 8px',
                    borderRight: i < 4 ? '1px solid rgba(30,58,138,.1)' : 'none',
                  }}>
                    <div style={{ fontSize: 22 }}>{s.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)', marginTop: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate2)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            {prop.description && (
              <div className="card-flat" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--blue)' }}>About This Property</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.8, fontSize: 15 }}>{prop.description}</p>
              </div>
            )}

            {/* Amenities */}
            {prop.amenities?.length > 0 && (
              <div className="card-flat" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--blue)' }}>Amenities</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {prop.amenities.map((a: string) => (
                    <span key={a} style={{
                      background: 'var(--blue5)', color: 'var(--blue)',
                      padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                    }}>✓ {a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — contact & enquiry */}
          <div style={{ position: 'sticky', top: 80 }}>
            {/* Agent card */}
            <div className="card-flat" style={{ padding: 24, marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 16 }}>Listed By</h3>
              {prop.agent_name ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 50, height: 50, background: 'linear-gradient(135deg,var(--blue),var(--blue2))',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 20, fontWeight: 700,
                    }}>{prop.agent_name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 16 }}>{prop.agent_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>Property Agent</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {prop.agent_phone && (
                      <a href={`tel:+91${prop.agent_phone}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                          background: 'var(--blue5)', borderRadius: 10, color: 'var(--blue)',
                          textDecoration: 'none', fontWeight: 600, fontSize: 14,
                        }}>
                        📞 {prop.agent_phone}
                      </a>
                    )}
                    {prop.agent_email && (
                      <a href={`mailto:${prop.agent_email}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                          background: '#f0fdfa', borderRadius: 10, color: 'var(--teal)',
                          textDecoration: 'none', fontWeight: 600, fontSize: 14, wordBreak: 'break-all',
                        }}>
                        ✉️ {prop.agent_email}
                      </a>
                    )}
                    {prop.agent_phone && (
                      <a href={`https://wa.me/91${prop.agent_phone}?text=Hi, I'm interested in: ${encodeURIComponent(prop.title)}`}
                        target="_blank" rel="noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                          background: '#dcfce7', borderRadius: 10, color: '#16a34a',
                          textDecoration: 'none', fontWeight: 600, fontSize: 14,
                        }}>
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--slate2)', fontSize: 14 }}>Contact admin for agent details.</p>
              )}
            </div>

            {/* Enquiry form */}
            <div className="card-flat" style={{ padding: 24 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 4 }}>Send Enquiry</h3>
              <p style={{ fontSize: 13, color: 'var(--slate2)', marginBottom: 16 }}>
                {user ? 'Send your message to the agent directly.' : 'Login to send an enquiry.'}
              </p>
              {user ? (
                <>
                  <div style={{
                    display: 'flex', gap: 8, marginBottom: 12,
                    background: 'var(--blue5)', padding: '10px 14px', borderRadius: 10,
                  }}>
                    <div style={{
                      width: 32, height: 32, background: 'var(--blue)', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
                    }}>{user.name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--blue)', fontSize: 13 }}>{user.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--slate2)' }}>{user.email}</div>
                    </div>
                  </div>
                  <textarea
                    className="inp"
                    rows={4}
                    style={{ resize: 'vertical', marginBottom: 12 }}
                    placeholder={`I'm interested in "${prop.title}". Please provide more details...`}
                    value={enquiryMsg}
                    onChange={e => setEnquiryMsg(e.target.value)}
                  />
                  <button className="btn btn-blue2" style={{ width: '100%' }} onClick={handleEnquiry} disabled={sending}>
                    {sending ? 'Sending...' : '📩 Send Enquiry'}
                  </button>
                </>
              ) : (
                <button className="btn btn-blue2" style={{ width: '100%' }} onClick={() => nav('login')}>
                  Login to Enquire
                </button>
              )}
            </div>

            {/* Listed date */}
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--slate3)' }}>
              Listed {timeAgo(prop.created_at)} · ID: {prop.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTER PAGE — Real Email OTP
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// REGISTER PAGE — Real Email OTP (with Agent Pending Support)
// ═══════════════════════════════════════════════════════════════════════════
function RegisterPage({ nav, setUser, msg }: any) {
  const [step, setStep] = useState<1|2|3|4>(1);
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', confirm:'', role:'buyer' });
  const [otp, setOtp]   = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp]   = useState('');
  const otpRefs = useRef<(HTMLInputElement|null)[]>([]);

  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const sendOTP = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      msg('Please fill all fields', 'err'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { msg('Invalid email', 'err'); return; }
    if (!/^[6-9]\d{9}$/.test(form.phone)) { msg('Invalid Indian mobile number', 'err'); return; }
    if (form.password.length < 8) { msg('Password must be 8+ characters', 'err'); return; }
    if (form.password !== form.confirm) { msg('Passwords do not match', 'err'); return; }
    setLoading(true);
    try {
      const d = await api.sendOTP(form.email, form.name);
      if (d.dev_otp) setDevOtp(d.dev_otp);
      msg('OTP sent to your email! Check inbox (and spam folder).'); setStep(2);
    } catch(e:any) { msg(e.message, 'err'); }
    setLoading(false);
  };

  const verifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) { msg('Enter all 6 digits', 'err'); return; }
    setLoading(true);
    try {
      await api.verifyOTP(form.email, code);
      msg('Email verified! ✓'); setStep(3);
    } catch(e:any) { msg(e.message, 'err'); }
    setLoading(false);
  };

  const register = async () => {
    setLoading(true);
    try {
      const d = await api.register(form);
      // Agent pending approval
      if (d.pending) {
        setStep(4); // Show pending screen
        setLoading(false);
        return;
      }
      saveUser(d.token, d.user);
      setUser(d.user);
      msg('Welcome to PropEstate360! 🎉');
      nav('home');
    } catch(e:any) { msg(e.message, 'err'); setStep(1); }
    setLoading(false);
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i-1]?.focus();
  };
  const handleOtpChange = (i: number, v: string) => {
    const digit = v.replace(/\D/,'').slice(-1);
    const next = [...otp]; next[i] = digit;
    setOtp(next);
    if (digit && i < 5) otpRefs.current[i+1]?.focus();
  };

  const ROLE_INFO = {
    buyer:  { icon: '🛒', label: 'Buyer / Renter', desc: 'Browse, wishlist, contact agents. EMI calculator included.' },
    agent:  { icon: '🏠', label: 'Agent / Seller',  desc: 'List properties for sale/rent. Requires admin approval (limit: 10 agents).' },
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', padding: '40px 0' }}>
      <div style={{ maxWidth: 520, width: '100%', margin: '0 auto', padding: '0 24px' }}>
        <div className="card-flat" style={{ padding: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏡</div>
            <h2 className="serif" style={{ fontSize: 26, color: 'var(--blue)', marginBottom: 4 }}>Create Account</h2>
            <p style={{ color: 'var(--slate2)', fontSize: 14 }}>Join Punjab\'s best real estate platform</p>
          </div>

          {/* Steps indicator (hide on step 4) */}
          {step < 4 && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, gap: 0 }}>
              {['Details','Verify OTP','Done'].map((s, i) => (
                <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    background: step > i+1 ? 'var(--green)' : step === i+1 ? 'var(--blue)' : 'var(--slate4)',
                    color: step >= i+1 ? '#fff' : 'var(--slate2)',
                  }}>
                    {step > i+1 ? '✓' : i+1}
                  </div>
                  <div style={{ flex: 1, height: 2, background: i < 2 ? (step > i+1 ? 'var(--green)' : 'var(--slate4)') : 'transparent' }} />
                </div>
              ))}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="lbl">Full Name</label>
                <input className="inp" placeholder="Harpreet Singh" value={form.name} onChange={e => upd('name', e.target.value)} />
              </div>
              <div>
                <label className="lbl">Email Address</label>
                <input className="inp" type="email" placeholder="you@gmail.com" value={form.email} onChange={e => upd('email', e.target.value)} />
                <p style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 4 }}>📧 OTP will be sent to this email</p>
              </div>
              <div>
                <label className="lbl">Mobile Number</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ padding: '11px 14px', background: 'var(--slate5)', borderRadius: 12, fontSize: 14, color: 'var(--slate)', border: '1.5px solid var(--slate4)', fontWeight: 600 }}>🇮🇳 +91</div>
                  <input className="inp" type="tel" maxLength={10} placeholder="98XXXXXXXX" value={form.phone} onChange={e => upd('phone', e.target.value.replace(/\D/,''))} />
                </div>
              </div>
              <div>
                <label className="lbl">Password</label>
                <input className="inp" type="password" placeholder="Min. 8 characters" value={form.password} onChange={e => upd('password', e.target.value)} />
              </div>
              <div>
                <label className="lbl">Confirm Password</label>
                <input className="inp" type="password" placeholder="Repeat password" value={form.confirm} onChange={e => upd('confirm', e.target.value)} />
              </div>
              <div>
                <label className="lbl">Register as</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['buyer','agent'] as const).map(r => (
                    <div key={r} onClick={() => upd('role', r)}
                      style={{
                        flex:1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${form.role===r?'var(--blue)':'var(--slate4)'}`,
                        background: form.role===r?'var(--blue5)':'#fff',
                        color: form.role===r?'var(--blue)':'var(--slate)',
                      }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{ROLE_INFO[r].icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{ROLE_INFO[r].label}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 4, lineHeight: 1.4 }}>{ROLE_INFO[r].desc}</div>
                    </div>
                  ))}
                </div>
                {form.role === 'agent' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: 12, color: '#92400e' }}>
                    ⚠️ Agent accounts require admin approval before you can list properties. Max 10 agents allowed.
                  </div>
                )}
              </div>
              <button className="btn btn-blue2" style={{ marginTop: 8, width:'100%' }} onClick={sendOTP} disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send Verification OTP →'}
              </button>
              <p style={{ textAlign:'center', fontSize:13, color:'var(--slate2)' }}>
                Already registered? <span style={{ color:'var(--blue)', cursor:'pointer', fontWeight:600 }} onClick={() => nav('login')}>Login</span>
              </p>
            </div>
          )}

          {/* Step 2 - OTP */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 48 }}>📬</div>
              <div>
                <h3 style={{ color: 'var(--blue)', marginBottom: 8 }}>Check Your Email</h3>
                <p style={{ color: 'var(--slate2)', fontSize: 14 }}>
                  We've sent a 6-digit OTP to<br /><strong style={{ color: 'var(--dark)' }}>{form.email}</strong>
                </p>
              </div>
              {devOtp && (
                <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 10, padding: 12 }}>
                  <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                    🔧 Dev Mode — OTP: <strong style={{ fontSize: 18 }}>{devOtp}</strong>
                    <br /><span style={{ fontWeight: 400 }}>Configure Gmail in .env for real emails</span>
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    className="otp-input"
                    value={d}
                    maxLength={1}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                  />
                ))}
              </div>
              <button className="btn btn-blue2" style={{ width: '100%' }} onClick={verifyOTP} disabled={loading}>
                {loading ? 'Verifying...' : '✓ Verify OTP'}
              </button>
              <p style={{ fontSize: 13, color: 'var(--slate2)' }}>
                Didn't get it?{' '}
                <span style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { sendOTP(); setOtp(['','','','','','']); }}>
                  Resend OTP
                </span>
              </p>
            </div>
          )}

          {/* Step 3 - done */}
          {step === 3 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
              <h3 style={{ color: 'var(--green)', marginBottom: 8 }}>Email Verified!</h3>
              <p style={{ color: 'var(--slate2)', marginBottom: 24, fontSize: 14 }}>
                Your email <strong>{form.email}</strong> has been verified. Complete your registration below.
              </p>
              <button className="btn btn-blue2" style={{ width: '100%' }} onClick={register} disabled={loading}>
                {loading ? 'Creating Account...' : '🏡 Create My Account'}
              </button>
            </div>
          )}

          {/* Step 4 - Agent Pending */}
          {step === 4 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
              <h3 style={{ color: 'var(--amber)', marginBottom: 12 }}>Agent Registration Submitted!</h3>
              <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 12, padding: 20, marginBottom: 20, textAlign: 'left' }}>
                <p style={{ fontWeight: 700, color: '#92400e', marginBottom: 8 }}>What happens next?</p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <li style={{ fontSize: 13, color: '#78350f' }}>✅ Your registration has been received</li>
                  <li style={{ fontSize: 13, color: '#78350f' }}>🔍 Admin will review your application</li>
                  <li style={{ fontSize: 13, color: '#78350f' }}>📧 You will be notified once approved</li>
                  <li style={{ fontSize: 13, color: '#78350f' }}>🏡 Then you can list properties</li>
                </ul>
              </div>
              <p style={{ fontSize: 13, color: 'var(--slate2)', marginBottom: 20 }}>
                Registered as: <strong>{form.email}</strong>
              </p>
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => nav('home')}>
                Go to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function LoginPage({ nav, setUser, doLogin, msg }: any) {
  const [form, setForm]   = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    if (!form.email || !form.password) { msg('Fill in all fields', 'err'); return; }
    setLoading(true);
    try {
      const u = await doLogin(form.email, form.password);
      msg(`Welcome back, ${u.name}! ✓`);
      nav(u.role === 'admin' ? 'admin' : 'home');
    } catch (e: any) { msg(e.message, 'err'); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', padding: '40px 0' }}>
      <div style={{ maxWidth: 420, width: '100%', margin: '0 auto', padding: '0 24px' }}>
        <div className="card-flat" style={{ padding: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
            <h2 className="serif" style={{ fontSize: 26, color: 'var(--blue)', marginBottom: 4 }}>Welcome Back</h2>
            <p style={{ color: 'var(--slate2)', fontSize: 14 }}>Login to your PropEstate360 account</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="lbl">Email Address</label>
              <input className="inp" type="email" placeholder="you@gmail.com" value={form.email}
                onChange={e => upd('email', e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
            </div>
            <div>
              <label className="lbl">Password</label>
              <input className="inp" type="password" placeholder="Your password" value={form.password}
                onChange={e => upd('password', e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
            </div>
            <button className="btn btn-blue2" style={{ marginTop: 4, width: '100%' }} onClick={handle} disabled={loading}>
              {loading ? 'Logging in...' : 'Login →'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--slate2)' }}>
              New user?{' '}
              <span style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }} onClick={() => nav('register')}>
                Register here
              </span>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — Role-differentiated for Buyer, Agent, Admin
// ═══════════════════════════════════════════════════════════════════════════
function EMICalculator({ wishlist }: { wishlist: any[] }) {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate]           = useState('8.5');
  const [tenure, setTenure]       = useState('20');
  const [selectedProp, setSelectedProp] = useState('');

  // Auto-fill from wishlist property
  const fillFromProp = (propId: string) => {
    const p = wishlist.find(x => x.id === propId);
    if (p && p.listing === 'sale') {
      setPrincipal(String(Math.round(p.price * 0.8))); // 80% LTV
    }
    setSelectedProp(propId);
  };

  const p = parseFloat(principal) || 0;
  const r = parseFloat(rate) || 0;
  const t = parseInt(tenure) || 0;
  
  const { emi, totalAmount: totalAmt, totalInterest: totalInt } = calcEMI(p, r, t);

  const fmtINR = (v: number) => {
    if (v >= 10000000) return `₹${(v/10000000).toFixed(2)} Cr`;
    if (v >= 100000)   return `₹${(v/100000).toFixed(1)} L`;
    return `₹${v.toLocaleString('en-IN')}`;
  };

  const intPct = totalAmt > 0 ? Math.round((totalInt/totalAmt)*100) : 0;

  return (
    <div>
      <h2 style={{ fontWeight:700, color:'var(--blue)', marginBottom:6 }}>🏦 EMI & Loan Calculator</h2>
      <p style={{ color:'var(--slate2)', marginBottom:24, fontSize:14 }}>Calculate your monthly home loan installment. No external service needed.</p>

      {wishlist.filter(p => p.listing==='sale').length > 0 && (
        <div className="card-flat" style={{ padding:16, marginBottom:20 }}>
          <label className="lbl">Quick-fill from Wishlist Property</label>
          <select className="sel" style={{ width:'100%', marginTop:6 }} value={selectedProp}
            onChange={e => fillFromProp(e.target.value)}>
            <option value="">-- Select a wishlisted property --</option>
            {wishlist.filter(p => p.listing==='sale').map((p: any) => (
              <option key={p.id} value={p.id}>{p.title} — ₹{(p.price/100000).toFixed(1)}L</option>
            ))}
          </select>
          {selectedProp && (
            <p style={{ fontSize:12, color:'var(--teal)', marginTop:6 }}>
              ✓ Filled with 80% LTV of property price. Adjust as needed.
            </p>
          )}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
        <div className="card-flat" style={{ padding:24 }}>
          <h3 style={{ fontWeight:700, color:'var(--blue)', marginBottom:20, fontSize:15 }}>Loan Details</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label className="lbl">Loan Amount (₹)</label>
              <input className="inp" type="number" placeholder="e.g. 5000000"
                value={principal} onChange={e => setPrincipal(e.target.value)} />
              {p > 0 && <p style={{ fontSize:12, color:'var(--slate2)', marginTop:4 }}>{fmtINR(p)}</p>}
            </div>
            <div>
              <label className="lbl">Annual Interest Rate (%)</label>
              <input className="inp" type="number" step="0.1" min="1" max="20"
                value={rate} onChange={e => setRate(e.target.value)} />
              <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                {['7.5','8','8.5','9','9.5'].map(r => (
                  <span key={r} className={`chip ${rate===r?'active':''}`} style={{ padding:'4px 10px', fontSize:12 }}
                    onClick={() => setRate(r)}>{r}%</span>
                ))}
              </div>
            </div>
            <div>
              <label className="lbl">Tenure (Years)</label>
              <input className="inp" type="number" min="1" max="30"
                value={tenure} onChange={e => setTenure(e.target.value)} />
              <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                {['10','15','20','25','30'].map(y => (
                  <span key={y} className={`chip ${tenure===y?'active':''}`} style={{ padding:'4px 10px', fontSize:12 }}
                    onClick={() => setTenure(y)}>{y}yr</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card-flat" style={{ padding:24, background:'linear-gradient(135deg,var(--blue5),#fff)' }}>
          <h3 style={{ fontWeight:700, color:'var(--blue)', marginBottom:20, fontSize:15 }}>Results</h3>
          {emi > 0 ? (
            <>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:13, color:'var(--slate2)' }}>Monthly EMI</div>
                <div style={{ fontSize:38, fontWeight:900, color:'var(--blue)', margin:'8px 0' }}>
                  {fmtINR(emi)}
                </div>
                <div style={{ fontSize:12, color:'var(--slate2)' }}>per month for {tenure} years</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { label:'Principal Amount', value:fmtINR(p), color:'var(--blue)' },
                  { label:'Total Interest', value:fmtINR(totalInt), color:'var(--red)' },
                  { label:'Total Payable', value:fmtINR(totalAmt), color:'var(--dark)' },
                ].map(s => (
                  <div key={s.label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--slate5)' }}>
                    <span style={{ color:'var(--slate2)', fontSize:13 }}>{s.label}</span>
                    <span style={{ fontWeight:700, color:s.color, fontSize:14 }}>{s.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--slate2)', marginBottom:6 }}>
                  <span>Principal ({100-intPct}%)</span>
                  <span>Interest ({intPct}%)</span>
                </div>
                <div style={{ height:10, borderRadius:5, background:'var(--slate4)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${100-intPct}%`, background:'var(--blue2)', borderRadius:5, transition:'width .4s' }} />
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--slate2)' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🧮</div>
              <p>Fill in the details to calculate your EMI</p>
            </div>
          )}
        </div>
      </div>

      {/* Bank rate guide */}
      <div className="card-flat" style={{ padding:20 }}>
        <h3 style={{ fontWeight:700, color:'var(--blue)', marginBottom:14, fontSize:14 }}>📋 Current Home Loan Rates (Indicative)</h3>
        <div style={{ overflow:'auto' }}>
          <table className="table">
            <thead>
              <tr><th>Bank / NBFC</th><th>Rate (approx)</th><th>Min Tenure</th><th>Max Tenure</th><th>Max LTV</th></tr>
            </thead>
            <tbody>
              {[
                { bank:'SBI Home Loan',       rate:'8.50 – 9.65%', minTenure:'5 yr',  tenure:'30 yr', ltv:'90%' },
                { bank:'HDFC Bank',            rate:'8.70 – 9.85%', minTenure:'5 yr',  tenure:'30 yr', ltv:'90%' },
                { bank:'ICICI Bank',           rate:'8.75 – 9.90%', minTenure:'5 yr',  tenure:'30 yr', ltv:'85%' },
                { bank:'LIC Housing Finance',  rate:'8.50 – 9.75%', minTenure:'5 yr',  tenure:'30 yr', ltv:'90%' },
                { bank:'Axis Bank',            rate:'8.75 – 9.90%', minTenure:'5 yr',  tenure:'30 yr', ltv:'85%' },
                { bank:'Punjab National Bank', rate:'8.45 – 9.60%', minTenure:'5 yr',  tenure:'30 yr', ltv:'90%' },
              ].map(b => (
                <tr key={b.bank}>
                  <td style={{ fontWeight:600 }}>{b.bank}</td>
                  <td>{b.rate}</td>
                  <td>{b.minTenure}</td>
                  <td>{b.tenure}</td>
                  <td>{b.ltv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize:11, color:'var(--slate3)', marginTop:10 }}>
          * Rates are indicative. Contact the bank directly for exact quotes. LTV = Loan-to-Value ratio.
        </p>
      </div>
    </div>
  );
}

function Dashboard({ nav, user, setUser, doLogout, msg }: any) {
  const [tab, setTab]           = useState('overview');
  const [myProps, setMyProps]   = useState<Property[]>([]);
  const [myEnqs, setMyEnqs]     = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<Property[]>([]);
  const [trending, setTrending] = useState<Property[]>([]);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '', about: user?.about || '' });
  const [pwdForm, setPwdForm]   = useState({ current: '', newPwd: '', confirm: '' });

  const isAgent = user?.role === 'agent';
  const isBuyer = user?.role === 'buyer';

  useEffect(() => {
    if (isAgent) {
      // Agents: load only their own properties
      // Fetch all statuses for agent's own properties
      ['active','sold','rented','inactive'].forEach(async (st) => {
        try { const d = await api.getProperties({ posted_by: user?.id, status: st }); setMyProps(p => { const ids = new Set(p.map((x:any)=>x.id)); return [...p, ...d.properties.filter((x:any)=>!ids.has(x.id))]; }); } catch {}
      });
    }
    api.getMyEnquiries().then(d => setMyEnqs(d.enquiries)).catch(() => {});
    api.getWishlist().then(d => {
      setWishlist(d.properties);
      // Get trending based on wishlisted locations
      if (d.properties.length > 0) {
        const states = [...new Set(d.properties.map((p: any) => p.state))];
        const districts = [...new Set(d.properties.map((p: any) => p.district))];
        // Fetch trending from primary wishlisted district
        api.getTrending({ district: districts[0], state: states[0] })
          .then((t: any) => setTrending(t.properties))
          .catch(() => api.getTrending({}).then((t: any) => setTrending(t.properties)).catch(() => {}));
      } else {
        api.getTrending({}).then((t: any) => setTrending(t.properties)).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    try {
      const d = await api.updateProfile(profileForm);
      setUser(d.user);
      localStorage.setItem('pe360_user', JSON.stringify(d.user));
      msg('Profile updated ✓');
    } catch(e:any) { msg(e.message, 'err'); }
  };

  const changePwd = async () => {
    if (pwdForm.newPwd !== pwdForm.confirm) { msg('Passwords do not match', 'err'); return; }
    try {
      await api.changePassword(pwdForm.current, pwdForm.newPwd);
      msg('Password changed ✓');
      setPwdForm({ current: '', newPwd: '', confirm: '' });
    } catch(e:any) { msg(e.message, 'err'); }
  };

  // Different tab sets for each role
  const buyerTabs = [
    { id:'overview',   icon:'📊', label:'Overview' },
    { id:'wishlist',   icon:'❤️', label:'Wishlist' },
    { id:'trending',   icon:'🔥', label:'Trending' },
    { id:'emi',        icon:'🏦', label:'EMI Calculator' },
    { id:'enquiries',  icon:'📩', label:'My Enquiries' },
    { id:'profile',    icon:'👤', label:'Profile' },
    { id:'security',   icon:'🔒', label:'Security' },
  ];

  const agentTabs = [
    { id:'overview',    icon:'📊', label:'Overview' },
    { id:'properties',  icon:'🏠', label:'My Listings' },
    { id:'enquiries',   icon:'📩', label:'Enquiries' },
    { id:'profile',     icon:'👤', label:'Profile' },
    { id:'security',    icon:'🔒', label:'Security' },
  ];

  const tabs = isBuyer ? buyerTabs : agentTabs;

  // Role badge
  const isAdmin = user?.role === 'admin';
  const roleBadge = isAdmin
    ? { label:'👑 Admin', bg:'#fef9c3', color:'#92400e' }
    : isBuyer
    ? { label:'🛒 Buyer', bg:'var(--blue5)', color:'var(--blue)' }
    : { label:'🏠 Agent', bg:'#f0fdf4', color:'var(--green)' };

  return (
    <div style={{ padding: '32px 0 64px' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'start' }}>
          {/* Sidebar */}
          <div className="card-flat" style={{ padding: 16 }}>
            <div style={{ textAlign: 'center', padding: '16px 0 20px', borderBottom: '1px solid var(--slate4)', marginBottom: 12 }}>
              <div style={{
                width: 56, height: 56,
                background: isBuyer ? 'linear-gradient(135deg,var(--teal),var(--teal2))' : 'linear-gradient(135deg,var(--blue),var(--blue2))',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 auto 10px',
              }}>{user?.name[0]}</div>
              <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 2 }}>{user?.email}</div>
              <div style={{
                display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:20,
                background: roleBadge.bg, color: roleBadge.color,
                fontSize:11, fontWeight:700, marginTop:8,
              }}>{roleBadge.label}</div>
            </div>
            {tabs.map(t => (
              <div key={t.id} className={`side-item ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
                <span>{t.icon}</span> {t.label}
              </div>
            ))}
            {isBuyer && (
              <div className="side-item" style={{ color:'var(--blue2)', marginTop:4 }} onClick={() => nav('properties')}>
                🔍 Browse Properties
              </div>
            )}
            {isAgent && (
              <div className="side-item" style={{ color:'var(--green)', marginTop:4 }} onClick={() => nav('list')}>
                ➕ List Property
              </div>
            )}
            <div className="side-item" style={{ color: 'var(--red)', marginTop: 8 }} onClick={doLogout}>
              🚪 Logout
            </div>
          </div>

          {/* Content */}
          <div>
            {/* ── BUYER OVERVIEW ── */}
            {tab === 'overview' && isBuyer && (
              <div>
                <h2 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 6 }}>Welcome back, {user?.name}! 👋</h2>
                <p style={{ color:'var(--slate2)', fontSize:14, marginBottom:20 }}>Your buyer dashboard — browse, wishlist, and plan your purchase.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { icon:'❤️',  label:'Wishlisted',     value: wishlist.length,  color:'#dc2626', tab:'wishlist' },
                    { icon:'📩',  label:'Enquiries Sent', value: myEnqs.length,    color:'var(--teal)', tab:'enquiries' },
                    { icon:'🔥',  label:'Trending Picks', value: trending.length,  color:'var(--amber)', tab:'trending' },
                  ].map(s => (
                    <div key={s.label} className="stat-card" style={{ textAlign: 'center', cursor:'pointer' }} onClick={() => setTab(s.tab)}>
                      <div style={{ fontSize: 32 }}>{s.icon}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
                      <div style={{ fontSize: 13, color: 'var(--slate2)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <div className="card-flat" style={{ padding:20, cursor:'pointer' }} onClick={() => setTab('emi')}>
                    <div style={{ fontSize:32, marginBottom:8 }}>🏦</div>
                    <h3 style={{ fontWeight:700, color:'var(--blue)', marginBottom:6 }}>EMI Calculator</h3>
                    <p style={{ fontSize:13, color:'var(--slate2)' }}>Calculate your monthly installments, total interest and more.</p>
                    <div style={{ color:'var(--blue2)', fontSize:13, fontWeight:600, marginTop:12 }}>Open Calculator →</div>
                  </div>
                  <div className="card-flat" style={{ padding:20, cursor:'pointer' }} onClick={() => nav('properties')}>
                    <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                    <h3 style={{ fontWeight:700, color:'var(--blue)', marginBottom:6 }}>Browse Properties</h3>
                    <p style={{ fontSize:13, color:'var(--slate2)' }}>Filter by state, district, type, price and more.</p>
                    <div style={{ color:'var(--blue2)', fontSize:13, fontWeight:600, marginTop:12 }}>Start Browsing →</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── AGENT OVERVIEW ── */}
            {tab === 'overview' && isAgent && (
              <div>
                <h2 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 6 }}>Welcome back, {user?.name}! 👋</h2>
                <p style={{ color:'var(--slate2)', fontSize:14, marginBottom:20 }}>Your agent dashboard — manage your property listings.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16, marginBottom: 24 }}>
                  {[
                    { icon:'🏠', label:'My Listings',    value: myProps.length,                                   color:'var(--blue)' },
                    { icon:'✅', label:'Active',          value: myProps.filter(p => p.status==='active').length,  color:'var(--green)' },
                    { icon:'🎉', label:'Sold',            value: myProps.filter(p => p.status==='sold').length,    color:'var(--teal)' },
                    { icon:'🔑', label:'Rented',          value: myProps.filter(p => p.status==='rented').length,  color:'var(--amber)' },
                    { icon:'📩', label:'Enquiries Recv.', value: myEnqs.length,                                    color:'var(--blue2)' },
                  ].map(s => (
                    <div key={s.label} className="stat-card" style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 32 }}>{s.icon}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
                      <div style={{ fontSize: 13, color: 'var(--slate2)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-blue2" onClick={() => nav('list')}>+ List a New Property</button>
              </div>
            )}

            {/* ── AGENT MY LISTINGS ── */}
            {tab === 'properties' && isAgent && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontWeight: 700, color: 'var(--blue)' }}>My Listings ({myProps.length})</h2>
                  <button className="btn btn-blue2 btn-sm" onClick={() => nav('list')}>+ Add New</button>
                </div>
                {myProps.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: 'var(--slate2)' }}>
                    <div style={{ fontSize: 48 }}>🏗️</div>
                    <h3>No properties listed yet</h3>
                    <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => nav('list')}>List Your First Property</button>
                  </div>
                ) : myProps.map(p => (
                  <div key={p.id} className="card-flat" style={{ display: 'flex', gap: 16, padding: 16, marginBottom: 12, alignItems: 'center' }}>
                  <img src={(() => { const raw = p.photos?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=90'; return raw.startsWith('/uploads/') ? `http://localhost:3001${raw}` : raw; })()} alt=""
                      style={{ width: 90, height: 68, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                      onError={e => { e.currentTarget.style.display='none'; }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 700 }}>{fmtPrice(p.price, p.listing)}</div>
                      <div style={{ display:'flex', gap:8, marginTop:4, flexWrap:'wrap' }}>
                        <span className={`badge ${p.status==='active'?'badge-green':'badge-slate'}`} style={{ fontSize: 11 }}>{p.status}</span>
                        <span className="badge badge-blue" style={{ fontSize:11 }}>{p.district}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink:0 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => nav('detail', p.id)}>👁 View</button>
                      <button className="btn btn-outline btn-sm" onClick={() => nav('list', p.id)}>✏️ Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── BUYER WISHLIST ── */}
            {tab === 'wishlist' && (
              <div>
                <h2 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 20 }}>My Wishlist ❤️</h2>
                {wishlist.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: 'var(--slate2)' }}>
                    <div style={{ fontSize: 48 }}>💔</div>
                    <p>No saved properties yet</p>
                    <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => nav('properties')}>Browse Properties</button>
                  </div>
                ) : (
                  <>
                    <div className="grid2">
                      {wishlist.map(p => <PropertyCard key={p.id} prop={p} nav={nav} />)}
                    </div>
                    {isBuyer && wishlist.some((p: any) => p.listing==='sale') && (
                      <div className="card-flat" style={{ padding:20, marginTop:24 }}>
                        <p style={{ color:'var(--slate2)', fontSize:13 }}>
                          💡 Want to calculate EMI for a wishlisted property?{' '}
                          <span style={{ color:'var(--blue)', cursor:'pointer', fontWeight:600 }} onClick={() => setTab('emi')}>
                            Open EMI Calculator →
                          </span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── BUYER TRENDING ── */}
            {tab === 'trending' && isBuyer && (
              <div>
                <h2 style={{ fontWeight:700, color:'var(--blue)', marginBottom:6 }}>🔥 Trending Properties</h2>
                <p style={{ color:'var(--slate2)', fontSize:14, marginBottom:20 }}>
                  {wishlist.length > 0
                    ? `Based on your wishlisted areas: ${[...new Set(wishlist.map((p: any) => p.district))].slice(0,3).join(', ')}`
                    : 'Most wishlisted properties on the platform'}
                </p>
                {trending.length === 0 ? (
                  <div style={{ textAlign:'center', padding:60, color:'var(--slate2)' }}>
                    <div style={{ fontSize:48 }}>🔥</div>
                    <p>Trending data loading...</p>
                  </div>
                ) : (
                  <div className="grid2">
                    {trending.map(p => <PropertyCard key={p.id} prop={p} nav={nav} />)}
                  </div>
                )}
              </div>
            )}

            {/* ── EMI CALCULATOR ── */}
            {tab === 'emi' && isBuyer && <EMICalculator wishlist={wishlist} />}

            {/* ── ENQUIRIES ── */}
            {tab === 'enquiries' && (
              <div>
                <h2 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 20 }}>
                  {isBuyer ? 'My Enquiries Sent' : 'Enquiries Received'}
                </h2>
                {myEnqs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: 'var(--slate2)' }}>
                    <div style={{ fontSize: 48 }}>📭</div>
                    <p>No enquiries {isBuyer ? 'sent' : 'received'} yet</p>
                  </div>
                ) : myEnqs.map(e => (
                  <div key={e.id} className="card-flat" style={{ padding: 16, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontWeight: 600, color: 'var(--blue)' }}>{e.property_title}</div>
                      <span className={`badge ${e.status==='open'?'badge-green':'badge-slate'}`}>{e.status}</span>
                    </div>
                    <p style={{ color: 'var(--slate)', fontSize: 13, lineHeight: 1.6 }}>{e.message}</p>
                    <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 8 }}>{timeAgo(e.created_at)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── PROFILE ── */}
            {tab === 'profile' && (
              <div className="card-flat" style={{ padding: 32, maxWidth: 500 }}>
                <h2 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 24 }}>Edit Profile</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div><label className="lbl">Full Name</label>
                    <input className="inp" value={profileForm.name} onChange={e => setProfileForm(f => ({...f, name: e.target.value}))} /></div>
                  <div><label className="lbl">Mobile</label>
                    <input className="inp" value={profileForm.phone} onChange={e => setProfileForm(f => ({...f, phone: e.target.value}))} /></div>
                  <div><label className="lbl">About (optional)</label>
                    <textarea className="inp" rows={3} style={{ resize: 'vertical' }} value={profileForm.about}
                      onChange={e => setProfileForm(f => ({...f, about: e.target.value}))} /></div>
                  <button className="btn btn-blue2" onClick={saveProfile}>Save Profile</button>
                </div>
              </div>
            )}

            {/* ── SECURITY ── */}
            {tab === 'security' && (
              <div className="card-flat" style={{ padding: 32, maxWidth: 440 }}>
                <h2 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 24 }}>Change Password</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div><label className="lbl">Current Password</label>
                    <input className="inp" type="password" value={pwdForm.current} onChange={e => setPwdForm(f => ({...f, current: e.target.value}))} /></div>
                  <div><label className="lbl">New Password</label>
                    <input className="inp" type="password" value={pwdForm.newPwd} onChange={e => setPwdForm(f => ({...f, newPwd: e.target.value}))} /></div>
                  <div><label className="lbl">Confirm New Password</label>
                    <input className="inp" type="password" value={pwdForm.confirm} onChange={e => setPwdForm(f => ({...f, confirm: e.target.value}))} /></div>
                  <button className="btn btn-blue2" onClick={changePwd}>Update Password</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// LIST PROPERTY (Agent/Admin Only)
// ═══════════════════════════════════════════════════════════════════════════
function ListProperty({ nav, user, msg, editId }: any) {
  const [form, setForm] = useState({
    title:'', type:'house', listing:'sale', state:'Punjab', district:'',
    locality:'', price:'', area:'', beds:'', baths:'', floors:'',
    description:'', amenities:[] as string[], featured:false,
    agent_name: user?.name||'', agent_phone: user?.phone||'', agent_email: user?.email||'',
  });
  const [photos, setPhotos]     = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [loading, setLoading]   = useState(false);
  const [drag, setDrag]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user || (user.role !== 'agent' && user.role !== 'admin')) {
    nav('home'); return null;
  }
  if (user.role === 'agent' && user.agent_status !== 'approved') {
    return (
      <div style={{ padding:'80px 0', textAlign:'center' }}>
        <div style={{ fontSize:64 }}>⏳</div>
        <h2 style={{ color:'var(--amber)', marginTop:16 }}>Account Pending Approval</h2>
        <p style={{ color:'var(--slate2)', marginTop:8 }}>Your agent account is awaiting admin approval. You will be able to list properties once approved.</p>
        <button className="btn btn-outline" style={{ marginTop:24 }} onClick={() => nav('home')}>Go to Home</button>
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (editId) {
      api.getProperty(editId).then((d: any) => {
        const p = d.property || d;
        setForm({
          title: p.title||'', type: p.type||'house', listing: p.listing||'sale',
          state: p.state||'Punjab', district: p.district||'', locality: p.locality||'',
          price: String(p.price||''), area: String(p.area||''), beds: String(p.beds||''),
          baths: String(p.baths||''), floors: String(p.floors||''),
          description: p.description||'',
          amenities: Array.isArray(p.amenities) ? p.amenities : [],
          featured: Boolean(p.featured),
          agent_name: p.agent_name||'', agent_phone: p.agent_phone||'', agent_email: p.agent_email||'',
        });
        setExistingPhotos(p.photos || []);
      }).catch(() => msg('Failed to load property', 'err'));
    }
  }, [editId]);

  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleAmenity = (a: string) => {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
    }));
  };

  const compressImage = (file: File): Promise<{ file: File; preview: string }> =>
    new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const MAX = 2400; // max dimension in pixels
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
            else { width = Math.round(width * MAX / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const preview = canvas.toDataURL('image/jpeg', 0.92);
          canvas.toBlob(blob => {
            const compressed = new File([blob!], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
            resolve({ file: compressed, preview });
          }, 'image/jpeg', 0.92);
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

  const addPhotos = async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/')).slice(0, 8 - photos.length - existingPhotos.length);
    const results = await Promise.all(imgs.map(compressImage));
    setPhotos(p => [...p, ...results.map(r => r.file)]);
    setPreviews(p => [...p, ...results.map(r => r.preview)]);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    addPhotos(Array.from(e.dataTransfer.files));
  };

  const submit = async () => {
    if (!form.title || !form.district || !form.price) {
      msg('Title, district and price are required', 'err'); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'amenities') fd.append(k, JSON.stringify(v));
        else fd.append(k, String(v));
      });
      photos.forEach(p => fd.append('photos', p));
      // Send existing photo URLs so the backend knows which ones to keep
      existingPhotos.forEach(url => fd.append('existingPhotos', url));

      if (editId) await api.updateProperty(editId, fd);
      else await api.addProperty(fd);

      msg(editId ? 'Property updated ✓' : 'Property listed successfully! ✓');
      nav('dashboard');
    } catch(e:any) { msg(e.message, 'err'); }
    setLoading(false);
  };

  // Get districts for selected state
  const stateDistricts = STATE_DISTRICTS[form.state] || null;

  return (
    <div style={{ padding: '32px 0 64px' }}>
      <div className="container" style={{ maxWidth: 860 }}>
        <h1 className="serif" style={{ fontSize: 30, color: 'var(--blue)', marginBottom: 8 }}>
          {editId ? 'Edit Property' : 'List Your Property'}
        </h1>
        <p style={{ color: 'var(--slate2)', marginBottom: 32 }}>Fill in the details below. Your contact info will be shown to interested buyers.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Basic info */}
          <div className="card-flat" style={{ padding: 28 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 20 }}>Property Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="lbl">Property Title *</label>
                <input className="inp" placeholder="e.g. 3BHK House in Model Town Ludhiana" value={form.title} onChange={e => upd('title', e.target.value)} />
              </div>
              <div>
                <label className="lbl">Property Type *</label>
                <select className="sel" style={{ width:'100%' }} value={form.type} onChange={e => upd('type', e.target.value)}>
                  {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Listing Type *</label>
                <select className="sel" style={{ width:'100%' }} value={form.listing} onChange={e => upd('listing', e.target.value)}>
                  <option value="sale">For Sale</option>
                  <option value="rent">For Rent</option>
                </select>
              </div>
              <div>
                <label className="lbl">State *</label>
                <select className="sel" style={{ width:'100%' }} value={form.state}
                  onChange={e => { upd('state', e.target.value); upd('district', ''); }}>
                  {INDIA_STATES.map(s => <option key={s.name} value={s.name}>{s.name} (Cap: {s.capital})</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">District *</label>
                {stateDistricts ? (
                  <select className="sel" style={{ width:'100%' }} value={form.district}
                    onChange={e => upd('district', e.target.value)}>
                    <option value="">Select District</option>
                    {stateDistricts.map((d: string) => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <input
                    className="inp" style={{ width:'100%' }}
                    value={form.district}
                    onChange={e => upd('district', e.target.value)}
                    placeholder={`Enter district in ${form.state || 'selected state'}`}
                  />
                )}
              </div>
              <div>
                <label className="lbl">Locality / Area</label>
                <input className="inp" placeholder="e.g. Model Town, Phase 7" value={form.locality} onChange={e => upd('locality', e.target.value)} />
              </div>
              <div>
                <label className="lbl">Price (₹) *</label>
                <input className="inp" type="number" placeholder={form.listing==='rent'?'Monthly rent':'Sale price'} value={form.price} onChange={e => upd('price', e.target.value)} />
              </div>
              <div>
                <label className="lbl">Area (sqft)</label>
                <input className="inp" type="number" placeholder="1500" value={form.area} onChange={e => upd('area', e.target.value)} />
              </div>
              <div>
                <label className="lbl">Bedrooms (BHK)</label>
                <input className="inp" type="number" min={0} max={20} placeholder="3" value={form.beds} onChange={e => upd('beds', e.target.value)} />
              </div>
              <div>
                <label className="lbl">Bathrooms</label>
                <input className="inp" type="number" min={0} max={20} placeholder="2" value={form.baths} onChange={e => upd('baths', e.target.value)} />
              </div>
              <div>
                <label className="lbl">Number of Floors</label>
                <input className="inp" type="number" min={0} max={50} placeholder="2" value={form.floors} onChange={e => upd('floors', e.target.value)} />
                <p style={{ fontSize:12, color:'var(--slate2)', marginTop:4 }}>Total floors in the building / house</p>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="lbl">Description</label>
                <textarea className="inp" rows={4} style={{ resize: 'vertical' }}
                  placeholder="Describe your property in detail — location, features, neighbourhood..."
                  value={form.description} onChange={e => upd('description', e.target.value)} />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="featured" checked={form.featured} onChange={e => upd('featured', e.target.checked)} />
                <label htmlFor="featured" style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--slate)' }}>
                  ⭐ Mark as Featured (shows prominently on homepage)
                </label>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="card-flat" style={{ padding: 28 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 8 }}>Amenities</h3>
            <p style={{ fontSize:13, color:'var(--slate2)', marginBottom:16 }}>Select all that apply. Vastu-compliant properties get higher visibility.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {AMENITIES_LIST.map(a => (
                <span key={a} className={`chip ${form.amenities.includes(a)?'active':''}`}
                  style={{ ...(a === 'Vastu' ? { border: '2px solid #f59e0b', background: form.amenities.includes(a) ? '#f59e0b' : '#fffbeb', color: form.amenities.includes(a) ? '#fff' : '#92400e' } : {}) }}
                  onClick={() => toggleAmenity(a)}>
                  {a === 'Vastu' ? '🕉️ ' : ''}{a}
                </span>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className="card-flat" style={{ padding: 28 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 8 }}>Photos (up to 8)</h3>
            <p style={{ fontSize:13, color:'var(--slate2)', marginBottom:16 }}>Upload high-quality images (max 15MB each). Better photos attract more buyers.</p>

            {existingPhotos.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <label className="lbl">Existing Photos</label>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:8 }}>
                  {existingPhotos.map((src, i) => (
                    <div key={i} style={{ position:'relative' }}>
                      <img src={src.startsWith('/uploads/') ? `http://localhost:3001${src}` : src}
                        alt="" style={{ width:90, height:70, objectFit:'cover', borderRadius:8, border:'2px solid var(--blue4)' }} />
                      <button
                        style={{ position:'absolute', top:-6, right:-6, background:'var(--red)', color:'#fff', border:'none', borderRadius:'50%', width:22, height:22, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                        onClick={() => setExistingPhotos(prev => prev.filter((_, j) => j !== i))}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`upload-zone ${drag?'drag':''}`}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 40 }}>📸</div>
              <p style={{ fontWeight: 600, color: 'var(--blue)', marginTop: 8 }}>Drop photos here or click to upload</p>
              <p style={{ fontSize: 13, color: 'var(--slate2)', marginTop: 4 }}>JPG, PNG up to 15MB each</p>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => { addPhotos(Array.from(e.target.files || [])); e.target.value = ''; }} />
            </div>
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} alt="" style={{ width: 100, height: 76, objectFit: 'cover', borderRadius: 8, border:'2px solid var(--blue4)' }} />
                    <button
                      style={{ position:'absolute', top:-6, right:-6, background:'var(--red)', color:'#fff', border:'none', borderRadius:'50%', width:22, height:22, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                      onClick={() => { setPhotos(p => p.filter((_,j) => j!==i)); setPreviews(p => p.filter((_,j) => j!==i)); }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agent contact */}
          <div className="card-flat" style={{ padding: 28 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 4 }}>Contact Details</h3>
            <p style={{ fontSize: 13, color: 'var(--slate2)', marginBottom: 16 }}>These will be shown to interested buyers/renters.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="lbl">Name</label>
                <input className="inp" value={form.agent_name} onChange={e => upd('agent_name', e.target.value)} />
              </div>
              <div>
                <label className="lbl">Phone</label>
                <input className="inp" value={form.agent_phone} onChange={e => upd('agent_phone', e.target.value)} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="lbl">Email</label>
                <input className="inp" type="email" value={form.agent_email} onChange={e => upd('agent_email', e.target.value)} />
              </div>
            </div>
          </div>

          <button className="btn btn-blue2 btn-lg" onClick={submit} disabled={loading}>
            {loading ? 'Submitting...' : editId ? '✓ Update Property' : '🏡 Publish Listing'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════
function AdminPanel({ nav, user, msg }: any) {
  const [tab, setTab]         = useState('dashboard');
  const [stats, setStats]     = useState<any>(null);
  const [users, setUsers]     = useState<any[]>([]);
  const [agents, setAgents]   = useState<any[]>([]);
  const [props, setProps]     = useState<Property[]>([]);
  const [enqs, setEnqs]       = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [salesPerf, setSalesPerf] = useState<any>(null);

  if (!user || user.role !== 'admin') { nav('home'); return null; }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    api.adminStats().then(setStats).catch(() => {});
    api.adminUsers().then(d => setUsers(d.users)).catch(() => {});
    api.adminAgents().then(d => setAgents(d.agents)).catch(() => {});
    api.adminProps().then(d => setProps(d.properties)).catch(() => {});
    api.adminEnquiries().then(d => setEnqs(d.enquiries)).catch(() => {});
    api.adminAnalytics().then(setAnalytics).catch(() => {});
    api.adminSalesPerf().then(setSalesPerf).catch(() => {});
  }, []);

  const delProp = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try { await api.deleteProperty(id); setProps(p => p.filter(x => x.id !== id)); msg('Property deleted'); }
    catch(e:any) { msg(e.message, 'err'); }
  };

  const setStatus = async (id: string, status: string) => {
    try { await api.setStatus(id, status); setProps(p => p.map(x => x.id===id ? {...x, status} : x)); msg('Status updated'); }
    catch(e:any) { msg(e.message, 'err'); }
  };

  const restrict = async (uid: string, restricted: boolean) => {
    try {
      await api.restrictUser(uid, restricted);
      setUsers(u => u.map(x => x.id===uid ? {...x, is_restricted: restricted?1:0} : x));
      msg(restricted ? 'User restricted' : 'Access restored');
    } catch(e:any) { msg(e.message, 'err'); }
  };

  const deleteUser = async (uid: string, name: string) => {
    if (!confirm(`Delete user "${name}"?`)) return;
    try { await api.deleteUser(uid); setUsers(u => u.filter(x => x.id!==uid)); msg('User deleted'); }
    catch(e:any) { msg(e.message, 'err'); }
  };

  const changeRole = async (uid: string, role: string) => {
    try { await api.changeRole(uid, role); setUsers(u => u.map(x => x.id===uid?{...x,role}:x)); msg('Role updated'); }
    catch(e:any) { msg(e.message, 'err'); }
  };

  const approveAgent = async (aid: string) => {
    try {
      await api.approveAgent(aid);
      setAgents(a => a.map(x => x.id===aid ? {...x, agent_status:'approved'} : x));
      setStats((s: any) => s ? { ...s, users: { ...s.users, pendingAgents: (s.users.pendingAgents||1)-1, agents: (s.users.agents||0)+1 } } : s);
      msg('Agent approved ✓');
    } catch(e:any) { msg(e.message, 'err'); }
  };

  const rejectAgent = async (aid: string) => {
    if (!confirm('Reject this agent registration?')) return;
    try {
      await api.rejectAgent(aid);
      setAgents(a => a.map(x => x.id===aid ? {...x, agent_status:'rejected'} : x));
      msg('Agent rejected');
    } catch(e:any) { msg(e.message, 'err'); }
  };

  const PIE_COLORS = ['#1e3a8a','#2563eb','#3b82f6','#93c5fd','#0f766e','#14b8a6'];

  const pendingCount = agents.filter(a => a.agent_status === 'pending').length;

  const tabs = [
    { id:'dashboard',   icon:'📊', label:'Dashboard' },
    { id:'agents',      icon:'🏠', label:`Agents${pendingCount > 0 ? ` (${pendingCount}⚠)` : ''}` },
    { id:'properties',  icon:'🏘️', label:'Properties' },
    { id:'users',       icon:'👥', label:'Users' },
    { id:'enquiries',   icon:'📩', label:'Enquiries' },
    { id:'analytics',   icon:'📈', label:'Analytics' },
  ];

  return (
    <div style={{ padding: '32px 0 64px' }}>
      <div className="container">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
          <div>
            <h1 className="serif" style={{ fontSize:28, color:'var(--blue)' }}>Admin Panel</h1>
            <p style={{ color:'var(--slate2)', fontSize:14 }}>Full control · Logged in as <strong>{user.name}</strong></p>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {pendingCount > 0 && (
              <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'6px 14px', fontSize:13, color:'var(--red)', fontWeight:700 }}>
                ⚠️ {pendingCount} agent{pendingCount>1?'s':''} pending approval
              </div>
            )}
            <div className="badge badge-blue" style={{ fontSize:13 }}>👑 Administrator</div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:24, alignItems:'start' }}>
          {/* Sidebar */}
          <div className="card-flat" style={{ padding:12 }}>
            {tabs.map(t => (
              <div key={t.id} className={`side-item ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}
                style={t.id==='agents' && pendingCount>0 ? { color: tab===t.id?'#fff':'var(--amber)', fontWeight:700 } : {}}>
                {t.icon} {t.label}
              </div>
            ))}
            <div style={{ height:1, background:'var(--slate4)', margin:'12px 8px' }} />
            <div className="side-item" onClick={() => nav('list')} style={{ color:'var(--green)' }}>➕ Add Property</div>
            <div className="side-item" onClick={() => nav('trends')} style={{ color:'var(--blue2)' }}>📊 Price Trends</div>
          </div>

          {/* Content */}
          <div>
            {/* ── DASHBOARD STATS ── */}
            {tab === 'dashboard' && stats && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16, marginBottom:28 }}>
                  {[
                    { label:'Total Properties', value:stats.properties?.total,   icon:'🏘️', color:'var(--blue)' },
                    { label:'Active Listings',  value:stats.properties?.active,  icon:'✅', color:'var(--green)' },
                    { label:'Properties Sold',  value:stats.properties?.sold,    icon:'🎉', color:'var(--teal)' },
                    { label:'Properties Rented',value:stats.properties?.rented,  icon:'🔑', color:'var(--amber)' },
                    { label:'Total Users',       value:stats.users?.total,        icon:'👥', color:'var(--blue2)' },
                    { label:'Buyers',            value:stats.users?.buyers,      icon:'🛒', color:'var(--slate)' },
                    { label:'Active Agents',     value:stats.users?.agents,      icon:'🏠', color:'var(--teal2)' },
                    { label:'Pending Agents',    value:stats.users?.pendingAgents, icon:'⏳', color:'var(--amber)' },
                    { label:'Agent Slots Left',  value:stats.users?.agentSlots,  icon:'🪑', color:'var(--blue)' },
                    { label:'Enquiries',         value:stats.enquiries,          icon:'📩', color:'var(--amber)' },
                    { label:'Districts',         value:stats.districts,          icon:'🗺️', color:'var(--blue)' },
                  ].map(s => (
                    <div key={s.label} className="stat-card" style={{ textAlign:'center' }}>
                      <div style={{ fontSize:26 }}>{s.icon}</div>
                      <div style={{ fontSize:24, fontWeight:800, color:s.color, marginTop:4 }}>{s.value ?? '…'}</div>
                      <div style={{ fontSize:11, color:'var(--slate2)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {stats.totalValue > 0 && (
                  <div className="stat-card" style={{ marginBottom:20 }}>
                    <div style={{ color:'var(--slate2)', fontSize:13 }}>Total portfolio value (sale listings)</div>
                    <div style={{ fontSize:28, fontWeight:800, color:'var(--blue)', marginTop:4 }}>
                      ₹{(stats.totalValue/10000000).toFixed(1)} Cr
                    </div>
                  </div>
                )}
                {pendingCount > 0 && (
                  <div style={{ background:'#fffbeb', border:'1px solid #f59e0b', borderRadius:12, padding:20, marginBottom:20 }}>
                    <div style={{ fontWeight:700, color:'#92400e', marginBottom:10 }}>⚠️ Action Required: Pending Agent Approvals</div>
                    <p style={{ fontSize:13, color:'#78350f', marginBottom:12 }}>{pendingCount} agent registration{pendingCount>1?'s':''} awaiting your approval.</p>
                    <button className="btn btn-sm" style={{ background:'#f59e0b', color:'#fff' }} onClick={() => setTab('agents')}>
                      Review Agents →
                    </button>
                  </div>
                )}

                {/* ── SALES BY AGENTS VS ADMIN ── */}
                {salesPerf && (() => {
                  const agentSold   = salesPerf.soldByRole.agent.count;
                  const adminSold   = salesPerf.soldByRole.admin.count;
                  const totalSold   = agentSold + adminSold || 1;
                  const agentListed = salesPerf.listingsByRole.agent.count;
                  const adminListed = salesPerf.listingsByRole.admin.count;
                  const totalListed = agentListed + adminListed || 1;
                  const agentRev    = salesPerf.soldByRole.agent.revenue;
                  const adminRev    = salesPerf.soldByRole.admin.revenue;
                  const topAgents   = salesPerf.topAgents || [];
                  const trend       = salesPerf.monthlyTrend || [];

                  const agentSoldPct   = Math.round(agentSold / totalSold * 100);
                  const adminSoldPct   = 100 - agentSoldPct;
                  const agentListedPct = Math.round(agentListed / totalListed * 100);
                  const adminListedPct = 100 - agentListedPct;

                  const PIE_AGENT = '#2563eb';
                  const PIE_ADMIN = '#0f766e';

                  // Donut chart via SVG
                  const r = 54; const cx = 80; const cy = 80;
                  const circumference = 2 * Math.PI * r;
                  const agentDash = circumference * agentSoldPct / 100;
                  const adminDash = circumference * adminSoldPct / 100;

                  return (
                    <div style={{ marginBottom: 28 }}>
                      {/* Section header */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                        <div style={{ width:4, height:28, background:'linear-gradient(180deg,var(--blue),var(--teal2))', borderRadius:4 }} />
                        <div>
                          <h2 style={{ fontWeight:800, color:'var(--blue)', fontSize:17, lineHeight:1.2 }}>📊 Sales by Agents vs Admin</h2>
                          <p style={{ fontSize:12, color:'var(--slate2)', marginTop:2 }}>Who is driving your business? Sold properties + revenue breakdown</p>
                        </div>
                      </div>

                      {/* Row 1: Donut chart + KPI cards */}
                      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:18, marginBottom:18 }}>

                        {/* Donut SVG */}
                        <div className="card-flat" style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'var(--slate2)', marginBottom:10, textAlign:'center' }}>SOLD PROPERTIES</div>
                          <svg width={160} height={160} viewBox="0 0 160 160">
                            {/* Background track */}
                            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--slate5)" strokeWidth={18} />
                            {/* Admin arc (renders first, full circle as base) */}
                            <circle cx={cx} cy={cy} r={r} fill="none" stroke={PIE_ADMIN} strokeWidth={18}
                              strokeDasharray={`${circumference}`} strokeDashoffset={0}
                              transform={`rotate(-90 ${cx} ${cy})`} />
                            {/* Agent arc (renders on top) */}
                            <circle cx={cx} cy={cy} r={r} fill="none" stroke={PIE_AGENT} strokeWidth={18}
                              strokeDasharray={`${agentDash} ${circumference}`} strokeDashoffset={0}
                              transform={`rotate(-90 ${cx} ${cy})`} />
                            {/* Center label */}
                            <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight={800} fill="var(--dark)">{totalSold}</text>
                            <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="var(--slate2)">total sold</text>
                          </svg>
                          {/* Legend */}
                          <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4, width:'100%' }}>
                            {[
                              { label:'Agents', pct: agentSoldPct, color: PIE_AGENT, count: agentSold },
                              { label:'Admin',  pct: adminSoldPct, color: PIE_ADMIN, count: adminSold },
                            ].map(l => (
                              <div key={l.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:12 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                  <div style={{ width:10, height:10, borderRadius:3, background:l.color, flexShrink:0 }} />
                                  <span style={{ fontWeight:600, color:'var(--dark)' }}>{l.label}</span>
                                </div>
                                <span style={{ color:'var(--slate2)', fontWeight:600 }}>{l.count} ({l.pct}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* KPI Cards */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                          {/* Agent Revenue */}
                          <div className="card-flat" style={{ padding:18, borderLeft:'4px solid var(--blue2)' }}>
                            <div style={{ fontSize:11, fontWeight:700, color:'var(--blue2)', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>🏠 Agent Revenue</div>
                            <div style={{ fontSize:22, fontWeight:800, color:'var(--blue)' }}>
                              {agentRev >= 10000000 ? `₹${(agentRev/10000000).toFixed(2)} Cr` : agentRev >= 100000 ? `₹${(agentRev/100000).toFixed(1)} L` : `₹${agentRev.toLocaleString('en-IN')}`}
                            </div>
                            <div style={{ fontSize:12, color:'var(--slate2)', marginTop:4 }}>{agentSold} properties sold</div>
                            <div style={{ marginTop:10, background:'var(--slate5)', borderRadius:99, height:5 }}>
                              <div style={{ width:`${agentSoldPct}%`, height:'100%', background:'var(--blue2)', borderRadius:99 }} />
                            </div>
                          </div>

                          {/* Admin Revenue */}
                          <div className="card-flat" style={{ padding:18, borderLeft:'4px solid var(--teal2)' }}>
                            <div style={{ fontSize:11, fontWeight:700, color:'var(--teal)', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>👑 Admin Revenue</div>
                            <div style={{ fontSize:22, fontWeight:800, color:'var(--teal)' }}>
                              {adminRev >= 10000000 ? `₹${(adminRev/10000000).toFixed(2)} Cr` : adminRev >= 100000 ? `₹${(adminRev/100000).toFixed(1)} L` : `₹${adminRev.toLocaleString('en-IN')}`}
                            </div>
                            <div style={{ fontSize:12, color:'var(--slate2)', marginTop:4 }}>{adminSold} properties sold</div>
                            <div style={{ marginTop:10, background:'var(--slate5)', borderRadius:99, height:5 }}>
                              <div style={{ width:`${adminSoldPct}%`, height:'100%', background:'var(--teal2)', borderRadius:99 }} />
                            </div>
                          </div>

                          {/* Listing Contribution */}
                          <div className="card-flat" style={{ padding:18, gridColumn:'1 / -1' }}>
                            <div style={{ fontSize:12, fontWeight:700, color:'var(--slate)', marginBottom:10 }}>📋 All Listings Contribution</div>
                            <div style={{ display:'flex', gap:12, marginBottom:8 }}>
                              <div style={{ flex:1, fontSize:13 }}>
                                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                                  <span style={{ fontWeight:600, color:'var(--blue2)' }}>🏠 Agents</span>
                                  <span style={{ color:'var(--slate2)' }}>{agentListed} ({agentListedPct}%)</span>
                                </div>
                                <div style={{ background:'var(--slate5)', borderRadius:99, height:8 }}>
                                  <div style={{ width:`${agentListedPct}%`, height:'100%', background:'var(--blue2)', borderRadius:99 }} />
                                </div>
                              </div>
                              <div style={{ flex:1, fontSize:13 }}>
                                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                                  <span style={{ fontWeight:600, color:'var(--teal)' }}>👑 Admin</span>
                                  <span style={{ color:'var(--slate2)' }}>{adminListed} ({adminListedPct}%)</span>
                                </div>
                                <div style={{ background:'var(--slate5)', borderRadius:99, height:8 }}>
                                  <div style={{ width:`${adminListedPct}%`, height:'100%', background:'var(--teal2)', borderRadius:99 }} />
                                </div>
                              </div>
                            </div>
                            {/* Auto-insight */}
                            <div style={{ marginTop:10, padding:'8px 12px', background:'var(--blue5)', borderRadius:8, fontSize:12, color:'var(--blue)', fontWeight:600 }}>
                              💡 {agentListedPct > 60
                                ? `Agents are driving ${agentListedPct}% of listings — strong agent network!`
                                : agentListedPct > 40
                                ? `Balanced contribution: Agents ${agentListedPct}% · Admin ${adminListedPct}%`
                                : `Admin is leading with ${adminListedPct}% of listings — consider recruiting more agents`}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Monthly Trend Bar Chart */}
                      {trend.length > 0 && (
                        <div className="card-flat" style={{ padding:20, marginBottom:18 }}>
                          <div style={{ fontWeight:700, color:'var(--blue)', fontSize:14, marginBottom:14 }}>📅 Monthly Sales Trend — Agents vs Admin</div>
                          <div style={{ display:'flex', alignItems:'flex-end', gap:16, height:100, overflow:'hidden' }}>
                            {trend.map((t: any) => {
                              const maxVal = Math.max(...trend.map((x: any) => x.agent_sales + x.admin_sales), 1);
                              const total = t.agent_sales + t.admin_sales;
                              const totalH = Math.round((total / maxVal) * 80);
                              const agentH = total > 0 ? Math.round((t.agent_sales / total) * totalH) : 0;
                              const adminH = totalH - agentH;
                              const [yr, mo] = t.month.split('-');
                              const label = new Date(Number(yr), Number(mo)-1).toLocaleString('default', { month:'short' });
                              return (
                                <div key={t.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                                  <div style={{ fontSize:10, color:'var(--slate2)', fontWeight:700 }}>{total}</div>
                                  <div style={{ display:'flex', flexDirection:'column', width:'100%', borderRadius:4, overflow:'hidden' }}>
                                    <div style={{ height:agentH, background:'var(--blue2)', minHeight: t.agent_sales > 0 ? 4 : 0 }} />
                                    <div style={{ height:adminH, background:'var(--teal2)', minHeight: t.admin_sales > 0 ? 4 : 0 }} />
                                  </div>
                                  <div style={{ fontSize:10, color:'var(--slate3)', fontWeight:600 }}>{label}</div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ display:'flex', gap:16, marginTop:10, fontSize:12 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                              <div style={{ width:12, height:12, background:'var(--blue2)', borderRadius:2 }} />
                              <span style={{ color:'var(--slate2)' }}>Agents</span>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                              <div style={{ width:12, height:12, background:'var(--teal2)', borderRadius:2 }} />
                              <span style={{ color:'var(--slate2)' }}>Admin</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Top Performing Agents Table */}
                      <div className="card-flat" style={{ overflow:'auto' }}>
                        <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid var(--slate5)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div style={{ fontWeight:700, color:'var(--blue)', fontSize:14 }}>🏆 Top Performing Agents</div>
                          <span style={{ fontSize:12, color:'var(--slate2)' }}>{topAgents.length} approved agent{topAgents.length !== 1 ? 's' : ''}</span>
                        </div>
                        {topAgents.length === 0 ? (
                          <div style={{ padding:28, textAlign:'center', color:'var(--slate3)', fontSize:13 }}>No approved agents yet</div>
                        ) : (
                          <table className="table" style={{ minWidth:640 }}>
                            <thead>
                              <tr>
                                <th style={{ width:36 }}>#</th>
                                <th>Agent</th>
                                <th style={{ textAlign:'center' }}>Properties Sold</th>
                                <th style={{ textAlign:'center' }}>Active Listings</th>
                                <th>Revenue Generated</th>
                                <th style={{ textAlign:'center' }}>Conversion</th>
                              </tr>
                            </thead>
                            <tbody>
                              {topAgents.map((a: any, idx: number) => {
                                const conv = a.total_listed > 0 ? Math.round((a.sold_count / a.total_listed) * 100) : 0;
                                const rev  = a.revenue;
                                const revStr = rev >= 10000000 ? `₹${(rev/10000000).toFixed(2)} Cr` : rev >= 100000 ? `₹${(rev/100000).toFixed(1)} L` : rev > 0 ? `₹${rev.toLocaleString('en-IN')}` : '—';
                                return (
                                  <tr key={a.id} style={{ background: idx === 0 ? '#fffbeb' : undefined }}>
                                    <td style={{ textAlign:'center', fontWeight:700, fontSize:13, color:'var(--slate3)' }}>
                                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                    </td>
                                    <td>
                                      <div style={{ fontWeight:700, color:'var(--dark)', fontSize:13 }}>{a.name}</div>
                                      <div style={{ fontSize:11, color:'var(--slate3)' }}>{a.email}</div>
                                    </td>
                                    <td style={{ textAlign:'center' }}>
                                      <span style={{
                                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                                        background: a.sold_count > 0 ? 'var(--blue5)' : 'var(--slate5)',
                                        color: a.sold_count > 0 ? 'var(--blue)' : 'var(--slate3)',
                                        fontWeight:800, fontSize:16, borderRadius:8, width:44, height:32,
                                      }}>{a.sold_count}</span>
                                    </td>
                                    <td style={{ textAlign:'center' }}>
                                      <span className="badge badge-teal">{a.active_count}</span>
                                    </td>
                                    <td>
                                      <div style={{ fontWeight:700, color:'var(--green)', fontSize:14 }}>{revStr}</div>
                                      <div style={{ fontSize:10, color:'var(--slate3)' }}>{a.total_listed} total listed</div>
                                    </td>
                                    <td style={{ textAlign:'center' }}>
                                      <div style={{ fontSize:13, fontWeight:700, color: conv >= 50 ? 'var(--green)' : conv >= 20 ? 'var(--amber)' : 'var(--slate3)' }}>
                                        {conv}%
                                      </div>
                                      <div style={{ marginTop:3, background:'var(--slate5)', borderRadius:99, height:4, width:60, margin:'3px auto 0' }}>
                                        <div style={{ width:`${conv}%`, height:'100%', borderRadius:99, background: conv >= 50 ? 'var(--green)' : conv >= 20 ? 'var(--amber)' : 'var(--slate4)' }} />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                        {/* Auto-insight footer */}
                        {topAgents.length > 0 && (() => {
                          const best = topAgents[0];
                          const totalAgentSold = topAgents.reduce((s: number, a: any) => s + a.sold_count, 0);
                          const bestShare = totalAgentSold > 0 ? Math.round((best.sold_count / totalAgentSold) * 100) : 0;
                          return (
                            <div style={{ padding:'12px 20px', background:'var(--slate6)', borderTop:'1px solid var(--slate5)', fontSize:12, color:'var(--slate2)', display:'flex', gap:16, flexWrap:'wrap' }}>
                              {best.sold_count > 0
                                ? <span>🏆 <strong style={{ color:'var(--blue)' }}>{best.name}</strong> is your top closer with {best.sold_count} sale{best.sold_count > 1 ? 's' : ''} ({bestShare}% of all agent sales)</span>
                                : <span>📋 No agent has closed a sale yet — help them with leads!</span>}
                              <span>· Total agent conversion: {topAgents.reduce((s: number, a: any) => s + a.total_listed, 0) > 0 ? Math.round(topAgents.reduce((s: number, a: any) => s + a.sold_count, 0) / topAgents.reduce((s: number, a: any) => s + a.total_listed, 0) * 100) : 0}% avg</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}

                {/* ── OVERVIEW EXTRAS ── */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop:4 }}>

                  {/* Listing type breakdown */}
                  <div className="card-flat" style={{ padding:20 }}>
                    <div style={{ fontWeight:700, color:'var(--blue)', marginBottom:14, fontSize:15 }}>📋 Listing Breakdown</div>
                    {(() => {
                      const total = props.length || 1;
                      const sale  = props.filter(p => p.listing === 'sale').length;
                      const rent  = props.filter(p => p.listing === 'rent').length;
                      const pg    = props.filter(p => (p as any).listing === 'pg').length;
                      const rows = [
                        { label:'For Sale',       count: sale, color:'var(--blue)',   pct: Math.round(sale/total*100) },
                        { label:'For Rent',       count: rent, color:'var(--green)',  pct: Math.round(rent/total*100) },
                        { label:'PG / Co-living', count: pg,   color:'var(--teal2)', pct: Math.round(pg/total*100) },
                      ];
                      return rows.map(r => (
                        <div key={r.label} style={{ marginBottom:10 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                            <span style={{ color:'var(--dark)', fontWeight:600 }}>{r.label}</span>
                            <span style={{ color:'var(--slate2)' }}>{r.count} ({r.pct}%)</span>
                          </div>
                          <div style={{ background:'var(--slate5)', borderRadius:99, height:7, overflow:'hidden' }}>
                            <div style={{ width:`${r.pct}%`, height:'100%', background:r.color, borderRadius:99, transition:'width .4s' }} />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Top Districts */}
                  <div className="card-flat" style={{ padding:20 }}>
                    <div style={{ fontWeight:700, color:'var(--blue)', marginBottom:14, fontSize:15 }}>🗺️ Top Districts by Listings</div>
                    {(() => {
                      const distMap: Record<string,number> = {};
                      props.forEach(p => { if (p.district) distMap[p.district] = (distMap[p.district]||0)+1; });
                      const sorted = Object.entries(distMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
                      const max = sorted[0]?.[1] || 1;
                      return sorted.length ? sorted.map(([d,c]) => (
                        <div key={d} style={{ marginBottom:9 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:3 }}>
                            <span style={{ color:'var(--dark)', fontWeight:600 }}>{d}</span>
                            <span style={{ color:'var(--slate2)' }}>{c} listing{c>1?'s':''}</span>
                          </div>
                          <div style={{ background:'var(--slate5)', borderRadius:99, height:7, overflow:'hidden' }}>
                            <div style={{ width:`${Math.round(c/max*100)}%`, height:'100%', background:'var(--blue2)', borderRadius:99 }} />
                          </div>
                        </div>
                      )) : <p style={{ color:'var(--slate3)', fontSize:13 }}>No properties yet</p>;
                    })()}
                  </div>

                  {/* Recent Listings */}
                  <div className="card-flat" style={{ padding:20 }}>
                    <div style={{ fontWeight:700, color:'var(--blue)', marginBottom:14, fontSize:15 }}>🆕 Recent Listings</div>
                    {props.slice().sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,5).map(p => (
                      <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, paddingBottom:10, borderBottom:'1px solid var(--slate5)' }}>
                        {p.photos?.[0] ? (
                          <img
                            src={p.photos[0].startsWith('/uploads/') ? `http://localhost:3001${p.photos[0]}` : p.photos[0]}
                            alt=""
                            style={{ width:44, height:36, objectFit:'cover', borderRadius:6, flexShrink:0 }}
                          />
                        ) : (
                          <div style={{ width:44, height:36, background:'var(--slate5)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🏠</div>
                        )}
                        <div style={{ overflow:'hidden' }}>
                          <div style={{ fontWeight:600, fontSize:13, color:'var(--dark)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.title}</div>
                          <div style={{ fontSize:11, color:'var(--slate2)' }}>{p.district}, {p.state} · {p.created_at?.split('T')[0]}</div>
                        </div>
                      </div>
                    ))}
                    {props.length === 0 && <p style={{ color:'var(--slate3)', fontSize:13 }}>No properties yet</p>}
                  </div>

                  {/* Platform Health */}
                  <div className="card-flat" style={{ padding:20 }}>
                    <div style={{ fontWeight:700, color:'var(--blue)', marginBottom:14, fontSize:15 }}>🩺 Platform Health</div>
                    {(() => {
                      const total         = props.length || 1;
                      const withPhotos    = props.filter(p => p.photos?.length > 0).length;
                      const withDesc      = props.filter((p:any) => p.description && p.description.length > 40).length;
                      const agentApproved = agents.filter(a => a.agent_status==='approved').length;
                      const agentTotal    = agents.length || 1;
                      const checks = [
                        { label:'Properties with photos',      pct: Math.round(withPhotos/total*100),        color:'var(--teal)' },
                        { label:'Properties with description', pct: Math.round(withDesc/total*100),          color:'var(--blue2)' },
                        { label:'Agent approval rate',         pct: Math.round(agentApproved/agentTotal*100),color:'var(--green)' },
                        { label:'Agent capacity used',         pct: Math.round(agentApproved/10*100),        color: agentApproved>=8?'var(--red)':'var(--amber)' },
                      ];
                      return (
                        <>
                          {checks.map(c => (
                            <div key={c.label} style={{ marginBottom:10 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                                <span style={{ color:'var(--dark)' }}>{c.label}</span>
                                <span style={{ fontWeight:700, color:c.color }}>{c.pct}%</span>
                              </div>
                              <div style={{ background:'var(--slate5)', borderRadius:99, height:6, overflow:'hidden' }}>
                                <div style={{ width:`${c.pct}%`, height:'100%', background:c.color, borderRadius:99, transition:'width .4s' }} />
                              </div>
                            </div>
                          ))}
                          <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--slate5)' }}>
                            <div style={{ fontSize:12, color:'var(--slate2)', marginBottom:4 }}>Average sale price</div>
                            <div style={{ fontSize:20, fontWeight:800, color:'var(--blue)' }}>
                              {props.filter(p=>p.listing==='sale'&&p.price>0).length > 0
                                ? `₹${(props.filter(p=>p.listing==='sale').reduce((s,p)=>s+p.price,0)/props.filter(p=>p.listing==='sale'&&p.price>0).length/100000).toFixed(1)} L`
                                : '—'}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                </div>
              </div>
            )}

            {/* ── AGENT MANAGEMENT ── */}
            {tab === 'agents' && (
              <div>
                <h2 style={{ fontWeight:700, color:'var(--blue)', marginBottom:6 }}>Agent Management</h2>
                <p style={{ color:'var(--slate2)', fontSize:14, marginBottom:20 }}>
                  Max 10 agents allowed. Approve or reject registrations.
                  Currently: {agents.filter(a=>a.agent_status==='approved').length} approved,{' '}
                  {agents.filter(a=>a.agent_status==='pending').length} pending,{' '}
                  {agents.filter(a=>a.agent_status==='rejected').length} rejected.
                </p>

                {/* Pending first */}
                {agents.filter(a => a.agent_status==='pending').length > 0 && (
                  <div style={{ marginBottom:24 }}>
                    <h3 style={{ fontWeight:700, color:'var(--amber)', marginBottom:12, fontSize:15 }}>⏳ Pending Approval</h3>
                    {agents.filter(a => a.agent_status==='pending').map(a => (
                      <div key={a.id} className="card-flat" style={{ padding:16, marginBottom:10, borderLeft:'4px solid #f59e0b' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
                          <div>
                            <div style={{ fontWeight:700, color:'var(--dark)', fontSize:15 }}>{a.name}</div>
                            <div style={{ fontSize:13, color:'var(--slate2)' }}>{a.email} · {a.phone}</div>
                            <div style={{ fontSize:12, color:'var(--slate3)', marginTop:4 }}>Applied: {timeAgo(a.created_at)}</div>
                          </div>
                          <div style={{ display:'flex', gap:10 }}>
                            <button className="btn btn-green btn-sm" onClick={() => approveAgent(a.id)}>✓ Approve</button>
                            <button className="btn btn-red btn-sm" onClick={() => rejectAgent(a.id)}>✗ Reject</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* All agents */}
                <h3 style={{ fontWeight:700, color:'var(--blue)', marginBottom:12, fontSize:15 }}>All Agent Registrations</h3>
                <div className="card-flat" style={{ overflow:'auto' }}>
                  <table className="table" style={{ minWidth:600 }}>
                    <thead>
                      <tr><th>Agent</th><th>Contact</th><th>Status</th><th>Applied</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {agents.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--slate2)', padding:40 }}>No agent registrations yet</td></tr>
                      ) : agents.map(a => (
                        <tr key={a.id}>
                          <td>
                            <div style={{ fontWeight:600 }}>{a.name}</div>
                            <div style={{ fontSize:11, color:'var(--slate2)' }}>{a.email}</div>
                          </td>
                          <td style={{ fontSize:12 }}>{a.phone}</td>
                          <td>
                            <span className={`badge ${
                              a.agent_status==='approved' ? 'badge-green' :
                              a.agent_status==='pending'  ? 'badge-amber' : 'badge-red'
                            }`}>
                              {a.agent_status==='approved' ? '✓ Approved' :
                               a.agent_status==='pending'  ? '⏳ Pending' : '✗ Rejected'}
                            </span>
                          </td>
                          <td style={{ fontSize:12 }}>{a.created_at?.split('T')[0]}</td>
                          <td>
                            <div style={{ display:'flex', gap:6 }}>
                              {a.agent_status==='pending' && (
                                <>
                                  <button className="btn btn-green btn-sm" onClick={() => approveAgent(a.id)}>✓ Approve</button>
                                  <button className="btn btn-red btn-sm" onClick={() => rejectAgent(a.id)}>✗ Reject</button>
                                </>
                              )}
                              {a.agent_status==='rejected' && (
                                <button className="btn btn-green btn-sm" onClick={() => approveAgent(a.id)}>↩ Re-approve</button>
                              )}
                              {a.agent_status==='approved' && (
                                <button className="btn btn-red btn-sm" onClick={() => rejectAgent(a.id)}>Revoke</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── PROPERTIES ── */}
            {tab === 'properties' && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                  <h2 style={{ fontWeight:700, color:'var(--blue)' }}>All Properties ({props.length})</h2>
                  <button className="btn btn-blue2 btn-sm" onClick={() => nav('list')}>+ Add Property</button>
                </div>
                <div className="card-flat" style={{ overflow:'auto' }}>
                  <table className="table" style={{ minWidth:800 }}>
                    <thead>
                      <tr><th>Property</th><th>Location</th><th>Price</th><th>Floors</th><th>Status</th><th>Agent</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {props.map(p => (
                        <tr key={p.id}>
                          <td style={{ maxWidth:200 }}>
                            <div style={{ fontWeight:600, color:'var(--dark)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.title}</div>
                            <div style={{ fontSize:11, color:'var(--slate2)' }}>{p.type} · {p.listing}</div>
                          </td>
                          <td>
                            <div style={{ fontSize:13 }}>{p.district}</div>
                            <div style={{ fontSize:11, color:'var(--slate3)' }}>{p.state}</div>
                          </td>
                          <td style={{ fontWeight:700, color:'var(--blue)' }}>{fmtPrice(p.price, p.listing)}</td>
                          <td style={{ fontSize:13 }}>{(p as any).floors > 0 ? `${(p as any).floors}F` : '—'}</td>
                          <td>
                            <select className="sel" style={{ padding:'4px 8px', fontSize:12 }} value={p.status}
                              onChange={e => setStatus(p.id, e.target.value)}>
                              {['active','sold','rented','inactive'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td>
                            <div style={{ fontSize:12 }}>{p.agent_name || '—'}</div>
                            {p.agent_phone && <div style={{ fontSize:11, color:'var(--slate2)' }}>{p.agent_phone}</div>}
                          </td>
                          <td>
                            <div style={{ display:'flex', gap:6 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => nav('detail', p.id)}>👁</button>
                              <button className="btn btn-outline btn-sm" onClick={() => nav('list', p.id)}>✏️</button>
                              <button className="btn btn-red btn-sm" onClick={() => delProp(p.id, p.title)}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── USERS ── */}
            {tab === 'users' && (
              <div>
                <h2 style={{ fontWeight:700, color:'var(--blue)', marginBottom:16 }}>All Users ({users.length})</h2>
                <div className="card-flat" style={{ overflow:'auto' }}>
                  <table className="table" style={{ minWidth:720 }}>
                    <thead>
                      <tr><th>User</th><th>Contact</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ fontWeight:600, color:'var(--dark)' }}>{u.name}</div>
                            <div style={{ fontSize:11, color:'var(--slate2)' }}>{u.email}</div>
                          </td>
                          <td style={{ fontSize:12 }}>{u.phone}</td>
                          <td>
                            {u.role === 'admin' ? (
                              <span className="badge badge-blue">👑 Admin</span>
                            ) : (
                              <select className="sel" style={{ padding:'4px 8px', fontSize:12 }} value={u.role}
                                onChange={e => changeRole(u.id, e.target.value)}>
                                <option value="buyer">🛒 Buyer</option>
                                <option value="agent">🏠 Agent</option>
                              </select>
                            )}
                            {u.role==='agent' && u.agent_status && u.agent_status!=='approved' && (
                              <div style={{ fontSize:10, color:'var(--amber)', marginTop:2 }}>{u.agent_status}</div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${u.is_restricted?'badge-red':'badge-green'}`}>
                              {u.is_restricted ? '🚫 Restricted' : '✓ Active'}
                            </span>
                          </td>
                          <td style={{ fontSize:12 }}>{u.created_at?.split('T')[0]}</td>
                          <td>
                            {u.role !== 'admin' && (
                              <div style={{ display:'flex', gap:6 }}>
                                <button
                                  className={`btn btn-sm ${u.is_restricted?'btn-green':'btn-red'}`}
                                  onClick={() => restrict(u.id, !u.is_restricted)}>
                                  {u.is_restricted ? '✓ Restore' : '🚫 Restrict'}
                                </button>
                                <button className="btn btn-red btn-sm" onClick={() => deleteUser(u.id, u.name)}>🗑</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── ENQUIRIES ── */}
            {tab === 'enquiries' && (
              <div>
                <h2 style={{ fontWeight:700, color:'var(--blue)', marginBottom:16 }}>All Enquiries ({enqs.length})</h2>
                {enqs.map(e => (
                  <div key={e.id} className="card-flat" style={{ padding:16, marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:8 }}>
                      <div>
                        <div style={{ fontWeight:700, color:'var(--blue)', fontSize:14 }}>{e.property_title}</div>
                        <div style={{ fontSize:12, color:'var(--slate2)' }}>By: {e.user_name} ({e.user_email}) · {e.user_phone}</div>
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <span className={`badge ${e.status==='open'?'badge-green':'badge-slate'}`}>{e.status}</span>
                        <select className="sel" style={{ padding:'4px 8px', fontSize:12 }} value={e.status}
                          onChange={async ev => {
                            await api.updateEnquiry(e.id, ev.target.value);
                            setEnqs(enqs.map(x => x.id===e.id ? {...x, status: ev.target.value} : x));
                          }}>
                          <option value="open">Open</option>
                          <option value="replied">Replied</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                    <p style={{ fontSize:13, color:'var(--slate)', lineHeight:1.6 }}>{e.message}</p>
                    <div style={{ fontSize:12, color:'var(--slate2)', marginTop:6 }}>{timeAgo(e.created_at)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── ANALYTICS ── */}
            {tab === 'analytics' && analytics && (
              <div>
                <h2 style={{ fontWeight:700, color:'var(--blue)', marginBottom:24 }}>Analytics & Insights</h2>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
                  <div className="card-flat" style={{ padding:20 }}>
                    <h3 style={{ fontWeight:700, color:'var(--blue)', marginBottom:16, fontSize:15 }}>Listings by District</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={analytics.byDistrict.slice(0,6)} margin={{ left:-20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="district" tick={{ fontSize:11 }} />
                        <YAxis tick={{ fontSize:11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="var(--blue2)" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card-flat" style={{ padding:20 }}>
                    <h3 style={{ fontWeight:700, color:'var(--blue)', marginBottom:16, fontSize:15 }}>By Property Type</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={analytics.byType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label={d => `${d.type}: ${d.count}`}>
                          {analytics.byType.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card-flat" style={{ padding:20 }}>
                    <h3 style={{ fontWeight:700, color:'var(--blue)', marginBottom:16, fontSize:15 }}>Price Range Distribution</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={analytics.priceRanges} margin={{ left:-20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="range" tick={{ fontSize:10 }} />
                        <YAxis tick={{ fontSize:11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="var(--teal)" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card-flat" style={{ padding:20 }}>
                    <h3 style={{ fontWeight:700, color:'var(--blue)', marginBottom:16, fontSize:15 }}>Sale vs Rent</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={analytics.byListing} dataKey="count" nameKey="listing" cx="50%" cy="50%" outerRadius={80} label={d => `${d.listing}: ${d.count}`}>
                          {analytics.byListing.map((_: any, i: number) => <Cell key={i} fill={['var(--blue)','var(--teal)'][i]} />)}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function PriceTrends({ nav }: any) {
  const [data, setData]         = useState<any[]>([]);
  const [state, setState]       = useState('Punjab');
  const [district, setDistrict] = useState('Ludhiana');
  const [type, setType]         = useState('house');
  const [loading, setLoading]   = useState(false);
  const [realPpsf, setRealPpsf] = useState<number|null>(null);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const d = await api.getTrends({ state, district, type });
      const formatted = d.trends.map((r: any) => ({
        label: `${MONTHS[r.month-1]} ${r.year}`,
        price: r.avg_price,
        month: r.month, year: r.year,
      }));
      setData(formatted);
      setRealPpsf(d.real_avg_price_per_sqft || null);
    } catch { setData([]); setRealPpsf(null); }
    setLoading(false);
  };

  useEffect(() => { fetchTrends(); }, [state, district, type]);

  const change = data.length >= 2
    ? (((data[data.length-1].price - data[0].price) / data[0].price) * 100).toFixed(1)
    : '0.0';
  const isUp = Number(change) >= 0;
  const current = data[data.length-1]?.price || 0;
  const peak    = Math.max(...data.map(d => d.price));
  const low     = Math.min(...data.map(d => d.price));

  return (
    <div style={{ padding:'32px 0 64px' }}>
      <div className="container">
        <div style={{ marginBottom:32 }}>
          <h1 className="serif" style={{ fontSize:32, color:'var(--dark)', marginBottom:8 }}>📊 Property Price Trends</h1>
          <p style={{ color:'var(--slate2)' }}>Track average property prices across Punjab districts over time</p>
        </div>

        {/* Filters — State + District + Type */}
        <div className="card-flat" style={{ padding:20, marginBottom:28, display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div>
            <label className="lbl">State</label>
            <select className="sel" value={state} onChange={e => { setState(e.target.value); setDistrict(''); }}>
              {INDIA_STATES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">District</label>
            {state === 'Punjab' ? (
              <select className="sel" value={district} onChange={e => setDistrict(e.target.value)}>
                {PUNJAB_DISTRICTS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            ) : (
              <input className="inp" value={district} onChange={e => setDistrict(e.target.value)}
                placeholder="Enter district name" style={{ width:160 }} />
            )}
          </div>
          <div>
            <label className="lbl">Property Type</label>
            <select className="sel" value={type} onChange={e => setType(e.target.value)}>
              {PROPERTY_TYPES.filter(t => t.value !== 'shop' && t.value !== 'pg').map(t =>
                <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
            </select>
          </div>
          <button className="btn btn-blue2 btn-sm" onClick={fetchTrends}>🔄 Refresh</button>
        </div>

        {/* Summary cards — 5 cards including real price/sqft */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16, marginBottom:28 }}>
          {[
            { label:'Hist. Avg/sqft', value:`₹${current.toLocaleString('en-IN')}/sqft`, icon:'📊', color:'var(--blue)' },
            { label:`Change (${data.length} mo)`, value:`${isUp?'+':''}${change}%`, icon:isUp?'📈':'📉', color:isUp?'var(--green)':'var(--red)' },
            { label:'Peak Price', value:`₹${peak.toLocaleString('en-IN')}/sqft`, icon:'🏆', color:'var(--amber)' },
            { label:'Lowest Price', value:`₹${low.toLocaleString('en-IN')}/sqft`, icon:'📉', color:'var(--teal)' },
            { label:'Real Avg/sqft', value: realPpsf ? `₹${realPpsf.toLocaleString('en-IN')}/sqft` : 'N/A', icon:'🏠', color:'var(--blue2)', tooltip:'Calculated as Total Price ÷ Area from actual listings' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign:'center' }}>
              <div style={{ fontSize:24 }}>{s.icon}</div>
              <div style={{ fontSize:15, fontWeight:800, color:s.color, marginTop:4 }}>{s.value}</div>
              <div style={{ fontSize:11, color:'var(--slate2)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main chart */}
        <div className="card-flat" style={{ padding:24, marginBottom:24 }}>
          <h3 style={{ fontWeight:700, color:'var(--blue)', marginBottom:20 }}>
            Avg. Price/sqft — {district}{state && state !== 'Punjab' ? `, ${state}` : ', Punjab'} ({type})
            {realPpsf && <span style={{ fontSize:13, fontWeight:500, color:'var(--slate2)', marginLeft:12 }}>
              Real avg from listings: ₹{realPpsf.toLocaleString('en-IN')}/sqft
            </span>}
          </h3>
          {loading ? (
            <div style={{ textAlign:'center', padding:60 }}><div className="pulse" style={{ fontSize:48 }}>📊</div></div>
          ) : data.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:'var(--slate2)' }}>No trend data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={data} margin={{ left:0, right:20, top:10, bottom:20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize:11 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize:11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}/sqft`, 'Avg Price']}
                  contentStyle={{ borderRadius:10, border:'1px solid var(--slate4)', boxShadow:'var(--shadow)' }}
                />
                <Line
                  type="monotone" dataKey="price"
                  stroke="var(--blue2)" strokeWidth={3} dot={{ fill:'var(--blue)', r:4 }}
                  activeDot={{ r:7, fill:'var(--blue)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Compare districts */}
        <div className="card-flat" style={{ padding:24 }}>
          <h3 style={{ fontWeight:700, color:'var(--blue)', marginBottom:16 }}>
            Compare Districts — Current Avg Prices ({state})
          </h3>
          <p style={{ fontSize:12, color:'var(--slate2)', marginBottom:16 }}>
            ⚠️ Comparison uses price history data for Punjab. Price/sqft = Total Price ÷ Area (sqft)
          </p>
          <CompareChart type={type} state={state} />
        </div>
      </div>
    </div>
  );
}

function CompareChart({ type, state }: { type: string; state: string }) {
  const [data, setData] = useState<any[]>([]);
  const mainDistricts = ['Ludhiana','Amritsar','Jalandhar','Mohali (SAS Nagar)','Patiala','Bathinda'];

  useEffect(() => {
    if (state && state !== 'Punjab') {
      // For non-Punjab states, show real property price/sqft from DB
      api.getTrends({ state, type }).then(r => {
        setData(r.real_avg_price_per_sqft
          ? [{ district: state, price: r.real_avg_price_per_sqft }]
          : []);
      }).catch(() => setData([]));
    } else {
      // Punjab: compare all main districts using price history
      Promise.all(mainDistricts.map(d =>
        api.getTrends({ district: d, type }).then(r => {
          const rows = r.trends;
          const last = rows[rows.length-1];
          // Price per sqft from history (avg_price is already ₹/sqft in price_history)
          return { district: d.replace(' (SAS Nagar)','').replace('Mohali','Mohali'), price: last?.avg_price || 0 };
        })
      )).then(setData).catch(() => {});
    }
  }, [type, state]);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left:0, right:20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="district" tick={{ fontSize:12 }} />
        <YAxis tick={{ fontSize:11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
        <Tooltip formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}/sqft`, 'Avg Price']} contentStyle={{ borderRadius:10 }} />
        <Bar dataKey="price" fill="var(--blue)" radius={[6,6,0,0]}>
          {data.map((_: any, i: number) => <Cell key={i} fill={['#1e3a8a','#2563eb','#3b82f6','#1d4ed8','#1e40af','#0f766e'][i]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AI ASSISTANT PAGE
// ═══════════════════════════════════════════════════════════════════════════

function AIAssistant({ nav, user, msg }: any) {
  const [messages, setMessages] = useState([
    { role:'ai', text:'👋 **Sat Sri Akal!** I\'m your PropEstate360 AI Assistant.\n\nI can help you:\n• 🔍 **Find properties** — *"Find 3BHK in Ludhiana under 80 lakh"*\n• 💰 **Calculate EMI** — *"EMI for 60 lakh at 8.5% for 20 years"*\n• 📈 **Price trends** — *"Trend for houses in Ludhiana, Punjab"* *(specify state + district + type)*\n• 💡 **Price per sqft** — *"Price per sqft in Mohali"*\n• 🏙️ **Investment advice** — *"Best areas to invest in Punjab"*\n• 📊 **Market statistics** — *"How many properties are listed?"*\n\nWhat are you looking for today?' },
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role:'user', text: userMsg }]);
    setLoading(true);
    try {
      const d = await api.aiChat(userMsg, messages.slice(-8));
      setMessages(m => [...m, { role:'ai', text: d.reply }]);
    } catch {
      setMessages(m => [...m, { role:'ai', text:'⚠️ I encountered an error. Please try again!' }]);
    }
    setLoading(false);
  };

  const SUGGESTIONS = [
    '🔍 Find 3BHK in Ludhiana under 80 lakh',
    '💰 EMI for 60 lakh at 8.5% for 20 years',
    '📈 Price trend for houses in Amritsar',
    '🏙️ Best areas to invest in Punjab',
    '📊 How many properties are listed?',
  ];

  function renderText(text: string) {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Simple markdown rendering
      let parts: any[] = [line];
      parts = parts.flatMap(p => typeof p !== 'string' ? [p] :
        p.split(/(\*\*[^*]+\*\*)/).map((s, j) =>
          s.startsWith('**') && s.endsWith('**')
            ? <strong key={j} style={{ color:'var(--blue)', fontWeight:700 }}>{s.slice(2,-2)}</strong>
            : s
        )
      );
      return <div key={i} style={{ minHeight:line?'auto':'8px' }}>{parts}</div>;
    });
  }

  return (
    <div style={{ padding:'32px 0 64px' }}>
      <div className="container" style={{ maxWidth:760 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🤖</div>
          <h1 className="serif" style={{ fontSize:28, color:'var(--blue)', marginBottom:4 }}>AI Real Estate Assistant</h1>
          <p style={{ color:'var(--slate2)', fontSize:14 }}>
            Powered by PropEstate360's intelligent database engine · No external API needed
          </p>
        </div>

        {/* Chat window */}
        <div className="card-flat" style={{ marginBottom:16, overflow:'hidden' }}>
          <div style={{
            height:480, overflowY:'auto', padding:20,
            display:'flex', flexDirection:'column', gap:16,
            background:'var(--blue5)',
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent: m.role==='user'?'flex-end':'flex-start' }}>
                {m.role === 'ai' && (
                  <div style={{
                    width:32, height:32, background:'var(--blue)', borderRadius:'50%',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:16, flexShrink:0, marginRight:8, marginTop:4,
                  }}>🤖</div>
                )}
                <div className={m.role==='user'?'bubble-user':'bubble-ai'}>
                  {renderText(m.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{
                  width:32, height:32, background:'var(--blue)', borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                }}>🤖</div>
                <div className="bubble-ai">
                  <span className="pulse">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding:16, borderTop:'1px solid var(--slate4)', display:'flex', gap:10, background:'#fff' }}>
            <input
              className="inp"
              placeholder="Ask about properties, EMI, price trends..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              disabled={loading}
            />
            <button className="btn btn-blue2" onClick={send} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>

        {/* Suggestions */}
        <div>
          <p style={{ fontSize:13, color:'var(--slate2)', marginBottom:10, fontWeight:600 }}>💡 Try asking:</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {SUGGESTIONS.map(s => (
              <span key={s} className="chip" onClick={() => { setInput(s); }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INDIA STATES PAGE
// ═══════════════════════════════════════════════════════════════════════════

function IndiaStatesPage({ nav }: any) {
  const [view, setView]             = useState<'india'|'state'>('india');
  const [selectedState, setSelectedState] = useState<string>('');
  const [search, setSearch]         = useState('');
  const [stateSummary, setStateSummary] = useState<{state:string,count:number}[]>([]);
  const [breakdown, setBreakdown]   = useState<any>(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    api.getStatesSummary().then(d => setStateSummary(d.states || [])).catch(() => {});
  }, []);

  const handleStateClick = async (stateName: string) => {
    setSelectedState(stateName);
    setView('state');
    setLoading(true);
    try {
      const d = await api.getStateBreakdown(stateName);
      setBreakdown(d);
    } catch { setBreakdown(null); }
    setLoading(false);
  };

  const countMap = Object.fromEntries(stateSummary.map(s => [s.state, s.count]));
  const totalProps = stateSummary.reduce((a, s) => a + s.count, 0);

  const filteredStates = INDIA_STATES.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.capital.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding:'32px 0 64px' }}>
      <div className="container">

        {/* Header + breadcrumb */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, fontSize:13, color:'var(--slate2)' }}>
            <span style={{ cursor:'pointer', color:'var(--blue2)' }} onClick={() => { setView('india'); setBreakdown(null); setSearch(''); }}>
              🇮🇳 India
            </span>
            {view === 'state' && selectedState && (
              <><span>›</span><span style={{ color:'var(--dark)', fontWeight:600 }}>{selectedState}</span></>
            )}
          </div>
          <h1 className="serif" style={{ fontSize:32, color:'var(--dark)', marginBottom:6 }}>
            {view === 'india' ? '🗺️ Explore Properties Across India' : `🏙️ ${selectedState}`}
          </h1>
          <p style={{ color:'var(--slate2)' }}>
            {view === 'india'
              ? `${totalProps} active properties across ${stateSummary.length} states`
              : breakdown?.type === 'punjab'
                ? `${breakdown?.total || 0} properties across all ${breakdown?.breakdown?.length || 23} districts`
                : `${breakdown?.total || 0} properties${breakdown?.capital ? ` · Capital: ${breakdown.capital}` : ''}`}
          </p>
        </div>

        {/* ─── INDIA VIEW ─── */}
        {view === 'india' && (
          <>
            {/* Punjab highlight card */}
            <div style={{
              background:'linear-gradient(135deg,var(--blue),var(--blue2))',
              borderRadius:'var(--radius-lg)', padding:28, marginBottom:32, color:'#fff',
              cursor:'pointer',
            }} onClick={() => handleStateClick('Punjab')}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:'#93c5fd', marginBottom:4, textTransform:'uppercase' }}>
                    ⭐ Full Coverage · All 23 Districts
                  </div>
                  <h2 style={{ fontSize:28, fontWeight:800, marginBottom:4 }}>Punjab</h2>
                  <p style={{ color:'#bfdbfe', fontSize:14 }}>
                    Capital: Chandigarh · {countMap['Punjab'] || 0} active properties · Click to explore all districts
                  </p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:36, fontWeight:900 }}>{countMap['Punjab'] || 0}</div>
                  <div style={{ fontSize:12, color:'#93c5fd' }}>Properties</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:16, marginTop:20, flexWrap:'wrap' }}>
                {PUNJAB_DISTRICTS.slice(0, 8).map(d => (
                  <div key={d.name} style={{ fontSize:12 }}>
                    <div style={{ fontWeight:600 }}>{d.name}</div>
                    <div style={{ color:'#bfdbfe', fontSize:10 }}>HQ: {d.hq}</div>
                  </div>
                ))}
                <div style={{ fontSize:12, color:'#93c5fd', alignSelf:'flex-end' }}>+{PUNJAB_DISTRICTS.length - 8} more</div>
              </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom:24 }}>
              <input className="inp" style={{ maxWidth:360 }} placeholder="Search state or capital..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* States grid */}
            <div className="grid3">
              {filteredStates.map(s => {
                const count = countMap[s.name] || 0;
                return (
                  <div key={s.name} className="card" style={{ padding:20, cursor:'pointer', display:'flex', gap:14, alignItems:'flex-start' }}
                    onClick={() => handleStateClick(s.name)}>
                    <div style={{ fontSize:28 }}>{s.name === 'Punjab' ? '⭐' : '🏛️'}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, color:'var(--dark)', marginBottom:2 }}>{s.name}</div>
                      <div style={{ fontSize:13, color:'var(--blue2)', fontWeight:600 }}>🏙️ {s.capital}</div>
                      {count > 0 ? (
                        <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8 }}>
                          <span className="badge badge-blue" style={{ fontSize:11 }}>{count} properties</span>
                          <span style={{ fontSize:11, color:'var(--blue2)' }}>View →</span>
                        </div>
                      ) : (
                        <div className="badge badge-slate" style={{ marginTop:6, fontSize:11 }}>No listings yet</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ─── STATE DRILL-DOWN VIEW ─── */}
        {view === 'state' && (
          <>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom:24 }}
              onClick={() => { setView('india'); setBreakdown(null); }}>
              ← Back to India
            </button>

            {loading ? (
              <div style={{ textAlign:'center', padding:80 }}>
                <div className="pulse" style={{ fontSize:48 }}>🏙️</div>
                <p style={{ color:'var(--slate2)', marginTop:16 }}>Loading {selectedState} data...</p>
              </div>
            ) : !breakdown || breakdown.total === 0 ? (
              <div style={{ textAlign:'center', padding:80 }}>
                <div style={{ fontSize:64, marginBottom:16 }}>🏗️</div>
                <h3 style={{ color:'var(--dark)', marginBottom:8 }}>No listings yet in {selectedState}</h3>
                <p style={{ color:'var(--slate2)', marginBottom:24 }}>
                  Be the first to list a property in {selectedState}!
                  {breakdown?.capital && ` Properties in ${breakdown.capital} (capital) would appear here.`}
                </p>
                <button className="btn btn-primary" onClick={() => nav('list')}>List a Property</button>
              </div>
            ) : (
              <>
                {/* Punjab: all districts */}
                {breakdown.type === 'punjab' && (
                  <>
                    <div style={{ marginBottom:28 }}>
                      <h2 style={{ fontWeight:800, fontSize:22, color:'var(--dark)', marginBottom:4 }}>
                        All {breakdown.breakdown?.length} Districts of Punjab
                      </h2>
                      <p style={{ color:'var(--slate2)', fontSize:14 }}>
                        Complete coverage · {breakdown.total} total properties
                      </p>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
                      {breakdown.breakdown?.map((d: any) => (
                        <div key={d.district}>
                          {/* District header */}
                          <div style={{
                            display:'flex', justifyContent:'space-between', alignItems:'center',
                            marginBottom:14, paddingBottom:10,
                            borderBottom:'2px solid var(--blue5)',
                          }}>
                            <div>
                              <h3 style={{ fontWeight:700, fontSize:18, color:'var(--blue)' }}>
                                📍 {d.district}
                              </h3>
                              <span style={{ fontSize:13, color:'var(--slate2)' }}>
                                {d.count} {d.count === 1 ? 'property' : 'properties'}
                                {d.avg_price > 0 && ` · Avg ₹${(d.avg_price/100000).toFixed(1)}L`}
                              </span>
                            </div>
                            <button className="btn btn-outline btn-sm"
                              onClick={() => nav('properties', { state:'Punjab', district: d.district })}>
                              View All →
                            </button>
                          </div>

                          {/* Featured cards */}
                          {d.featured?.length > 0 ? (
                            <div className="grid3">
                              {d.featured.map((p: any) => (
                                <div key={p.id} className="card" style={{ cursor:'pointer' }}
                                  onClick={() => nav('detail', p.id)}>
                                  <div style={{
                                    height:140, background:'linear-gradient(135deg,var(--blue5),var(--blue4))',
                                    position:'relative', overflow:'hidden',
                                  }}>
                                    {p.photos?.[0] ? (
                                      <img src={p.photos[0]} alt={p.title}
                                        style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                    ) : (
                                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:40 }}>
                                        {p.type === 'villa' ? '🏡' : p.type === 'apartment' ? '🏢' : p.type === 'plot' ? '📐' : '🏠'}
                                      </div>
                                    )}
                                    {p.featured && (
                                      <div className="badge badge-amber" style={{
                                        position:'absolute', top:8, left:8, fontSize:10
                                      }}>⭐ Featured</div>
                                    )}
                                  </div>
                                  <div style={{ padding:'12px 14px' }}>
                                    <div style={{ fontWeight:700, fontSize:13, color:'var(--dark)', marginBottom:4,
                                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                      {p.title}
                                    </div>
                                    <div style={{ fontWeight:800, color:'var(--blue)', fontSize:15, marginBottom:4 }}>
                                      {p.listing === 'rent'
                                        ? `₹${(p.price/1000).toFixed(0)}K/mo`
                                        : p.price >= 10000000 ? `₹${(p.price/10000000).toFixed(2)} Cr`
                                        : `₹${(p.price/100000).toFixed(1)} L`}
                                    </div>
                                    <div style={{ fontSize:11, color:'var(--slate2)', display:'flex', gap:8 }}>
                                      <span>🛏 {p.beds} BHK</span>
                                      <span>📐 {p.area} sqft</span>
                                      {p.price_per_sqft && <span>₹{p.price_per_sqft}/sqft</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ padding:'16px 0', color:'var(--slate3)', fontSize:13 }}>
                              No featured listings yet in {d.district}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Other states: capital-based */}
                {breakdown.type === 'other' && (
                  <>
                    <div style={{ marginBottom:28 }}>
                      <h2 style={{ fontWeight:800, fontSize:22, color:'var(--dark)', marginBottom:4 }}>
                        Properties in {selectedState}
                      </h2>
                      {breakdown.capital && (
                        <p style={{ color:'var(--slate2)', fontSize:14 }}>
                          Capital city: {breakdown.capital} · {breakdown.total} total listings
                        </p>
                      )}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
                      {breakdown.breakdown?.map((d: any) => (
                        <div key={d.district}>
                          <div style={{
                            display:'flex', justifyContent:'space-between', alignItems:'center',
                            marginBottom:14, paddingBottom:10,
                            borderBottom:'2px solid var(--blue5)',
                          }}>
                            <div>
                              <h3 style={{ fontWeight:700, fontSize:18, color:'var(--blue)' }}>
                                📍 {d.district}
                                {d.is_capital && <span className="badge badge-amber" style={{ marginLeft:8, fontSize:11 }}>Capital</span>}
                              </h3>
                              <span style={{ fontSize:13, color:'var(--slate2)' }}>
                                {d.count} {d.count === 1 ? 'property' : 'properties'}
                                {d.avg_price > 0 && ` · Avg ₹${(d.avg_price/100000).toFixed(1)}L`}
                              </span>
                            </div>
                            <button className="btn btn-outline btn-sm"
                              onClick={() => nav('properties', { state: selectedState, district: d.district })}>
                              View All →
                            </button>
                          </div>
                          {d.featured?.length > 0 && (
                            <div className="grid3">
                              {d.featured.map((p: any) => (
                                <div key={p.id} className="card" style={{ cursor:'pointer' }}
                                  onClick={() => nav('detail', p.id)}>
                                  <div style={{
                                    height:140, background:'linear-gradient(135deg,var(--blue5),var(--blue4))',
                                    position:'relative', overflow:'hidden',
                                  }}>
                                    {p.photos?.[0] ? (
                                      <img src={p.photos[0]} alt={p.title}
                                        style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                    ) : (
                                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:40 }}>
                                        {p.type === 'villa' ? '🏡' : p.type === 'apartment' ? '🏢' : '🏠'}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ padding:'12px 14px' }}>
                                    <div style={{ fontWeight:700, fontSize:13, color:'var(--dark)', marginBottom:4,
                                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                      {p.title}
                                    </div>
                                    <div style={{ fontWeight:800, color:'var(--blue)', fontSize:15, marginBottom:4 }}>
                                      {p.listing === 'rent'
                                        ? `₹${(p.price/1000).toFixed(0)}K/mo`
                                        : p.price >= 10000000 ? `₹${(p.price/10000000).toFixed(2)} Cr`
                                        : `₹${(p.price/100000).toFixed(1)} L`}
                                    </div>
                                    <div style={{ fontSize:11, color:'var(--slate2)', display:'flex', gap:8 }}>
                                      <span>🛏 {p.beds} BHK</span>
                                      <span>📐 {p.area} sqft</span>
                                      {p.price_per_sqft && <span>₹{p.price_per_sqft}/sqft</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════════════

function Footer({ nav }: any) {
  return (
    <footer style={{ background:'var(--dark)', color:'#94a3b8', padding:'48px 0 24px' }}>
      <div className="container">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:32, marginBottom:40 }}>
          {/* Brand */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <div style={{
                width:38, height:38, background:'linear-gradient(135deg,var(--blue),var(--blue2))',
                borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
              }}>🏡</div>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:17, color:'#fff' }}>
                  PropEstate<span style={{ color:'var(--blue3)' }}>360</span>
                </div>
                <div style={{ fontSize:10, color:'var(--slate3)', letterSpacing:.8 }}>PUNJAB REAL ESTATE</div>
              </div>
            </div>
            <p style={{ fontSize:13, lineHeight:1.8, color:'#64748b' }}>
              Punjab's most trusted platform for buying, selling and renting properties across all 23 districts.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 style={{ color:'#fff', fontWeight:700, marginBottom:16 }}>Quick Links</h4>
            {[
              { label:'Browse Properties', p:'properties' },
              { label:'Price Trends', p:'trends' },
              { label:'India States', p:'states' },
              { label:'AI Assistant', p:'ai' },
              { label:'List Property', p:'list' },
            ].map(l => (
              <div key={l.label} style={{ marginBottom:8, cursor:'pointer', fontSize:13 }}
                onClick={() => nav(l.p as any)}>
                {l.label}
              </div>
            ))}
          </div>

          {/* Districts */}
          <div>
            <h4 style={{ color:'#fff', fontWeight:700, marginBottom:16 }}>Top Districts</h4>
            {['Ludhiana','Amritsar','Jalandhar','Mohali (SAS Nagar)','Patiala','Bathinda'].map(d => (
              <div key={d} style={{ marginBottom:8, cursor:'pointer', fontSize:13 }}
                onClick={() => nav('properties', { district: d })}>
                {d}
              </div>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color:'#fff', fontWeight:700, marginBottom:16 }}>Contact Admin</h4>
            <div style={{ fontSize:13, display:'flex', flexDirection:'column', gap:10 }}>
              <div>👑 <strong style={{ color:'#fff' }}>Arpan</strong><br /><span style={{ fontSize:12 }}>Platform Administrator</span></div>
              <div>📧 arpan@propestate360.com</div>
              <div>📱 +91 99001 12233</div>
              <div>📍 Punjab, India</div>
              <div>🕐 Mon–Sat, 9AM–7PM</div>
            </div>
          </div>
        </div>

        <div style={{ borderTop:'1px solid #1e293b', paddingTop:20, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <span style={{ fontSize:13 }}>© 2026 PropEstate360. All rights reserved.</span>
          <span style={{ fontSize:13 }}>Built for Punjab · Real data · No paid APIs</span>
        </div>
      </div>
    </footer>
  );
}
