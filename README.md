# BTC / XAU / XAG Pro Liquidity Engine V10.6

No demo fallback.

V10.6:
- Backtest now first tries historical MetaAPI range.
- If the historical range returns 0 candles, it can use the real loaded chart candles as fallback.
- Backtest result shows the source used and debug batches.
- Useful when broker/MetaAPI historical startTime endpoint behaves differently but the live chart is already loaded.

Required:
METAAPI_TOKEN
METAAPI_ACCOUNT_ID
METAAPI_REGION
