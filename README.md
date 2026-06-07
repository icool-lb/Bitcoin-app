# BTC Liquidity Pro — MetaAPI / MT5

نظام تحليل Bitcoin يعتمد على MetaAPI / MT5 عبر Vercel API Proxy.

## Structure

```text
btc-liquidity-pro/
├─ index.html
└─ api/
   └─ metaapi-candles.js
```

## Vercel Environment Variables

ضع هذه القيم في Vercel > Project > Settings > Environment Variables:

```env
METAAPI_TOKEN=YOUR_METAAPI_TOKEN
METAAPI_ACCOUNT_ID=YOUR_METAAPI_ACCOUNT_ID
METAAPI_REGION=new-york
```

## Test API

بعد النشر جرّب:

```text
https://YOUR-PROJECT.vercel.app/api/metaapi-candles?symbol=BTCUSD&timeframe=15m&limit=100
```

إذا لم تظهر الشموع، جرّب اسم الرمز كما يظهر حرفيًا في MT5 مثل BTCUSDm أو BTCUSD.r.
