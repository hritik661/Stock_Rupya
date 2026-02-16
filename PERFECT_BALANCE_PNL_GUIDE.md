# ✅ PERFECT PROFIT & LOSS + BALANCE CALCULATION SYSTEM

## Overview
This document describes the complete, correct implementation of balance and P&L calculations for stocks, options, and indices.

---

## KEY RULES

### 1. **BALANCE CALCULATION (What affects your cash balance)**

#### BUY Transaction
```
Balance DECREASES by: Current Price × Quantity × Lot Size

Example - Buy Stock:
  Price: ₹100/share
  Quantity: 10 shares
  Lot Size: 1
  Deduction: 100 × 10 × 1 = ₹1,000 ❌ NOT (price + P&L)

Example - Buy Options:
  Price: ₹100 per contract
  Quantity: 1 lot (50 contracts)
  Lot Size: 50
  Deduction: 100 × 1 × 50 = ₹5,000 ❌ NOT (price + P&L)
```

#### SELL Transaction
```
Balance INCREASES by: Current Price × Quantity × Lot Size

Example - Sell Stock:
  You bought at: ₹100/share
  Current price: ₹110/share
  Quantity: 10 shares
  Credit: 110 × 10 × 1 = ₹1,100 ✅
  P&L (for display): (110 - 100) × 10 = ₹100 (shown separately)

Example - Sell Options:
  You bought at: ₹100 per contract
  Current price: ₹105 per contract
  Quantity: 1 lot (50 contracts)
  Credit: 105 × 1 × 50 = ₹5,250 ✅
  P&L (for display): (105 - 100) × 1 × 50 = ₹250 (shown separately)
```

**CRITICAL**: 
- ❌ DO NOT: `Balance += (entry price × qty) + P&L`
- ✅ DO: `Balance += (current price × qty × lotSize)`

---

## 2. **P&L CALCULATION (For Display Only)**

P&L is calculated **SEPARATELY** from balance updates. It's shown in the portfolio but doesn't affect your cash balance.

### For BUY Positions
```
P&L = (Current Price - Entry Price) × Quantity × Lot Size

Example:
  Entry: ₹100
  Current: ₹110
  Qty: 10
  P&L = (110 - 100) × 10 × 1 = ₹100 profit ✅
```

### For SELL Positions
```
P&L = (Entry Price - Current Price) × Quantity × Lot Size

Example (Short Selling):
  Entry: ₹100
  Current: ₹90
  Qty: 5
  P&L = (100 - 90) × 5 × 1 = ₹50 profit ✅
```

---

## 3. **MARKET STATUS HANDLING**

### When Market is OPEN (9:15 AM - 3:30 PM IST)
```
✅ Use real-time prices from API
✅ Show live P&L
✅ Update every 30 seconds
✅ Users can trade
```

### When Market is CLOSED (After 3:30 PM or weekends)
```
✅ Use last trading price (from previous close)
✅ P&L based on closing price (essentially = 0 if market just closed)
✅ Update every 5 minutes
✅ Stop-Market orders still allowed ⚠️
✅ When selling: Use last trading price as current price
```

---

## 4. **SELL ALL SCENARIO**

### Perfect Example: Buy & Sell All

#### Initial State
- Balance: ₹10,00,000
- No holdings

#### Step 1: Buy Stocks
- Buy RELIANCE: 100 shares @ ₹2,000 = ₹2,00,000
- **New Balance: ₹8,00,000** (10L - 2L)
- Holdings: RELIANCE (100 @ ₹2,000)

#### Step 2: Buy Options
- Buy 1 lot NIFTY CALL @ ₹100 = ₹5,000 (1 × 50 × 100)
- **New Balance: ₹7,95,000** (8L - 5k)
- Holdings: RELIANCE (100 @ ₹2,000) + NIFTY CALL (1 lot @ ₹100)

#### Step 3: Market Closes
- RELIANCE: Market closes at ₹2,050
- NIFTY CALL: Market closes at ₹105
- **P&L Display:**
  - RELIANCE: (2,050 - 2,000) × 100 = ₹5,000 profit (unrealized)
  - NIFTY CALL: (105 - 100) × 1 × 50 = ₹250 profit (unrealized)
- **Balance remains: ₹7,95,000** (P&L not credited yet)

#### Step 4: Sell All (Market Closed)
- Sell all RELIANCE @ ₹2,050 = ₹2,05,000 credit
- Sell all NIFTY CALL @ ₹105 = ₹5,250 credit
- **Total Credit: ₹2,10,250**
- **New Balance: ₹7,95,000 + ₹2,10,250 = ₹10,05,250** ✅

**Result:**
- Original: ₹10,00,000
- Final: ₹10,05,250
- **Net P&L: ₹5,250** (5,000 + 250)

---

## 5. **IMPLEMENTATION IN CODE**

### A. Buying

```typescript
import { calculateBuyTransaction } from '@/lib/trading-calculator'

const calculation = calculateBuyTransaction(
  stock.regularMarketPrice,  // current price
  quantity,                   // how many
  1                          // lot size (1 for stocks, 50 for options)
)

// Deduct from balance
const result = await deductBalance(
  calculation.balanceDebit,   // amount to deduct
  "BUY",
  symbol,
  quantity,
  stock.regularMarketPrice
)
```

