const API_BASE = 'https://attendance-tracker-4dou.onrender.com/api';

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

  if (response.status === 204) return null;

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

async function upload(endpoint, file) {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form,
  });
  const data = await response.json();
  if (!response.ok && response.status !== 207) throw new Error(data.message || 'Upload failed');
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

  resetPassword: (id, password) => request(`/users/${id}/reset-password`, {
    method: 'PUT', body: JSON.stringify({ password }),
  }),

  bulkCreateUsers: (file) => upload('/users/bulk', file),

  getAdminSetup: () => request('/admin/setup'),
  createDepartment: (data) => request('/admin/departments', { method: 'POST', body: JSON.stringify(data) }),
  createBranch: (data) => request('/admin/branches', { method: 'POST', body: JSON.stringify(data) }),
  createShift: (data) => request('/admin/shifts', { method: 'POST', body: JSON.stringify(data) }),
  getHolidays: () => request('/admin/holidays'),
  createHoliday: (data) => request('/admin/holidays', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (id) => request(`/admin/holidays/${id}`, { method: 'DELETE' }),
  updateRules: (data) => request('/admin/rules', { method: 'PUT', body: JSON.stringify(data) }),

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
