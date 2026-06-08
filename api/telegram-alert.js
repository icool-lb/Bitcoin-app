// /api/telegram-alert.js
// Optional external alerts. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error:'POST only' });
    const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return res.status(501).json({ ok:false, error:'Telegram env variables are not configured' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const text = String(body.text || '').slice(0, 3500);
    if (!text) return res.status(400).json({ ok:false, error:'Missing text' });
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id: chatId, text })
    });
    const j = await r.json();
    return res.status(r.ok ? 200 : 500).json(j);
  } catch (err) {
    return res.status(500).json({ ok:false, error:err.message || 'Server error' });
  }
};