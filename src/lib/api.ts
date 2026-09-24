/**
 * REST API Client for Laravel / Server v1 endpoints
 */

const TOKEN_KEY = 'theatre_sanctum_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `خطای سرور (${response.status})`);
  }

  return data;
}

export const api = {
  // Auth
  sendOtp: (mobile: string) =>
    apiFetch<{ success: boolean; message: string; debug_code?: string; expires_in_seconds?: number }>('/api/v1/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    }),

  verifyOtp: (mobile: string, code: string, name?: string) =>
    apiFetch<{ success: boolean; message: string; token: string; user: any }>('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile, code, name }),
    }),

  loginPassword: (mobile: string, password: string) =>
    apiFetch<{ success: boolean; message: string; token: string; user: any }>('/api/v1/auth/login-password', {
      method: 'POST',
      body: JSON.stringify({ mobile, password }),
    }),

  getMe: () => apiFetch<{ success: boolean; authenticated: boolean; user: any }>('/api/v1/auth/me'),

  logout: () => apiFetch<{ success: boolean; message: string }>('/api/v1/auth/logout', { method: 'POST' }),

  // Public Shows
  getShows: (params?: { category?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    return apiFetch<{ success: boolean; data: any[] }>(`/api/v1/shows?${q.toString()}`);
  },

  getShowDetail: (slug: string) => apiFetch<{ success: boolean; data: any }>(`/api/v1/shows/${slug}`),

  getSessionSeatMap: (sessionId: string) =>
    apiFetch<{ success: boolean; data: any }>(`/api/v1/sessions/${sessionId}/seatmap`),

  // Booking & Holds
  holdSeats: (sessionId: string, seatIds: string[], mobile?: string) =>
    apiFetch<{ success: boolean; message: string; expires_at: number; hold_seconds: number }>('/api/v1/bookings/hold-seats', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, seat_ids: seatIds, mobile }),
    }),

  releaseSeats: (sessionId: string, seatIds?: string[]) =>
    apiFetch<{ success: boolean; message: string }>('/api/v1/bookings/release-seats', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, seat_ids: seatIds }),
    }),

  checkout: (payload: {
    session_id: string;
    seat_ids?: string[];
    quantity?: number;
    buyer_name?: string;
    buyer_mobile?: string;
  }) =>
    apiFetch<{
      success: boolean;
      message: string;
      order_uuid: string;
      order_id: string;
      amount: number;
      authority: string;
      payment_url: string;
    }>('/api/v1/bookings/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getOrderDetail: (orderId: string) => apiFetch<{ success: boolean; data: any }>(`/api/v1/orders/${orderId}`),

  // Buyer
  getBuyerOrders: () => apiFetch<{ success: boolean; data: any[] }>('/api/v1/buyer/orders'),
  getBuyerTickets: () => apiFetch<{ success: boolean; data: any[] }>('/api/v1/buyer/tickets'),

  // Seller
  getSellerShows: () => apiFetch<{ success: boolean; data: any[] }>('/api/v1/seller/shows'),
  getSellerStats: (showId?: string) =>
    apiFetch<{ success: boolean; data: any }>(`/api/v1/seller/stats${showId ? `?show_id=${showId}` : ''}`),

  createOfflineOrder: (payload: {
    session_id: string;
    seat_ids?: string[];
    quantity?: number;
    payment_method: 'pos' | 'cash';
    buyer_name?: string;
    buyer_mobile?: string;
  }) =>
    apiFetch<{ success: boolean; message: string; order: any; tickets: any[] }>('/api/v1/seller/offline-order', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  checkInTicket: (ticketCode: string, showId?: string) =>
    apiFetch<{
      success: boolean;
      status_code: string;
      message: string;
      ticket_info?: any;
    }>('/api/v1/seller/check-in', {
      method: 'POST',
      body: JSON.stringify({ ticket_code: ticketCode, show_id: showId }),
    }),

  getSellerCheckInLogs: (showId?: string) =>
    apiFetch<{ success: boolean; data: any[] }>(`/api/v1/seller/check-in-logs${showId ? `?show_id=${showId}` : ''}`),

  // Admin
  getAdminOverview: () => apiFetch<{ success: boolean; data: any }>('/api/v1/admin/overview'),
  getAdminShows: () => apiFetch<{ success: boolean; data: any[] }>('/api/v1/admin/shows'),
  createShow: (data: any) =>
    apiFetch<{ success: boolean; message: string; data: any }>('/api/v1/admin/shows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateShow: (id: string, data: any) =>
    apiFetch<{ success: boolean; message: string; data: any }>(`/api/v1/admin/shows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  assignSeller: (showId: string, mobile: string, name?: string) =>
    apiFetch<{ success: boolean; message: string; seller: any }>(`/api/v1/admin/shows/${showId}/sellers`, {
      method: 'POST',
      body: JSON.stringify({ mobile, name }),
    }),
  removeSeller: (showId: string, sellerId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/v1/admin/shows/${showId}/sellers/${sellerId}`, {
      method: 'DELETE',
    }),
  getAdminVenues: () => apiFetch<{ success: boolean; data: any[] }>('/api/v1/admin/venues'),
  createVenue: (data: any) =>
    apiFetch<{ success: boolean; message: string; data: any }>('/api/v1/admin/venues', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAdminUsers: () => apiFetch<{ success: boolean; data: any[] }>('/api/v1/admin/users'),
  getAdminOrders: () => apiFetch<{ success: boolean; data: any[] }>('/api/v1/admin/orders'),
  refundOrder: (orderId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/v1/admin/orders/${orderId}/refund`, {
      method: 'POST',
    }),
  seedSampleShow: () =>
    apiFetch<{ success: boolean; message: string; show?: any }>('/api/v1/admin/seed-sample-show', {
      method: 'POST',
    }),
};
