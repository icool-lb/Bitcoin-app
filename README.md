# BTC / XAU / XAG Pro Liquidity Engine V10.4

No demo fallback.

V10.4 changes:
- Stronger Range / Consolidation / Sweep Trap logic.
- Adds Sweep Trap school with BUY / SELL / RANGE and score.
- Draws range high / range low context and sweep trap labels.
- MT5-style right price axis: current price tag is inside the right axis strip, not over the candles.
- Support and Resistance show price tags on the right axis strip.

Required Vercel variables:
METAAPI_TOKEN
METAAPI_ACCOUNT_ID
METAAPI_REGION

Optional:
ECONOMIC_CALENDAR_URL
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
