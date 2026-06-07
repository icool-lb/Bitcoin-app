# BTC Pro Liquidity Engine — MetaAPI / MT5

واجهة Bitcoin احترافية تعمل عبر MetaAPI/MT5 وتعرض:

- شارت شموع مع دعم ومقاومة، FVG، سيولة، VWAP، EMA20/50/200.
- هدف حركة سعري Projected Target.
- خطوط Entry / SL / TP1 / TP2 على الشارت.
- زر حفظ الشارت كصورة PNG عالية الجودة.
- تنبيهات داخل المتصفح + صوت عربي واضح عبر Web Speech API.
- Service Worker لإظهار إشعارات النظام عندما تكون الصفحة مفتوحة بالخلفية.
- ملف Cron اختياري على Vercel لإرسال Telegram alerts حتى لو كانت الواجهة مغلقة.

## ملفات المشروع

```txt
index.html
manifest.webmanifest
sw.js
vercel.json
api/
  metaapi-candles.js
  alert-watch.js
```

## Vercel Environment Variables الأساسية

```env
METAAPI_TOKEN=your_metaapi_token
METAAPI_ACCOUNT_ID=your_metaapi_account_id
METAAPI_REGION=new-york
```

## تنبيهات Telegram الاختيارية عبر Vercel Cron

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
ALERT_SYMBOL=BTCUSD
ALERT_TIMEFRAME=15m
ALERT_CONFIDENCE=72
```

الـ Cron يعمل كل 5 دقائق عبر `vercel.json` ويستدعي:

```txt
/api/alert-watch
```

> ملاحظة: الصوت العربي داخل المتصفح يحتاج الصفحة أو PWA مفتوحة بالخلفية. إذا كانت الصفحة مغلقة تمامًا، استخدم Telegram alerts عبر Cron.
