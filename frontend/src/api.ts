// ─── API Utility ─────────────────────────────────────────────────────────────
const BASE = '/api';

function getToken() { return localStorage.getItem('pe360_token') || ''; }

async function req(method: string, url: string, body?: any, isFormData = false) {
  const headers: Record<string, string> = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + url, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), data);
  return data;
}

export const api = {
  // Auth
  sendOTP:       (email: string, name?: string)            => req('POST','/auth/send-otp', { email, name }),
  verifyOTP:     (email: string, otp: string)              => req('POST','/auth/verify-otp', { email, otp }),
  register:      (d: any)                                  => req('POST','/auth/register', d),
  login:         (email: string, password: string)         => req('POST','/auth/login', { email, password }),
  me:            ()                                        => req('GET', '/auth/me'),
  updateProfile: (d: any)                                  => req('PUT', '/auth/profile', d),
  changePassword:(cur: string, nw: string)                 => req('PUT', '/auth/change-password', { currentPassword: cur, newPassword: nw }),

  // Properties
  getProperties:    (params?: Record<string, string>)      => req('GET', '/properties?' + new URLSearchParams(params || {}).toString()),
  getProperty:      (id: string)                           => req('GET', `/properties/${id}`),
  addProperty:      (fd: FormData)                         => req('POST','/properties', fd, true),
  updateProperty:   (id: string, fd: FormData)             => req('PUT', `/properties/${id}`, fd, true),
  deleteProperty:   (id: string)                           => req('DELETE',`/properties/${id}`),
  setStatus:        (id: string, status: string)           => req('PATCH',`/properties/${id}/status`, { status }),
  getTrends:        (params?: Record<string, string>)      => req('GET', '/properties/trends?' + new URLSearchParams(params || {}).toString()),
  getStatesSummary: ()                                     => req('GET', '/properties/states-summary'),
  getStateBreakdown:(state: string)                        => req('GET', '/properties/state-breakdown?' + new URLSearchParams({ state }).toString()),
  toggleWishlist:   (id: string)                           => req('POST', `/properties/${id}/wishlist`),
  getWishlist:      ()                                     => req('GET', '/properties/user/wishlist'),
  getWishlistIds:   ()                                     => req('GET', '/properties/user/wishlist-ids'),
  getTrending:      (params?: Record<string, string>)      => req('GET', '/properties/trending?' + new URLSearchParams(params || {}).toString()),

  // Enquiries
  sendEnquiry:   (property_id: string, message: string, user_phone?: string) =>
    req('POST','/enquiries', { property_id, message, user_phone }),
  getMyEnquiries:()                                        => req('GET', '/enquiries'),

  // Admin
  adminStats:      ()                                      => req('GET', '/admin/stats'),
  adminUsers:      ()                                      => req('GET', '/admin/users'),
  adminAgents:     ()                                      => req('GET', '/admin/agents/pending'),
  adminProps:      ()                                      => req('GET', '/admin/properties'),
  adminEnquiries:  ()                                      => req('GET', '/admin/enquiries'),
  adminAnalytics:  ()                                      => req('GET', '/admin/analytics'),
  adminSalesPerf:  ()                                      => req('GET', '/admin/sales-perf'),
  approveAgent:    (id: string)                            => req('PUT', `/admin/agents/${id}/approve`),
  rejectAgent:     (id: string)                            => req('PUT', `/admin/agents/${id}/reject`),
  restrictUser:    (id: string, restricted: boolean)       => req('PUT', `/admin/users/${id}/restrict`, { restricted }),
  changeRole:      (id: string, role: string)              => req('PUT', `/admin/users/${id}/role`, { role }),
  deleteUser:      (id: string)                            => req('DELETE', `/admin/users/${id}`),
  updateEnquiry:   (id: string, status: string)            => req('PUT', `/admin/enquiries/${id}`, { status }),

  // AI
  aiChat:          (message: string, history?: any[])      => req('POST','/ai/chat', { message, history }),
};

export function saveUser(token: string, user: any) {
  localStorage.setItem('pe360_token', token);
  localStorage.setItem('pe360_user', JSON.stringify(user));
}

export function loadUser() {
  const u = localStorage.getItem('pe360_user');
  return u ? JSON.parse(u) : null;
}

export function clearUser() {
  localStorage.removeItem('pe360_token');
  localStorage.removeItem('pe360_user');
}

export function fmtPrice(price: number, listing: string) {
  if (listing === 'rent') {
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L/mo`;
    if (price >= 1000)   return `₹${(price / 1000).toFixed(0)}K/mo`;
    return `₹${price.toLocaleString('en-IN')}/mo`;
  }
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000)   return `₹${(price / 100000).toFixed(1)} L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

export function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

// EMI Calculator (no external API needed)
export function calcEMI(principal: number, annualRate: number, tenureYears: number) {
  if (!principal || !annualRate || !tenureYears) return { emi: 0, totalAmount: 0, totalInterest: 0 };
  const r = annualRate / 12 / 100;
  const n = tenureYears * 12;
  if (r === 0) return { emi: principal / n, totalAmount: principal, totalInterest: 0 };
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalAmount = emi * n;
  const totalInterest = totalAmount - principal;
  return {
    emi: Math.round(emi),
    totalAmount: Math.round(totalAmount),
    totalInterest: Math.round(totalInterest),
  };
}
