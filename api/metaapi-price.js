// /api/metaapi-price.js — V10.8 live quote proxy
// Reads current bid/ask from MetaAPI current-price endpoint.
// Required Vercel env: METAAPI_TOKEN, METAAPI_ACCOUNT_ID
// Optional: METAAPI_REGION=london, METAAPI_CLIENT_HOST
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function cleanDetail(data) {
  if (typeof data === 'string') {
    return data
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 700);
  }
  return data;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'GET only' });

    const token = process.env.METAAPI_TOKEN;
    const accountId = process.env.METAAPI_ACCOUNT_ID;
    if (!token || !accountId) {
      return res.status(500).json({ ok:false, error:'Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID in Vercel Environment Variables' });
    }

    const symbol = String(req.query.symbol || 'XAUUSD').trim();
    if (!symbol || symbol.length > 40) return res.status(400).json({ ok:false, error:'Invalid symbol' });

    const region = process.env.METAAPI_REGION || 'new-york';
    const host = process.env.METAAPI_CLIENT_HOST || `https://mt-client-api-v1.${region}.agiliumtrade.ai`;
    const keepSubscription = String(req.query.keepSubscription ?? 'true') !== 'false';

    const url = `${host}/users/current/accounts/${encodeURIComponent(accountId)}/symbols/${encodeURIComponent(symbol)}/current-price?keepSubscription=${keepSubscription ? 'true' : 'false'}`;

    const retryable = new Set([408, 425, 429, 500, 502, 503, 504]);
    let lastStatus = 0, lastDetail = '', attempts = 0;
    const maxAttempts = Math.max(1, Math.min(parseInt(req.query.retryAttempts || '3', 10), 5));

    for (let i = 0; i < maxAttempts; i++) {
      attempts = i + 1;
      let upstream;
      try {
        upstream = await fetchWithTimeout(url, {
          headers: { Accept: 'application/json', 'auth-token': token }
        }, 9000);
      } catch (err) {
        lastStatus = 504;
        lastDetail = err.name === 'AbortError' ? 'MetaAPI current-price timeout' : (err.message || 'MetaAPI network error');
        if (i < maxAttempts - 1) await sleep(450 * Math.pow(1.7, i));
        continue;
      }

      lastStatus = upstream.status;
      const text = await upstream.text();
      let data; try { data = JSON.parse(text); } catch { data = text; }

      if (upstream.ok) {
        const bid = Number(data.bid);
        const ask = Number(data.ask);
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).json({
          ok: true,
          source: 'metaapi-current-price',
          attempts,
          symbol: data.symbol || symbol,
          bid,
          ask,
          mid: Number.isFinite(bid) && Number.isFinite(ask) ? (bid + ask) / 2 : null,
          spread: Number.isFinite(bid) && Number.isFinite(ask) ? ask - bid : null,
          time: data.time || null,
          brokerTime: data.brokerTime || null,
          raw: data
        });
      }

      lastDetail = cleanDetail(data);
      if (!retryable.has(upstream.status) || i === maxAttempts - 1) break;
      await sleep(450 * Math.pow(1.7, i));
    }

    const temporary = [429, 500, 502, 503, 504].includes(lastStatus);
    return res.status(lastStatus || 500).json({
      ok: false,
      error: temporary ? 'MetaAPI current price temporarily unavailable' : 'MetaAPI current price failed',
      status: lastStatus || 500,
      attempts,
      retry: temporary,
      detail: temporary
        ? `Current price upstream returned ${lastStatus} after ${attempts} attempt(s).`
        : lastDetail
    });
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message || 'Server error' });
  }
};