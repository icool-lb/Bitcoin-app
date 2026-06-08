# BTC / XAU / XAG Pro Liquidity Engine V10

No demo fallback. If MetaAPI or news is not configured, the system shows NO DATA / NEWS OFF.

## Files
- `index.html`
- `api/metaapi-candles.js`
- `api/economic-calendar.js`
- `api/telegram-alert.js`

## Required Vercel Environment Variables
```
METAAPI_TOKEN=...
METAAPI_ACCOUNT_ID=...
METAAPI_REGION=new-york
```

## Optional
```
ECONOMIC_CALENDAR_URL=https://your-provider/calendar?from={from}&to={to}
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

## Notes
- Browser audio alerts work while the page/PWA is open.
- Reliable alerts while the page is closed require Telegram or a true push backend/external cron.
- Self-learning journal is stored locally in the browser and can be exported as JSON.
- Backtest fetches real MetaAPI candles only; no synthetic candles are generated.
