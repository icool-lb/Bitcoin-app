// /api/metaapi-candles.js — V10.2 MetaAPI retry-safe proxy
const ALLOWED_TIMEFRAMES = new Set(['1m','2m','3m','4m','5m','6m','10m','12m','15m','20m','30m','1h','2h','3h','4h','6h','8h','12h','1d','1w','1mn']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
function cleanDetail(data) {
  if (typeof data === 'string') return data.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,700);
  return data;
}
module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'GET only' });
    const token = process.env.METAAPI_TOKEN;
    const accountId = process.env.METAAPI_ACCOUNT_ID;
    if (!token || !accountId) return res.status(500).json({ ok:false, error:'Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID in Vercel Environment Variables' });
    const symbol = String(req.query.symbol || 'BTCUSD').trim();
    const timeframe = String(req.query.timeframe || '15m').trim();
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '700', 10), 1000));
    if (!symbol || symbol.length > 40) return res.status(400).json({ ok:false, error:'Invalid symbol' });
    if (!ALLOWED_TIMEFRAMES.has(timeframe)) return res.status(400).json({ ok:false, error:'Invalid timeframe' });
    const region = process.env.METAAPI_REGION || 'new-york';
    const host = process.env.METAAPI_MARKET_DATA_HOST || `https://mt-market-data-client-api-v1.${region}.agiliumtrade.ai`;
    const params = new URLSearchParams({ limit: String(limit) });
    if (req.query.startTime) params.set('startTime', String(req.query.startTime));
    const endpoint = `${host}/users/current/accounts/${encodeURIComponent(accountId)}/historical-market-data/symbols/${encodeURIComponent(symbol)}/timeframes/${encodeURIComponent(timeframe)}/candles?${params.toString()}`;
    let lastStatus = 0, lastDetail = '', attempts = 0;
    const maxAttempts = Math.max(1, Math.min(parseInt(req.query.retryAttempts || '4', 10), 6));
    const retryable = new Set([408,425,429,500,502,503,504]);
    for (let i=0;i<maxAttempts;i++) {
      attempts=i+1;
      let upstream;
      try { upstream = await fetchWithTimeout(endpoint, { headers:{ Accept:'application/json', 'auth-token':token } }, 12000); }
      catch (err) { lastStatus=504; lastDetail=err.name==='AbortError'?'MetaAPI request timeout':(err.message||'MetaAPI network error'); if(i<maxAttempts-1) await sleep(650*Math.pow(1.65,i)); continue; }
      lastStatus = upstream.status;
      const text = await upstream.text();
      let data; try { data = JSON.parse(text); } catch { data = text; }
      if (upstream.ok) {
        res.setHeader('Cache-Control','no-store, max-age=0');
        return res.status(200).json({ ok:true, source:'metaapi', symbol, timeframe, limit, attempts, candles:data });
      }
      lastDetail = cleanDetail(data);
      if (!retryable.has(upstream.status) || i===maxAttempts-1) break;
      await sleep(650*Math.pow(1.65,i));
    }
    const temporary = [429,500,502,503,504].includes(lastStatus);
    return res.status(lastStatus || 500).json({ ok:false, error: temporary?'MetaAPI temporarily unavailable':'MetaAPI request failed', status:lastStatus||500, attempts, retry:temporary, detail: temporary?`Upstream MetaAPI returned ${lastStatus} after ${attempts} attempt(s). Trading must stay locked. Try again shortly.`:lastDetail });
  } catch (err) { return res.status(500).json({ ok:false, error:err.message || 'Server error' }); }
};
