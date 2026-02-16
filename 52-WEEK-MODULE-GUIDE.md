# 📊 52-Week High & Low Module - Complete Implementation

## Overview

A comprehensive module that tracks 52-week high and low prices for **30 Indian stocks** with daily automatic updates from Yahoo Finance. Updated dynamically according to Indian share market hours.

---

## 🚀 Features Implemented

### 1. **Real-Time 52-Week Data Fetching**
- Fetches data from Yahoo Finance API (v8)
- Supports 30 major Indian stocks (RELIANCE, TCS, HDFC, INFY, etc.)
- Includes metrics:
  - 52-week high price and date
  - 52-week low price and date
  - Current price
  - Distance from high (as %)
  - Distance from low (as %)
  - Range (high - low) and volatility %
  - 50-day and 200-day moving averages

### 2. **Smart Data Caching**
- 1-hour in-memory cache to reduce API calls
- Manual refresh capability
- Automatic daily refresh via cron job

### 3. **Daily Automatic Updates**
- Runs at **4:00 PM IST** (market close time)
- Configured via Vercel Cron Jobs
- Updates all 30 stocks data

### 4. **Multiple Views**
- **All Stocks**: Complete list of 30 stocks
- **Near 52W High**: Stocks within 10% of 52-week high
- **Near 52W Low**: Stocks within 10% of 52-week low
- **Most Volatile**: Stocks with largest 52-week range

### 5. **Analytics Dashboard**
- Count of stocks near 52-week highs
- Count of stocks near 52-week lows
- Average distance from 52-week high
- Most volatile stocks ranking

---

## 📁 File Structure

```
lib/
├── 52-week-data.ts                    # Data processing & calculations
└── yahoo-finance.ts                   # (Updated with fetch function)

components/
└── 52-week-view.tsx                   # React component for display

app/
├── 52-week-highs-lows/
│   └── page.tsx                       # Main page route
└── api/
    ├── stock/
    │   └── 52-week-data/
    │       └── route.ts               # Main API endpoint
    └── cron/
        └── 52-week-refresh/
            └── route.ts               # Daily cron job

vercel.json                            # (Updated with cron config)
```

---

## 🔌 API Endpoints

### Get 52-Week Data
```bash
GET /api/stock/52-week-data?type=all
GET /api/stock/52-week-data?type=near-high
GET /api/stock/52-week-data?type=near-low
GET /api/stock/52-week-data?type=volatile
```

**Response Example**:
```json
{
  "timestamp": 1704067200000,
  "stocks": [
    {
      "symbol": "RELIANCE.NS",
      "name": "Reliance Industries",
      "currentPrice": 2850.50,
      "fiftyTwoWeekHigh": 3200.00,
      "fiftyTwoWeekLow": 2450.00,
      "distanceFromHigh": 10.92,
      "distanceFromLow": 16.35,
      "rangePercent": 30.61,
      "range": 750.00
    }
  ],
  "topNearHigh": [...],
  "topNearLow": [...],
  "mostVolatile": [...],
  "averageHighPercent": 15.42
}
```

### Refresh Cache
```bash
POST /api/stock/52-week-data?action=refresh
```

### Cron Job Status
```bash
GET /api/cron/52-week-refresh?action=status
```

---

## 🎯 Usage Examples

### 1. Display All 30 Stocks
```tsx
import { FiftyTwoWeekView } from "@/components/52-week-view"

export default function Dashboard() {
  return (
    <FiftyTwoWeekView
      type="all"
      limit={30}
      autoRefresh={true}
      refreshInterval={3600000} // 1 hour
    />
  )
}
```

### 2. Show Only Stocks Near 52-Week High
```tsx
<FiftyTwoWeekView
  type="near-high"
  title="Strong Performers"
  description="Stocks hitting new highs"
  limit={10}
/>
```

### 3. Show Only Stocks Near 52-Week Low
```tsx
<FiftyTwoWeekView
  type="near-low"
  title="Potential Opportunities"
  description="Stocks trading at lows"
  limit={15}
/>
```

