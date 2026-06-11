# BTC / XAU / XAG Pro Liquidity Engine V10.8

No demo fallback.

V10.8:
- Adds /api/metaapi-price live quote endpoint.
- Uses MetaAPI current-price endpoint for real bid/ask.
- Frontend updates live price every 2 seconds.
- Candles/chart update every 30 seconds.
- The quote endpoint uses keepSubscription=true for faster subsequent updates.
- If quote fails, the system keeps last real value and shows QUOTE CHECK; no demo price is used.

Required Vercel variables:
METAAPI_TOKEN
METAAPI_ACCOUNT_ID
METAAPI_REGION

Optional:
METAAPI_CLIENT_HOST
ECONOMIC_CALENDAR_URL
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
