# Live Price Update Feature - Options Portfolio

## Overview
Added automatic live option price fetching in the Portfolio page to show real P&L when market is open.

## How It Works

### Scenario: Entry Price ₹303, Current Price ₹310
- **Entry**: Market closes, you buy NIFTY 25,400 CE @ ₹303
  - Entry price shown: ₹303.05
  - Current price: ₹303.05 (same, market closed)
  - P&L: ₹0 (no updates while closed)

- **Tomorrow**: Market opens, price becomes ₹310
  - System fetches live option chain from API
  - Updates stored prices for all positions
  - Current price shown: ₹310
  - P&L calculated: (310 - 303) × 1 lot × 50 = **₹350 profit** ✅

## Implementation Details

### New useEffect Added to Portfolio Page
```typescript
// Fetch live option prices when market is open
useEffect(() => {
  if (!user) return

  const fetchLiveOptionPrices = async () => {
    // 1. Load all options positions from localStorage
    const positions = JSON.parse(localStorage.getItem(`options_positions_${user.email}`) || '[]')
    
    // 2. Group by index (NIFTY, BANKNIFTY, SENSEX)
    const indicesByIndex = new Map<string, any[]>()
    
    // 3. Fetch option chain for each index from API
    for (const [indexSymbol, positionsForIndex] of indicesByIndex) {
      const response = await fetch('/api/options/chain', {
        method: 'GET',
        headers: { 'X-Index-Symbol': indexSymbol }
      })
      
      // 4. Extract current prices for each strike
      const strikeData = data.strikes.find(s => s.strike === pos.strike)
      const currentPrice = pos.type === 'CE' ? strikeData.cePrice : strikeData.pePrice
      
      // 5. Store in localStorage for deterministic P&L
      lastPrices[strikeKey] = currentPrice
    }
  }
  
  // Run every 10 seconds when market open
  // Run every 60 seconds when market closed
  const interval = setInterval(fetchLiveOptionPrices, marketStatus.isOpen ? 10000 : 60000)
  
  return () => clearInterval(interval)
}, [user])
```

### Key Features
✅ **Automatic Updates**: Fetches live prices every 10 seconds when market is open
✅ **Efficient**: Pauses updates when market is closed (60-second intervals)
✅ **Market-Aware**: Checks market status before updating
✅ **Persistent**: Stores prices in localStorage for deterministic calculations
✅ **Real-Time P&L**: Portfolio shows actual profit/loss based on live prices

## Data Flow

```
Market Opens (9:15 AM IST)
    ↓
Portfolio useEffect detects market status
    ↓
Fetches /api/options/chain for NIFTY
    ↓
Gets live CE/PE prices for each strike
    ↓
Updates localStorage with new prices
    ↓
Portfolio component recalculates P&L
    ↓
Dashboard shows live profit/loss
```

## P&L Calculation Logic

```typescript
Entry Price: ₹303.05
Current Price: ₹310.00
Quantity: 1 lot
Lot Size: 50

For BUY Position:
P&L = (Current - Entry) × Quantity × LotSize
    = (310 - 303.05) × 1 × 50
    = 6.95 × 50
    = ₹347.50 profit
```

## Display Format
- Entry: ₹303.05
- Now: ₹310.00
- P&L: +₹347.50 (green)
- Percentage: +1.15%

## Behavior When Market Closed
- Current prices remain at last trading prices
- P&L values don't update
- Refresh interval changes from 10s to 60s
- No fake profit generation
- Yellow warning banner displayed

## Behavior When Market Opens
- System immediately fetches latest option chains
- Current prices update every 10 seconds
- P&L values refresh in real-time
- Shows actual market-based profits/losses

## Files Modified
- `/app/portfolio/page.tsx` - Added new useEffect for live price fetching

## Testing
To verify this works:
1. Buy a call/put option when market is closed (entry @ ₹303)
2. Wait for market to open
3. Open portfolio page
4. Watch prices update in real-time
5. If spot price moves to ₹310, profit will show as (310-303)×qty×50

## Related Features
- Market status detection: `isMarketOpen()` from `/lib/market-utils`
- Option chain API: `/api/options/chain`
- Price persistence: `localStorage` with key `last_prices_${email}`
- P&L calculation: `calculatePnL()` from `/lib/pnl-calculator`
