// /api/alert-watch.js
// Optional Vercel Cron watcher: checks BTC from MetaAPI and sends Telegram alerts even when the webpage is closed.
// Env vars required: METAAPI_TOKEN, METAAPI_ACCOUNT_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// Optional: METAAPI_REGION, ALERT_SYMBOL, ALERT_TIMEFRAME, ALERT_CONFIDENCE, ALERT_CRON_SECRET

const TF_DEFAULT = '15m';
const LIMIT = 260;

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function fmt(n, d = 0) { return Number.isFinite(n) ? Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }) : '---'; }
function ema(values, p) { let k = 2 / (p + 1), out = [], prev = values[0]; for (let i = 0; i < values.length; i++) { prev = i === 0 ? values[i] : values[i] * k + prev * (1 - k); out.push(prev); } return out; }
function calcATR(cs, p = 14) { const tr = []; for (let i = 0; i < cs.length; i++) { if (i === 0) tr.push(cs[i].h - cs[i].l); else tr.push(Math.max(cs[i].h - cs[i].l, Math.abs(cs[i].h - cs[i - 1].c), Math.abs(cs[i].l - cs[i - 1].c))); } return ema(tr, p); }
function calcRSI(cs, p = 14) { const out = new Array(cs.length).fill(50); let g = 0, l = 0; for (let i = 1; i < cs.length; i++) { const d = cs[i].c - cs[i - 1].c; if (i <= p) { if (d >= 0) g += d; else l -= d; if (i === p) { g /= p; l /= p; out[i] = 100 - 100 / (1 + g / (l || 1e-9)); } } else { g = (g * (p - 1) + Math.max(d, 0)) / p; l = (l * (p - 1) + Math.max(-d, 0)) / p; out[i] = 100 - 100 / (1 + g / (l || 1e-9)); } } return out; }
function calcVWAP(cs) { let cumPV = 0, cumV = 0, out = []; for (const x of cs) { const tp = (x.h + x.l + x.c) / 3; cumPV += tp * x.v; cumV += x.v; out.push(cumPV / (cumV || 1)); } return out; }
function pivots(cs, left = 3, right = 3) { const hi = [], lo = []; for (let i = left; i < cs.length - right; i++) { let isH = true, isL = true; for (let j = i - left; j <= i + right; j++) { if (j === i) continue; if (cs[j].h >= cs[i].h) isH = false; if (cs[j].l <= cs[i].l) isL = false; } if (isH) hi.push({ i, price: cs[i].h }); if (isL) lo.push({ i, price: cs[i].l }); } return { hi, lo }; }
function cluster(points, tol, max = 5) { const clusters = []; points.slice(-120).forEach(p => { let c = clusters.find(x => Math.abs(x.price - p.price) <= tol); if (!c) clusters.push({ price: p.price, points: [p], last: p.i }); else { c.points.push(p); c.price = avg(c.points.map(q => q.price)); c.last = Math.max(c.last, p.i); } }); clusters.forEach(c => c.strength = c.points.length + c.last / 1000); return clusters.sort((a, b) => b.strength - a.strength).slice(0, max); }
function detectFVG(cs, atrLast) { const res = []; for (let i = 2; i < cs.length; i++) { const a = cs[i - 2], c = cs[i]; if (c.l > a.h) { const from = a.h, to = c.l; if (to - from > atrLast * .15) res.push({ type: 'BULL', from, to, mid: (from + to) / 2, mitigated: cs.slice(i + 1).some(x => x.l <= from) }); } if (c.h < a.l) { const from = c.h, to = a.l; if (to - from > atrLast * .15) res.push({ type: 'BEAR', from, to, mid: (from + to) / 2, mitigated: cs.slice(i + 1).some(x => x.h >= to) }); } } return res.filter(x => !x.mitigated).slice(-10); }
function analyze(cs) {
  const closes = cs.map(x => x.c), vols = cs.map(x => x.v);
  const e20 = ema(closes, 20), e50 = ema(closes, 50), e200 = ema(closes, 200), atr = calcATR(cs), rsi = calcRSI(cs), vwap = calcVWAP(cs);
  const last = cs[cs.length - 1], atrLast = atr[atr.length - 1];
  const pv = pivots(cs); const tol = Math.max(atrLast * .26, last.c * .0009);
  const res = cluster(pv.hi, tol).filter(x => x.price > last.c - atrLast * 1.5).sort((a, b) => a.price - b.price);
  const sup = cluster(pv.lo, tol).filter(x => x.price < last.c + atrLast * 1.5).sort((a, b) => b.price - a.price);
  const fvg = detectFVG(cs, atrLast);
  const recent = cs.slice(-30); const buyVol = recent.filter(x => x.c >= x.o).reduce((s, x) => s + x.v, 0); const sellVol = recent.filter(x => x.c < x.o).reduce((s, x) => s + x.v, 0);
  const buyers = buyVol / (buyVol + sellVol || 1) * 100;
  let score = 50; if (last.c > e20.at(-1)) score += 8; else score -= 8; if (last.c > e50.at(-1)) score += 12; else score -= 12; if (last.c > e200.at(-1)) score += 10; else score -= 10; if (e20.at(-1) > e50.at(-1)) score += 8; else score -= 8; if (last.c > vwap.at(-1)) score += 8; else score -= 8; if (rsi.at(-1) > 56) score += 8; if (rsi.at(-1) < 44) score -= 8; if (buyers > 56) score += 8; if (buyers < 44) score -= 8; if (fvg.some(x => x.type === 'BULL' && x.to < last.c)) score += 4; if (fvg.some(x => x.type === 'BEAR' && x.from > last.c)) score -= 4;
  score = clamp(Math.round(score), 0, 100);
  const direction = score >= 67 ? 'BUY' : score <= 33 ? 'SELL' : 'WAIT';
  const target = direction === 'SELL' ? (sup[0]?.price || last.c - atrLast * 1.8) : (res[0]?.price || last.c + atrLast * 1.8);
  return { last, score, direction, atrLast, rsi: rsi.at(-1), buyers, target, support: sup[0]?.price, resistance: res[0]?.price, volState: avg(vols.slice(-10)) > avg(vols.slice(-80, -10)) * 1.35 ? 'HIGH' : 'NORMAL' };
}
async function fetchMetaCandles(symbol, timeframe) {
  const token = process.env.METAAPI_TOKEN;
  const accountId = process.env.METAAPI_ACCOUNT_ID;
  if (!token || !accountId) throw new Error('Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID');
  const region = process.env.METAAPI_REGION || 'new-york';
  const host = process.env.METAAPI_MARKET_DATA_HOST || `https://mt-market-data-client-api-v1.${region}.agiliumtrade.ai`;
  const url = `${host}/users/current/accounts/${encodeURIComponent(accountId)}/historical-market-data/symbols/${encodeURIComponent(symbol)}/timeframes/${encodeURIComponent(timeframe)}/candles?limit=${LIMIT}`;
  const r = await fetch(url, { headers: { Accept: 'application/json', 'auth-token': token } });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data).slice(0, 500));
  return data.map(k => ({ t: new Date(k.time || k.brokerTime).getTime(), o: +k.open, h: +k.high, l: +k.low, c: +k.close, v: +(k.tickVolume ?? k.volume ?? 0) })).filter(x => Number.isFinite(x.c));
}
async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { skipped: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' };
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(JSON.stringify(data).slice(0, 500));
  return data;
}
module.exports = async function handler(req, res) {
  try {
    if (process.env.ALERT_CRON_SECRET) {
      const auth = req.headers.authorization || '';
      if (auth !== `Bearer ${process.env.ALERT_CRON_SECRET}` && req.query.secret !== process.env.ALERT_CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' });
    }
    const symbol = process.env.ALERT_SYMBOL || req.query.symbol || 'BTCUSD';
    const timeframe = process.env.ALERT_TIMEFRAME || req.query.timeframe || TF_DEFAULT;
    const threshold = Number(process.env.ALERT_CONFIDENCE || req.query.threshold || 72);
    const candles = await fetchMetaCandles(symbol, timeframe);
    const a = analyze(candles);
    const shouldSend = (a.direction === 'BUY' && a.score >= threshold) || (a.direction === 'SELL' && (100 - a.score) >= threshold) || a.volState === 'HIGH';
    const text = `⚡ *BTC Pro Alert*\nSymbol: ${symbol} ${timeframe}\nDecision: *${a.direction}*\nPrice: ${fmt(a.last.c, 2)}\nScore: ${a.score}/100\nRSI: ${fmt(a.rsi, 1)}\nBuyers: ${fmt(a.buyers, 0)}%\nTarget: ${fmt(a.target, 0)}\nSupport: ${fmt(a.support, 0)}\nResistance: ${fmt(a.resistance, 0)}\nVolume: ${a.volState}`;
    let telegram = null;
    if (shouldSend) telegram = await sendTelegram(text);
    return res.status(200).json({ ok: true, sent: !!telegram, analysis: a, telegram });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
};