### 4. Show Most Volatile Stocks
```tsx
<FiftyTwoWeekView
  type="volatile"
  title="High Volatility Stocks"
  description="Largest 52-week price swings"
  limit={10}
/>
```

### 5. Fetch Data Programmatically
```tsx
import { fetchFiftyTwoWeekData } from "@/lib/yahoo-finance"

const data = await fetchFiftyTwoWeekData("near-high")
console.log(data.topNearHigh) // Top 10 stocks near 52W high
```

---

## 📊 30 Indian Stocks Tracked

1. **RELIANCE.NS** - Reliance Industries
2. **TCS.NS** - Tata Consultancy Services
3. **HDFCBANK.NS** - HDFC Bank
4. **INFY.NS** - Infosys
5. **ICICIBANK.NS** - ICICI Bank
6. **SBIN.NS** - State Bank of India
7. **HINDUNILVR.NS** - Hindustan Unilever
8. **WIPRO.NS** - Wipro
9. **BAJAJFINSV.NS** - Bajaj Finserv
10. **MARUTI.NS** - Maruti Suzuki
11. **LT.NS** - Larsen & Toubro
12. **AXISBANK.NS** - Axis Bank
13. **KOTAKBANK.NS** - Kotak Mahindra Bank
14. **ASIANPAINT.NS** - Asian Paints
15. **SUNPHARMA.NS** - Sun Pharmaceutical
16. **NESTLEIND.NS** - Nestle India
17. **POWERGRID.NS** - Power Grid
18. **JSWSTEEL.NS** - JSW Steel
19. **BHARTIARTL.NS** - Bharti Airtel
20. **ULTRACEMCO.NS** - UltraCem
21. **ADANIPORTS.NS** - Adani Ports
22. **NTPC.NS** - NTPC
23. **ONGC.NS** - ONGC
24. **TATASTEEL.NS** - Tata Steel
25. **BPCL.NS** - BPCL
26. **TITAN.NS** - Titan Company
27. **INDIGO.NS** - IndiGo
28. **GRASIM.NS** - Grasim Industries
29. **TECHM.NS** - Tech Mahindra
30. **BAJAJFINSV.NS** - Bajaj Finserv

---

## ⚙️ Configuration

### Environment Variables (in .env.local)
```
CRON_SECRET=your-secure-cron-secret-key-here
NEXT_PUBLIC_APP_ORIGIN=https://hritik-stockmarket.vercel.app
```

### Vercel Cron Job (vercel.json)
```json
{
  "crons": [
    {
      "path": "/api/cron/52-week-refresh",
      "schedule": "0 10 * * *"
    }
  ]
}
```

**Schedule Explanation**:
- `0 10 * * *` = 10:30 AM UTC = 4:00 PM IST
- Runs every day at Indian market close time
- Automatically refreshes 52-week data cache

---

## 📈 Key Calculations

### Distance from 52-Week High (%)
```typescript
Distance = ((High - Current) / High) × 100

Example:
High: ₹3200, Current: ₹2850
Distance = ((3200 - 2850) / 3200) × 100 = 10.94%
```

### Distance from 52-Week Low (%)
```typescript
Distance = ((Current - Low) / Low) × 100

Example:
Low: ₹2450, Current: ₹2850
Distance = ((2850 - 2450) / 2450) × 100 = 16.33%
```

### 52-Week Range (%)
```typescript
Range% = ((High - Low) / Low) × 100

Example:
High: ₹3200, Low: ₹2450
Range% = ((3200 - 2450) / 2450) × 100 = 30.61%
```

---

## 🔄 Daily Update Flow

```
4:00 PM IST (Market Close)
        ↓
Cron Job Triggered: /api/cron/52-week-refresh
        ↓
Call: POST /api/stock/52-week-data?action=refresh
        ↓
Fetch 30 stocks from Yahoo Finance API (parallel requests)
        ↓
Process & Calculate Metrics
        ↓
Cache Results (1-hour validity)
        ↓
Update Dashboard & Pages
        ↓
Ready for next 24 hours
```

---

## 🎨 Component Props

