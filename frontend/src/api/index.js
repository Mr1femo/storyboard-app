/**
 * API routing:
 * - localhost  → direct Google Apps Script (text/plain POST avoids preflight)
 * - production → same-origin /api/gas proxy (no CORS)
 */
function getApiBase() {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (!isLocal) return '/api/gas';
  return import.meta.env.VITE_API_URL || '';
}

async function apiGet(action, params = {}) {
  const base = getApiBase();
  const url = base.startsWith('http')
    ? new URL(base)
    : new URL(base, window.location.origin);

  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  const json = await response.json();

  if (!json.success) {
    throw new Error(json.error || 'API request failed');
  }
  return json.data;
}

async function apiPost(action, body) {
  const base = getApiBase();
  const url = base.startsWith('http')
    ? new URL(base)
    : new URL(base, window.location.origin);

  url.searchParams.set('action', action);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Invalid response from server');
  }

  if (!json.success) {
    throw new Error(json.error || 'API request failed');
  }
  return json.data;
}

export const api = {
  getCalendar: () => apiGet('calendar'),
  getStoryboard: (contentId) => apiGet('storyboard', { contentId }),
  createContent: (payload) => apiPost('create', payload),
  updateStatus: (contentId, status, clientFeedback = '') =>
    apiPost('updateStatus', { contentId, status, clientFeedback }),
  healthCheck: () => apiGet('health'),
};
