import { isMarketOpen } from './market-utils'

/**
 * Enhanced P&L Calculator
 * 
 * Handles:
 * 1. Correct P&L calculation: (currentPrice - avgPrice) * quantity
 * 2. Market close scenarios: Uses last trading price until market opens
 * 3. Market open transitions: Uses opening price from next trading day
 */

export interface PriceData {
  symbol: string
  avgPrice: number
  quantity: number
  currentPrice?: number
  lastTradingPrice?: number
}

/**
 * Calculate P&L for holdings
 * @param avgPrice - Average buy price
 * @param currentPrice - Current market price (or last trading price if market closed)
 * @param quantity - Number of shares/lots
 * @returns P&L amount (rounded to 2 decimals)
 */
export function calculatePnL(avgPrice: number, currentPrice: number, quantity: number): number {
  if (isNaN(avgPrice) || isNaN(currentPrice) || isNaN(quantity)) {
    return 0
  }
  const pnl = (currentPrice - avgPrice) * quantity
  // Round to 2 decimal places to avoid floating point errors
  return Math.round(pnl * 100) / 100
}

/**
 * Calculate P&L percentage
 * @param avgPrice - Average buy price
 * @param currentPrice - Current market price
 * @returns P&L percentage
 */
export function calculatePnLPercent(avgPrice: number, currentPrice: number): number {
  if (isNaN(avgPrice) || avgPrice === 0) {
    return 0
  }
  return ((currentPrice - avgPrice) / avgPrice) * 100
}

/**
 * Get effective price for P&L calculation considering market status
 * 
 * Logic:
 * - If market is OPEN: use currentPrice
 * - If market is CLOSED: use lastTradingPrice (stored from yesterday's close)
 *   This ensures deterministic P&L until market opens
 * - When market opens: it will fetch fresh prices, and if they're different,
 *   the lastTradingPrice will be updated for next close
 */
export function getEffectivePrice(
  currentPrice: number | undefined,
  lastTradingPrice: number | undefined,
  fallbackPrice: number
): number {
  const market = isMarketOpen()
  
  // Always use current price if available (live or last trading price)
  // This shows real P&L even when market is closed
  if (typeof currentPrice === 'number' && !isNaN(currentPrice) && currentPrice > 0) {
    return currentPrice
  }
  
  // Use last trading price if current price not available
  if (typeof lastTradingPrice === 'number' && !isNaN(lastTradingPrice) && lastTradingPrice > 0) {
    return lastTradingPrice
  }
  
  // Last resort: use fallback (entry price or previous known price)
  return isNaN(fallbackPrice) || fallbackPrice <= 0 ? 0 : fallbackPrice
}

/**
 * Calculate portfolio metrics
 */
export function calculatePortfolioMetrics(holdings: Array<{
  avgPrice: number
  quantity: number
  currentValue: number
  pnl: number
}>) {
  const totalInvested = holdings.reduce((sum, h) => {
    const investedValue = h.avgPrice * h.quantity
    return sum + (isNaN(investedValue) ? 0 : investedValue)
  }, 0)
  
  const totalCurrentValue = holdings.reduce((sum, h) => {
    return sum + (isNaN(h.currentValue) ? 0 : h.currentValue)
  }, 0)
  
  const totalPnL = totalCurrentValue - totalInvested
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0
  
  return {
    totalInvested: isNaN(totalInvested) ? 0 : totalInvested,
    totalCurrentValue: isNaN(totalCurrentValue) ? 0 : totalCurrentValue,
    totalPnL: isNaN(totalPnL) ? 0 : totalPnL,
    totalPnLPercent: isNaN(totalPnLPercent) ? 0 : totalPnLPercent,
  }
}

/**
 * Store last trading price for a symbol
 * Used to maintain deterministic P&L when market is closed
 * 
 * Strategy: Store in localStorage immediately for sync access,
 * then sync to database asynchronously in background
 */