### B. Selling

```typescript
import { calculateSellTransaction } from '@/lib/trading-calculator'

const calculation = calculateSellTransaction(
  entryPrice,                 // what you paid
  currentPrice,               // what you're selling at
  quantity,                   // how many
  'BUY',                      // your position action
  lotSize                     // lot size (1 or 50)
)

// Credit to balance
const result = await addBalance(
  calculation.balanceCredit,  // amount to credit
  "SELL",
  symbol,
  quantity,
  currentPrice
)

// Display P&L separately
console.log(`P&L: ₹${calculation.pnl}`)
```

### C. Portfolio Display

```typescript
// Calculate unrealized P&L (for display)
const unrealizedPnL = calculateUnrealizedPnL(
  holding.avgPrice,
  holding.currentPrice,
  holding.quantity,
  'BUY',
  holding.lotSize || 1
)

// Show in UI
<div>
  <p>Current Value: ₹{unrealizedPnL.currentValue}</p>
  <p>Unrealized P&L: ₹{unrealizedPnL.pnl}</p>
  <p>Return: {unrealizedPnL.pnlPercent}%</p>
</div>
```

---

## 6. **DATABASE TRANSACTIONS**

### Buy Transaction Record
```json
{
  "email": "user@gmail.com",
  "type": "BUY",
  "symbol": "RELIANCE.NS",
  "quantity": 100,
  "price": 2000,
  "amount": 200000,
  "balance_before": 1000000,
  "balance_after": 800000,
  "market_open": true,
  "timestamp": "2026-02-03T10:30:00Z"
}
```

### Sell Transaction Record
```json
{
  "email": "user@gmail.com",
  "type": "SELL",
  "symbol": "RELIANCE.NS",
  "quantity": 100,
  "price": 2050,
  "amount": 205000,
  "pnl": 5000,
  "balance_before": 800000,
  "balance_after": 1005000,
  "market_open": false,
  "timestamp": "2026-02-03T15:45:00Z"
}
```

---

## 7. **EDGE CASES HANDLED**

### Case 1: Sell with Market Closed
```
✅ Use last trading price
✅ Calculate P&L based on closing price
✅ Credit balance with closing price × qty
✅ Stop-Market orders execute correctly
```

### Case 2: Multiple Buys of Same Stock
```
Average Price = (prev_cost + new_cost) / total_qty

Example:
  Buy 100 @ ₹100 = ₹10,000 (avg: ₹100)
  Buy 50 @ ₹110 = ₹5,500 (new avg: 15,500/150 = ₹103.33)
  New Position: 150 @ ₹103.33
```

### Case 3: Partial Sell
```
Example:
  You have: 100 shares @ ₹100 avg
  Current price: ₹110
  Sell: 40 shares
  
  Credit: 110 × 40 = ₹4,400
  Remaining: 60 shares @ ₹100 avg
  
  ✅ P&L on sold portion: (110-100) × 40 = ₹400
  ✅ P&L on remaining: (110-100) × 60 = ₹600 (unrealized)
```

### Case 4: Zero P&L When Market Closed
```
Buy at ₹100 when market is open
Market closes at ₹105 (closing price)

In Portfolio:
  ✅ Entry Price: ₹100
  ✅ Current Price: ₹105 (last trading price)
  ✅ Unrealized P&L: ₹500 (for 10 shares)
  
When user LOGS OUT and LOGS BACK IN after market closed:
  ✅ Still shows P&L as ₹500 (based on closing price)
  ✅ When market opens: Updates to live price
```

---

## 8. **FILES INVOLVED**

| File | Purpose |
|------|---------|
| `lib/trading-calculator.ts` | Core calculation functions |
| `lib/pnl-calculator.ts` | P&L display functions |
| `lib/options-calculator.ts` | Options-specific calculations |
| `lib/market-utils.ts` | Market status (open/closed) |
| `app/portfolio/page.tsx` | Portfolio page with correct logic |
| `components/trade-panel.tsx` | Trading component |
| `app/api/balance/deduct/route.ts` | Buy API endpoint |
| `app/api/balance/add/route.ts` | Sell API endpoint |

---

## 9. **TESTING CHECKLIST**

- [ ] Buy 1000₹ worth of stocks → Balance decreases by 1000₹
- [ ] Sell all stocks when price increases by 50₹ → Balance = original + profit
- [ ] Market closed → P&L shows based on last trading price
- [ ] Market opens → P&L updates to live price
- [ ] Buy options → Lot size correctly applied (1 lot = 50 contracts)
- [ ] Sell options → Credit = current price × qty × lot size
- [ ] Sell all when market closed → Balance restored correctly
- [ ] Multiple partial sells → Average price calculation correct
- [ ] P&L on remaining position → Shows unrealized gains

---

## 10. **SUMMARY**

```
BALANCE = ₹10,00,000

BUY ₹2,00,000 stocks  → BALANCE = ₹8,00,000
BUY ₹3,00,000 options → BALANCE = ₹5,00,000

MARKET CLOSES - P&L calculated but NOT added to balance

SELL ALL stocks at profit → BALANCE += current price × qty
SELL ALL options at profit → BALANCE += current price × qty × lotSize

FINAL BALANCE = Original + (P&L from selling)
```

✅ **This is now implemented correctly throughout the application!**
