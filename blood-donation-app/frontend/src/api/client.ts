const BASE = '/api';

function getUserId(): string | null {
  return localStorage.getItem('bloodDonorUserId');
}

export async function api<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string | number | undefined> }
): Promise<T> {
  const { params, ...init } = options ?? {};
  const url = new URL(path, window.location.origin);
  const uid = getUserId();
  if (uid) url.searchParams.set('userId', uid);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(Array.isArray(err.errors) ? err.errors.join(', ') : err.error || res.statusText);
  }
  return res.json();
}

export const users = {
  create: (body: { username: string; bloodType: string; email?: string; location?: { type: 'Point'; coordinates: [number, number] } }) =>
    api<{ _id: string; username: string; bloodType: string; points: number }>(`${BASE}/users`, { method: 'POST', body: JSON.stringify(body) }),
  me: () => api<{ _id: string; username: string; bloodType: string; points: number; lastDonationDate: string | null; daysUntilCanDonate: number | null; optOut: boolean }>(`${BASE}/users/me`),
  updateBloodType: (bloodType: string) =>
    api<unknown>(`${BASE}/users/me/blood-type`, { method: 'PATCH', body: JSON.stringify({ bloodType }) }),
  updateUsername: (username: string) =>
    api<{ username: string }>(`${BASE}/users/me/username`, { method: 'PATCH', body: JSON.stringify({ username }) }),
  updateLocation: (location: { type: 'Point'; coordinates: [number, number] }) =>
    api<unknown>(`${BASE}/users/me/location`, { method: 'PATCH', body: JSON.stringify({ location }) }),
  optOut: () => api<unknown>(`${BASE}/users/me/opt-out`, { method: 'PATCH' }),
  optIn: () => api<unknown>(`${BASE}/users/me/opt-in`, { method: 'PATCH' }),
  stats: () => api<{ activeDonors: number }>(`${BASE}/users/stats`),
  leaderboard: (period?: string) =>
    api<{ leaderboard: { rank: number; username: string; donations: number; points: number }[]; period: string }>(
      `${BASE}/users/leaderboard`,
      { params: period ? { period } : {} }
    ),
};

export const hospitals = {
  list: (q?: string) =>
    api<{ hospitals: { _id: string; name: string; address: string }[] }>(`${BASE}/hospitals`, { params: { q: q ?? '' } }),
  get: (id: string) => api<{ _id: string; name: string; address: string }>(`${BASE}/hospitals/${id}`),
};

export const requests = {
  create: (body: { patientName?: string; patientAge?: number; hospitalId: string; bloodTypeNeeded: string; patientUsername?: string; unitsNeeded?: number; notes?: string; requiredBy?: string }) =>
    api<{ _id: string; patientName: string; patientAge?: number; hospitalId: { name: string; address: string }; bloodTypeNeeded: string; createdAt: string }>(`${BASE}/requests`, { method: 'POST', body: JSON.stringify(body) }),
  myPast: () =>
    api<{ requests: Array<{ _id: string; patientName: string; bloodTypeNeeded: string; hospitalName: string; status: string; createdAt: string; activeDonationStatus: string | null }> }>(`${BASE}/requests/my-past`),
  active: (lng: number, lat: number, opts?: { radiusKm?: number; bloodType?: string; sort?: string }) =>
    api<{ requests: Array<{
      _id: string; patientName: string; bloodTypeNeeded: string; hospitalId: { name: string; address: string }; distanceKm?: number; createdAt: string;
    }> }>(`${BASE}/requests/active`, { params: { lng, lat, ...opts } }),
  get: (id: string, lng?: number, lat?: number) =>
    api<{ _id: string; patientName: string; patientAge?: number; bloodTypeNeeded: string; hospitalId: { name: string; address: string }; distanceKm?: number; createdAt: string; notes?: string; activeDonationStatus: string | null }>(
      `${BASE}/requests/${id}`,
      { params: lng != null && lat != null ? { lng, lat } : {} }
    ),
};

export const dev = {
  reset: () => api<{ ok: boolean }>(`${BASE}/reset`, { method: 'POST' }),
};

export const donations = {
  pledge: (requestId: string) =>
    api<{ _id: string; requestId: string; donorId: string; status: string }>(`${BASE}/donations/pledge`, {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    }),
  updateStatus: (id: string, status: string) =>
    api<{ donation?: unknown; pointsEarned?: number; totalPoints?: number }>(`${BASE}/donations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  confirm: (id: string) =>
    api<{ pointsEarned: number; totalPoints: number }>(`${BASE}/donations/${id}/confirm`, { method: 'POST' }),
  byRequest: (requestId: string) =>
    api<{ _id: string; status: string } | null>(`${BASE}/donations/by-request/${requestId}`),
  myActive: () =>
    api<{ donations: Array<{ _id: string; status: string; requestId: string; patientName: string; bloodTypeNeeded: string; hospitalName: string; pledgedAt: string }> }>(`${BASE}/donations/my-active`),
  myPast: () =>
    api<{ donations: Array<{ _id: string; requestId: string; patientName: string; bloodTypeNeeded: string; hospitalName: string; donatedAt: string }> }>(`${BASE}/donations/my-past`),
};
