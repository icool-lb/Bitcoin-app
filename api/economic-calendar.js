// /api/economic-calendar.js
// No demo data. Configure one of these:
// ECONOMIC_CALENDAR_URL = provider URL returning JSON. You may use placeholders {from}, {to}, {lookaheadHours}
// The endpoint normalizes common fields when possible.
module.exports = async function handler(req, res) {
  try {
    const urlTemplate = process.env.ECONOMIC_CALENDAR_URL;
    if (!urlTemplate) {
      return res.status(501).json({ ok:false, configured:false, error:'ECONOMIC_CALENDAR_URL is not configured. No demo data is returned.' });
    }
    const lookaheadHours = Math.max(1, Math.min(parseInt(req.query.lookaheadHours || '24',10), 168));
    const from = new Date();
    const to = new Date(Date.now() + lookaheadHours*3600*1000);
    const url = urlTemplate
      .replaceAll('{from}', encodeURIComponent(from.toISOString()))
      .replaceAll('{to}', encodeURIComponent(to.toISOString()))
      .replaceAll('{lookaheadHours}', String(lookaheadHours));
    const upstream = await fetch(url, { headers: { Accept:'application/json' } });
    const text = await upstream.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    if (!upstream.ok) return res.status(upstream.status).json({ ok:false, error:'Economic calendar request failed', detail: typeof data==='string'?data.slice(0,500):data });
    const arr = Array.isArray(data) ? data : (data.events || data.data || data.calendar || []);
    const events = arr.map((e, i) => ({
      id: e.id || e.eventId || `${e.title||e.event||'event'}-${e.time||e.date||i}`,
      time: e.time || e.date || e.datetime || e.releaseTime,
      country: e.country || e.currency || e.ccy || '',
      title: e.title || e.event || e.name || 'Economic Event',
      impact: e.impact || e.importance || e.priority || '',
      actual: e.actual ?? e.actualValue ?? null,
      forecast: e.forecast ?? e.consensus ?? null,
      previous: e.previous ?? null,
      effect: e.effect || e.analysis || ''
    })).filter(e => e.time);
    res.setHeader('Cache-Control','no-store, max-age=0');
    return res.status(200).json({ ok:true, source:'configured-url', events });
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message || 'Server error' });
  }
};