export function storeLastTradingPrice(
  userEmail: string,
  symbol: string,
  price: number
): void {
  try {
    if (!userEmail || !symbol || isNaN(price) || price <= 0) return
    const keyDetailed = `last_trading_price_${userEmail}`
    const keySimple = `last_prices_${userEmail}`

    // Detailed storage (symbol -> { price, timestamp })
    const pricesDetailed = (() => {
      try {
        const stored = localStorage.getItem(keyDetailed)
        return stored ? JSON.parse(stored) : {}
      } catch {
        return {}
      }
    })()

    pricesDetailed[symbol] = {
      price,
      timestamp: Date.now(),
    }

    localStorage.setItem(keyDetailed, JSON.stringify(pricesDetailed))

    // Simple storage (symbol -> price) for backward compatibility with other parts of the app
    const pricesSimple = (() => {
      try {
        const stored = localStorage.getItem(keySimple)
        return stored ? JSON.parse(stored) : {}
      } catch {
        return {}
      }
    })()

    pricesSimple[symbol] = price
    localStorage.setItem(keySimple, JSON.stringify(pricesSimple))
    
    // Sync to database in background (non-blocking)
    syncPriceToDatabase(userEmail, symbol, price).catch(err => 
      console.warn('Failed to sync price to database:', err)
    )
  } catch (error) {
    console.warn('Failed to store last trading price:', error)
  }
}

/**
 * Get last trading price for a symbol
 * Try database first, then fallback to localStorage
 */
export function getLastTradingPrice(
  userEmail: string,
  symbol: string
): number | undefined {
  try {
    if (!userEmail || !symbol) return undefined
    // Try detailed key first (symbol -> { price, timestamp })
    const keyDetailed = `last_trading_price_${userEmail}`
    const storedDetailed = localStorage.getItem(keyDetailed)
    if (storedDetailed) {
      try {
        const prices = JSON.parse(storedDetailed)
        const data = prices[symbol]
        if (data && typeof data.price === 'number' && !isNaN(data.price) && data.price > 0) {
          return data.price
        }
      } catch {
        // fallthrough to simple key
      }
    }

    // Fallback to simple key (symbol -> price)
    const keySimple = `last_prices_${userEmail}`
    const storedSimple = localStorage.getItem(keySimple)
    if (storedSimple) {
      try {
        const prices = JSON.parse(storedSimple)
        const p = prices[symbol]
        if (typeof p === 'number' && !isNaN(p) && p > 0) return p
      } catch {
        return undefined
      }
    }

    return undefined
  } catch (error) {
    console.warn('Failed to get last trading price:', error)
    return undefined
  }
}

/**
 * Load last trading prices from database for a user
 * This is async - use await when calling
 */
export async function loadPricesFromDatabase(userEmail: string): Promise<Record<string, number>> {
  try {
    const response = await fetch('/api/prices/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    })

    const data = await response.json()
    if (data.success && data.prices) {
      // Also sync to localStorage for faster access
      const keyDetailed = `last_trading_price_${userEmail}`
      const keySimple = `last_prices_${userEmail}`
      const pricesDetailed: any = {}
      const pricesSimple: any = {}
      Object.entries(data.prices).forEach(([symbol, price]: [string, any]) => {
        pricesDetailed[symbol] = {
          price,
          timestamp: Date.now(),
        }
        pricesSimple[symbol] = price
      })
      localStorage.setItem(keyDetailed, JSON.stringify(pricesDetailed))
      localStorage.setItem(keySimple, JSON.stringify(pricesSimple))
      return data.prices
    }
    return {}
  } catch (error) {
    console.warn('Failed to load prices from database:', error)
    return {}
  }
}

/**
 * Sync price to database via API
 * Non-blocking, runs in background
 */
async function syncPriceToDatabase(
  userEmail: string,
  symbol: string,
  price: number
): Promise<void> {
  try {
    const response = await fetch('/api/prices/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, symbol, price })
    })
    
    if (!response.ok) {
      console.warn('Failed to sync price:', response.statusText)
    }
  } catch (error) {
    console.warn('Failed to sync price to database:', error)
  }
}

/**
 * Clear all stored trading prices (for logout or reset)
 */
export function clearLastTradingPrices(userEmail: string): void {
  try {
    if (!userEmail) return
    localStorage.removeItem(`last_trading_price_${userEmail}`)
  } catch (error) {
    console.warn('Failed to clear trading prices:', error)
  }
}
