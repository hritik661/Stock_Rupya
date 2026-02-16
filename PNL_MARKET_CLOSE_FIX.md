# ✅ P&L MARKET CLOSE FIX - COMPLETE SOLUTION

## Problem Statement

**Issue**: When market closes (after 3:30 PM), P&L was showing 0 instead of persisting based on last trading price.

**Example**:
- Buy TCS at ₹100 during market hours
- Price goes to ₹110 → P&L shows ₹+10 ✅
- Market closes → P&L shows ₹0 ❌ (WRONG)
- Next day at market open, price is ₹120 → Should show ₹+20

## Root Cause

The code was explicitly setting `currentPrice = pos.price` (entry price) when market was closed, making P&L = 0.

**Before (Lines 243-253 in portfolio/page.tsx)**:
```tsx
// WRONG: When market closed, uses entry price
let effectivePrice = holding.avgPrice
if (marketStatus.isOpen && currentMarketPrice && !isNaN(currentMarketPrice) && currentMarketPrice > 0) {
  effectivePrice = currentMarketPrice
}
// Market closed → effectivePrice = avgPrice → P&L = 0
```

## Solution Implemented

### 1. **Persistent Last Trading Price Storage** ✅

When market is OPEN, store the current price as "last trading price" in localStorage:

```tsx
// File: app/portfolio/page.tsx (Lines 243-270)
if (marketStatus.isOpen && currentMarketPrice && !isNaN(currentMarketPrice) && currentMarketPrice > 0) {
  effectivePrice = currentMarketPrice
  storeLastTradingPrice(user.email, holding.symbol, currentMarketPrice)
} else if (!marketStatus.isOpen && typeof lastPrices[holding.symbol] === 'number' && lastPrices[holding.symbol] > 0) {
  // Market is closed: use last trading price for PERSISTENT P&L
  effectivePrice = lastPrices[holding.symbol]
}
```

### 2. **Options P&L Persistence** ✅

Same logic applied to options positions (app/portfolio/page.tsx lines 845-860):

```tsx
if (marketStatus.isOpen && typeof lastPrices[strikeKey] === 'number') {
  // Market open: use live price
  currentPrice = lastPrices[strikeKey]
} else if (!marketStatus.isOpen && typeof lastPrices[strikeKey] === 'number') {
  // Market closed: use LAST TRADING PRICE for persistent P&L
  currentPrice = lastPrices[strikeKey]
}
```

### 3. **Store Prices on Every Trade** ✅

Added `storeLastTradingPrice()` calls when executing trades (components/trade-panel.tsx):

```tsx
// After successful BUY (line ~170)
storeLastTradingPrice(user.email, stock.symbol, stock.regularMarketPrice)

// After successful SELL (line ~260)
storeLastTradingPrice(user.email, stock.symbol, stock.regularMarketPrice)
```

### 4. **Fixed Options Page Display** ✅

Updated app/options/page.tsx (lines 559-585) to use last trading price when market closed:

```tsx
if (marketStatus.isOpen) {
  // Market OPEN: Use live API prices
  currentPrice = strikeData.cePrice or strikeData.pePrice
} else {
  // Market CLOSED: Use LAST TRADING PRICE
  const lastTradingPrice = getLastTradingPrice(user.email, strikeKey)
  if (lastTradingPrice && !isNaN(lastTradingPrice) && lastTradingPrice > 0) {
    currentPrice = lastTradingPrice
  }
}
```

## Complete Behavior After Fix

### Stock Trading Example:

```
Day 1 - Market Open:
  10:00 AM  - Buy TCS at ₹100
  Entry Price: ₹100
  Current Price: ₹100 (stored as last trading price)
  P&L: ₹0

  12:00 PM  - Price rises to ₹110  
  Entry Price: ₹100
  Current Price: ₹110 (live from API, updated in storage)
  P&L: ₹+10 ✅

  3:30 PM   - Market closes at ₹115
  Entry Price: ₹100
  Current Price: ₹115 (stored as LAST TRADING PRICE)
  P&L: ₹+15 ✅

  6:00 PM   - After market close
  Entry Price: ₹100
  Current Price: ₹115 (using LAST TRADING PRICE)
  P&L: ₹+15 ✅ (PERSISTS!)

Day 2 - Market Opens:
  9:15 AM   - Market opens at ₹120
  Entry Price: ₹100
  Current Price: ₹120 (updated from API)
  P&L: ₹+20 ✅
```