```tsx
interface FiftyTwoWeekViewProps {
  type?: "all" | "near-high" | "near-low" | "volatile"
  title?: string                    // Custom title
  description?: string              // Custom description
  limit?: number                    // Number of stocks to show (default: 30)
  autoRefresh?: boolean             // Enable auto-refresh (default: true)
  refreshInterval?: number          // Refresh interval in ms (default: 3600000)
}
```

---

## 📱 Responsive Design

- **Mobile**: Optimized for small screens
- **Tablet**: Adjusted layout
- **Desktop**: Full feature display
- Shows/hides columns based on screen size
- Touch-friendly buttons and spacing

---

## 🎯 Page Route

- **URL**: `/52-week-highs-lows`
- **Title**: 52-Week Analysis
- **Auto-refresh**: Every 1 hour (3600000 ms)
- **Indian Market Timing**: Updates at market close

---

## 🔍 Performance Optimizations

1. **API Caching**: 1-hour in-memory cache
2. **Parallel Fetching**: All 30 stocks fetched simultaneously
3. **Timeout Protection**: 5-second timeout per stock
4. **Error Handling**: Graceful fallback for failed requests
5. **Next.js Revalidation**: HTTP cache headers (1 hour)

---

## ⚠️ Error Handling

- Failed stock fetches don't block others
- Partial data returned if some stocks fail
- User-friendly error messages
- Manual refresh button for users
- Retry functionality in UI

---

## 🚀 Deployment Checklist

- [x] Create data processing library (`lib/52-week-data.ts`)
- [x] Create API endpoint (`/api/stock/52-week-data`)
- [x] Create React component (`components/52-week-view.tsx`)
- [x] Create page route (`/52-week-highs-lows`)
- [x] Create cron job (`/api/cron/52-week-refresh`)
- [x] Update Vercel config (`vercel.json`)
- [x] Add environment variables
- [x] Test API endpoints
- [ ] Deploy to Vercel
- [ ] Verify cron job execution
- [ ] Monitor data freshness

---

## 📚 Integration Guide

### Add to Navigation Menu
```tsx
import Link from "next/link"

<Link href="/52-week-highs-lows" className="nav-link">
  52-Week Analysis
</Link>
```

### Add to Dashboard
```tsx
import { FiftyTwoWeekView } from "@/components/52-week-view"

<FiftyTwoWeekView type="near-high" limit={10} />
```

### Add to Stock Detail Page
```tsx
import { FiftyTwoWeekView } from "@/components/52-week-view"

// Show related 52W data
<FiftyTwoWeekView type="all" limit={5} />
```

---

## 📞 Support & Troubleshooting

### Issue: Data not updating
**Solution**: 
1. Check cron job logs in Vercel dashboard
2. Manually refresh via `/api/stock/52-week-data?action=refresh`
3. Verify `CRON_SECRET` in environment variables

### Issue: API returning empty results
**Solution**:
1. Check Yahoo Finance API status
2. Verify symbols are valid (must include `.NS` for NSE stocks)
3. Check for rate limiting

### Issue: Cron job not running
**Solution**:
1. Verify `vercel.json` has correct syntax
2. Ensure `CRON_SECRET` is set
3. Check Vercel dashboard for cron logs

---

## 🎓 Future Enhancements

1. **Historical Tracking**: Store 52-week data history
2. **Alerts**: Notify when stocks hit new highs/lows
3. **Comparisons**: Compare multiple stocks' performance
4. **Export**: CSV/PDF export functionality
5. **Watchlist**: Save favorite stocks
6. **Charts**: Visual representation of 52-week range
7. **Sector Analysis**: Group stocks by sector
8. **Technical Indicators**: Add RSI, MACD, Bollinger Bands

---

## ✅ Status

**READY FOR PRODUCTION** ✅

- All components created
- API endpoints functional
- Cron job configured
- Error handling implemented
- Responsive design complete
- Documentation complete

Deploy to Vercel and monitor the first cron execution!

---

**Last Updated**: January 29, 2026  
**Version**: 1.0  
**Status**: Production Ready
