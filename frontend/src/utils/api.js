const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return response;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.errors?.[0]?.msg || 'Request failed');
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getProfile: () => request('/users/profile'),

  getTodayStatus: () => request('/attendance/today'),

  checkIn: (data) =>
    request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  checkOut: (data) =>
    request('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance/history${query ? `?${query}` : ''}`);
  },

  getAdminDashboard: () => request('/attendance/admin/dashboard'),

  getAdminRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance/admin/records${query ? `?${query}` : ''}`);
  },

  getAllUsers: () => request('/users'),

  createUser: (data) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (id, data) =>
    request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  disableUser: (id) =>
    request(`/users/${id}/disable`, {
      method: 'PATCH',
    }),

  exportAttendance: async (params = {}) => {
    const token = getToken();
    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE}/attendance/admin/export${query ? `?${query}` : ''}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },
};

export function getGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(new Error(`Location access denied: ${error.message}`));
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString();
}