### Options Trading Example:

```
NIFTY 25,400 CE

Buy:
  Entry: ₹70
  Current (Market Open): ₹80 (live)
  P&L: +₹500 (for 1 lot × 50) ✅

Market Closes at ₹78:
  Entry: ₹70
  Current: ₹78 (LAST TRADING PRICE stored)
  P&L: +₹400 ✅ (PERSISTS after close)

Next Day Open at ₹85:
  Entry: ₹70
  Current: ₹85 (updated from API)
  P&L: +₹750 ✅
```

## Changes Made

| File | Change | Impact |
|------|--------|--------|
| `app/portfolio/page.tsx` | Use last trading price when market closed for stocks | ✅ Stocks show persistent P&L |
| `app/portfolio/page.tsx` | Use last trading price when market closed for options | ✅ Options show persistent P&L |
| `app/options/page.tsx` | Use last trading price from getLastTradingPrice() | ✅ Options table shows correct P&L |
| `components/trade-panel.tsx` | Store price after every BUY | ✅ Prices saved for later use |
| `components/trade-panel.tsx` | Store price after every SELL | ✅ Prices saved for later use |
| `components/trade-panel.tsx` | Added import of `storeLastTradingPrice` | ✅ Can store prices |

## Balance Calculation (Already Working Correctly)

✅ **No changes needed** - Balance calculation was already correct:

- **BUY**: `balance -= current_price × quantity × lot_size`
- **SELL**: `balance += current_price × quantity × lot_size`
- **P&L**: Separate calculation for DISPLAY ONLY, doesn't affect balance

Example:
```
Start: Balance = ₹1,00,000

BUY: 100 shares @ ₹100
  → Deduct: ₹10,000
  → New Balance: ₹90,000 ✅
  → Portfolio Value: ₹10,000

Price rises to ₹110:
  → Portfolio Value: ₹11,000
  → P&L: ₹+1,000 (display only)
  → Balance: Still ₹90,000 ✅

SELL: 100 shares @ ₹110
  → Add: ₹11,000
  → New Balance: ₹1,01,000 ✅
  → Portfolio Value: ₹0
```

## Testing Scenarios

### ✅ Scenario 1: Buy during market hours, check P&L after close
1. Buy stock at 2:00 PM
2. Check portfolio at 2:30 PM (should show correct P&L)
3. Wait for market to close at 3:30 PM
4. Check portfolio at 5:00 PM (should still show same P&L)
5. Refresh page - should persist

### ✅ Scenario 2: Multi-day P&L tracking
1. Buy on Day 1 (market close: ₹110)
2. Check P&L on Day 1 after close (shows vs ₹110)
3. Check P&L on Day 2 when market opens (updates to live price)

### ✅ Scenario 3: Options P&L persistence
1. Buy NIFTY Call at 70
2. Check P&L during market hours (shows real value)
3. Wait for market close
4. Check P&L after close (shows closing price basis)
5. Should match what you see in Options table

### ✅ Scenario 4: Balance calculations
1. Start with ₹1,00,000
2. Buy TCS 100 shares @ ₹500 = ₹50,000 deducted
3. Balance should be ₹50,000
4. Sell 100 shares @ ₹510 = ₹51,000 added
5. Balance should be ₹1,01,000

## What Persists Across Market Close

✅ **Persists**:
- P&L values (based on last trading price)
- Portfolio value
- Holdings quantity and entry price
- Balance

❌ **Does NOT persist** (by design):
- Live prices (they refresh when market opens)
- Real-time price updates (stop when market closes)

## Technical Notes

- Last trading prices stored in `localStorage` under key: `last_prices_{userEmail}`
- Uses `storeLastTradingPrice()` from `lib/pnl-calculator.ts`
- Uses `getLastTradingPrice()` to retrieve stored prices
- Market status checked via `isMarketOpen()` from `lib/market-utils.ts`
- All calculations use proper lot sizes for options (typically 50)

## Files Modified

1. ✅ `app/portfolio/page.tsx` - Stock & Options P&L persistence
2. ✅ `app/options/page.tsx` - Options display P&L persistence
3. ✅ `components/trade-panel.tsx` - Store prices on every trade

---

**Status**: ✅ COMPLETE - All P&L persistence issues fixed!
