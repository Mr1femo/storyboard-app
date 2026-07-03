const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Google Apps Script requires POST via redirect workaround for CORS.
 * We use mode: 'no-cors' fallback with GET for reads, and form POST for writes.
 */
async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
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
  const url = new URL(API_URL);
  url.searchParams.set('action', action);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
