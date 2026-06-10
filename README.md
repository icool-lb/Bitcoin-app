# BTC / XAU / XAG Pro Liquidity Engine V10.7

No demo fallback.

V10.7:
- Live price refresh every 3 seconds using latest real MetaAPI candle including current forming candle.
- Full chart refresh every 30 seconds to avoid API pressure.
- Backtest can read uploaded CSV/JSON candle files.
- Backtest exports Excel-compatible .xls file with every trade and reason.
- Required candle columns: time, open, high, low, close, volume or tickVolume.

Required:
METAAPI_TOKEN
METAAPI_ACCOUNT_ID
METAAPI_REGION
