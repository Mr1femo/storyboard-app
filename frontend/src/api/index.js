import { token as authToken } from './authToken';

const GAS_DIRECT_URL = import.meta.env.VITE_GAS_URL || import.meta.env.VITE_API_URL || '';

function getProxyBase() {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (!isLocal) return '/api/gas';
  return GAS_DIRECT_URL;
}

function hasImages(body) {
  return body?.frames?.some((f) => f.imageBase64);
}

function resolveUrl(base) {
  return base.startsWith('http') ? new URL(base) : new URL(base, window.location.origin);
}

function withAuth(params = {}) {
  const t = authToken.value;
  return t ? { ...params, token: t } : params;
}

async function apiGet(action, params = {}) {
  const url = resolveUrl(getProxyBase());
  url.searchParams.set('action', action);
  Object.entries(withAuth(params)).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  const json = await response.json();
  if (!json.success) throw new Error(json.error || 'API request failed');
  return json.data;
}

async function apiPost(action, body = {}) {
  const needsDirect =
    GAS_DIRECT_URL &&
    (action === 'create' || action === 'updateContent') &&
    hasImages(body);

  const base = needsDirect ? GAS_DIRECT_URL : getProxyBase();
  const url = resolveUrl(base);
  url.searchParams.set('action', action);

  const sessionToken = authToken.value || body.token || '';
  if (sessionToken) url.searchParams.set('token', sessionToken);

  const payload = { ...body, token: sessionToken };

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (response.status === 413) {
    throw new Error('Upload too large. Try fewer or smaller images.');
  }

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Invalid response from server');
  }
  if (!json.success) throw new Error(json.error || 'API request failed');
  return json.data;
}

export const api = {
  login: (username, password) => apiPost('login', { username, password }),

  // Content & Storyboard
  getCalendar: (clientId) => apiGet('calendar', clientId ? { clientId } : {}),
  getStoryboard: (contentId) => apiGet('storyboard', { contentId }),
  createContent: (payload) => apiPost('create', payload),
  updateContent: (payload) => apiPost('updateContent', payload),
  deleteContent: (contentId) => apiPost('deleteContent', { contentId }),
  updateStatus: (contentId, status, clientFeedback = '') =>
    apiPost('updateStatus', { contentId, status, clientFeedback }),
  updateFeedback: (payload) => apiPost('updateFeedback', payload),

  // Clients
  getClients: () => apiGet('clients'),
  createClient: (payload) => apiPost('createClient', payload),
  updateClient: (payload) => apiPost('updateClient', payload),
  deleteClient: (clientId) => apiPost('deleteClient', { clientId }),

  // Reports
  getReports: (clientId) => apiGet('reports', clientId ? { clientId } : {}),
  createReport: (payload) => apiPost('createReport', payload),
  updateReport: (payload) => apiPost('updateReport', payload),
  deleteReport: (reportId) => apiPost('deleteReport', { reportId }),

  changePassword: (currentPassword, newPassword) =>
    apiPost('changePassword', { currentPassword, newPassword }),
  forgotPassword: (username) => apiPost('forgotPassword', { username }),
  adminResetPassword: (clientId, newPassword) =>
    apiPost('adminResetPassword', { clientId, newPassword }),

  healthCheck: () => apiGet('health'),
};
