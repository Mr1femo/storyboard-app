/**
 * API routing:
 * - GET / small POST  → /api/gas proxy (production) or direct GAS (localhost)
 * - create with images → direct GAS (bypasses Vercel 4.5MB body limit)
 *
 * Set VITE_GAS_URL in Vercel env vars (same value as GAS_URL) for image uploads.
 */
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

async function apiGet(action, params = {}) {
  const url = resolveUrl(getProxyBase());
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
  const useDirectGas =
    GAS_DIRECT_URL && action === 'create' && hasImages(body);

  const base = useDirectGas ? GAS_DIRECT_URL : getProxyBase();
  const url = resolveUrl(base);
  url.searchParams.set('action', action);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  });

  if (response.status === 413) {
    throw new Error(
      'Upload too large. Try fewer frames, smaller images, or set VITE_GAS_URL in Vercel.'
    );
  }

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
