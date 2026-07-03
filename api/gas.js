/**
 * Vercel serverless proxy — server-side calls to GAS (no browser CORS).
 * Set GAS_URL in Vercel → Settings → Environment Variables.
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  const gasUrl = process.env.GAS_URL || process.env.VITE_API_URL;

  if (!gasUrl) {
    return res.status(500).json({
      success: false,
      error: 'GAS_URL is not configured. Add it in Vercel Environment Variables.',
    });
  }

  const { action, ...rest } = req.query;
  if (!action) {
    return res.status(400).json({ success: false, error: 'action query param is required' });
  }

  const url = new URL(gasUrl);
  url.searchParams.set('action', String(action));
  Object.entries(rest).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, String(value));
  });

  try {
    const options = { method: req.method, redirect: 'follow' };

    if (req.method === 'POST') {
      options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      options.body =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    }

    const response = await fetch(url.toString(), options);
    const text = await response.text();

    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(text);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Proxy request failed' });
  }
}
