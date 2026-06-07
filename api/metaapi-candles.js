// /api/metaapi-candles.js
// Vercel Serverless Function for MetaAPI / MT5 candles
// Do NOT put MetaAPI token inside index.html

const ALLOWED_TIMEFRAMES = new Set([
  '1m', '2m', '3m', '4m', '5m', '6m',
  '10m', '12m', '15m', '20m', '30m',
  '1h', '2h', '3h', '4h', '6h', '8h', '12h',
  '1d', '1w', '1mn'
]);

module.exports = async function handler(req, res) {
  // CORS + preflight support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, auth-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: 'Method not allowed. Use GET only.'
    });
  }

  try {
    const token = process.env.METAAPI_TOKEN;
    const accountId = process.env.METAAPI_ACCOUNT_ID;

    if (!token || !accountId) {
      return res.status(500).json({
        error: 'Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID in Vercel Environment Variables'
      });
    }

    const symbol = String(req.query.symbol || 'BTCUSD').trim();
    const timeframe = String(req.query.timeframe || '15m').trim();
    const limitRaw = parseInt(req.query.limit || '500', 10);
    const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 500, 1000));

    if (!symbol || symbol.length > 50) {
      return res.status(400).json({
        error: 'Invalid symbol'
      });
    }

    if (!ALLOWED_TIMEFRAMES.has(timeframe)) {
      return res.status(400).json({
        error: 'Invalid timeframe',
        allowed: Array.from(ALLOWED_TIMEFRAMES)
      });
    }

    const region = process.env.METAAPI_REGION || 'new-york';

    const host =
      process.env.METAAPI_MARKET_DATA_HOST ||
      `https://mt-market-data-client-api-v1.${region}.agiliumtrade.ai`;

    const endpoint =
      `${host}/users/current/accounts/${encodeURIComponent(accountId)}` +
      `/historical-market-data/symbols/${encodeURIComponent(symbol)}` +
      `/timeframes/${encodeURIComponent(timeframe)}/candles?limit=${limit}`;

    const upstream = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'auth-token': token
      }
    });

    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: 'MetaAPI request failed',
        status: upstream.status,
        symbol,
        timeframe,
        detail: typeof data === 'string' ? data.slice(0, 700) : data
      });
    }

    res.setHeader('Cache-Control', 's-maxage=8, stale-while-revalidate=12');

    return res.status(200).json({
      ok: true,
      source: 'metaapi',
      symbol,
      timeframe,
      limit,
      candles: data
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Server error',
      message: err && err.message ? err.message : String(err)
    });
  }
};
