import { isMarketOpen } from './market-utils'

/**
 * PROPER P&L CALCULATION FOR OPTIONS TRADING
 * 
 * For Options:
 * - Each lot has a specific lot size (usually 50 or 25 for options)
 * - When you BUY a call/put at price X and SELL at price Y:
 *   P&L = (Y - X) * Quantity * Lot Size
 * - When you SELL a call/put at price X and BUY back at price Y:
 *   P&L = (X - Y) * Quantity * Lot Size (profit when Y < X)
 * 
 * Example (as per user requirement):
 * - Buy Call at 70 rupees
 * - Sell at 80 rupees
 * - Quantity: 1 lot, Lot Size: 50
 * - P&L = (80 - 70) * 1 * 50 = 500 rupees (not 10!)
 * 
 * But if we're calculating P&L per lot/contract:
 * - P&L per contract = 80 - 70 = 10 rupees
 * - Total P&L = 10 * 1 * 50 = 500 rupees
 */

export interface OptionPosition {
  id: string
  type: "CE" | "PE" // Call or Put
  action: "BUY" | "SELL" // Initial action
  index: string
  strike: number
  entryPrice: number // Price at which position was opened
  currentPrice: number // Current market price
  quantity: number // Number of lots
  lotSize: number // Size of each lot (typically 50 for Nifty options)
  timestamp: number
}

/**
 * Calculate P&L for options trading
 * 
 * @param entryPrice - Price at which option was bought/sold
 * @param currentPrice - Current market price of the option
 * @param action - "BUY" or "SELL" (the action taken)
 * @param quantity - Number of lots
 * @param lotSize - Size of each lot
 * @returns Total P&L in rupees
 */
export function calculateOptionsPnL(
  entryPrice: number,
  currentPrice: number,
  action: "BUY" | "SELL",
  quantity: number,
  lotSize: number
): number {
  // Validate inputs
  if (isNaN(entryPrice) || isNaN(currentPrice) || isNaN(quantity) || isNaN(lotSize)) {
    return 0
  }

  if (entryPrice <= 0 || quantity <= 0 || lotSize <= 0) {
    return 0
  }

  let pnl = 0

  if (action === "BUY") {
    // For BUY position: profit when currentPrice > entryPrice
    // P&L = (currentPrice - entryPrice) * quantity * lotSize
    pnl = (currentPrice - entryPrice) * quantity * lotSize
  } else {
    // For SELL position: profit when currentPrice < entryPrice
    // P&L = (entryPrice - currentPrice) * quantity * lotSize
    pnl = (entryPrice - currentPrice) * quantity * lotSize
  }

  return Math.round(pnl * 100) / 100
}

/**
 * Calculate P&L percentage
 * @param entryPrice - Entry price
 * @param currentPrice - Current price
 * @param action - BUY or SELL
 * @returns Percentage gain/loss
 */
export function calculateOptionsPnLPercent(
  entryPrice: number,
  currentPrice: number,
  action: "BUY" | "SELL"
): number {
  if (isNaN(entryPrice) || entryPrice === 0) {
    return 0
  }

  let pnlPercent = 0

  if (action === "BUY") {
    // For BUY: % gain = (currentPrice - entryPrice) / entryPrice * 100
    pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100
  } else {
    // For SELL: % gain = (entryPrice - currentPrice) / entryPrice * 100
    pnlPercent = ((entryPrice - currentPrice) / entryPrice) * 100
  }

  return Math.round(pnlPercent * 100) / 100
}

/**
 * Calculate weighted average entry price when averaging positions
 * @param existingQty - Existing quantity
 * @param existingPrice - Existing average price
 * @param newQty - New quantity being added
 * @param newPrice - Price of new position
 * @returns New weighted average price
 */
export function calculateAveragePrice(
  existingQty: number,
  existingPrice: number,
  newQty: number,
  newPrice: number
): number {
  if (isNaN(existingQty) || isNaN(existingPrice) || isNaN(newQty) || isNaN(newPrice)) {
    return newPrice
  }

  const totalQty = existingQty + newQty
  if (totalQty === 0) return newPrice

  return (existingQty * existingPrice + newQty * newPrice) / totalQty
}

/**
 * Get effective price for P&L calculation considering market status
 */
export function getEffectivePrice(
  currentPrice: number | undefined,
  lastTradingPrice: number | undefined,
  fallbackPrice: number
): number {
  const market = isMarketOpen()

  // Market is open - use live current price
  if (market.isOpen) {
    if (typeof currentPrice === "number" && !isNaN(currentPrice) && currentPrice > 0) {
      return currentPrice
    }
  }

  // Market is closed - use last trading price (more stable)
  if (typeof lastTradingPrice === "number" && !isNaN(lastTradingPrice) && lastTradingPrice > 0) {
    return lastTradingPrice
  }

  // Fallback to current price if available
  if (typeof currentPrice === "number" && !isNaN(currentPrice) && currentPrice > 0) {
    return currentPrice
  }

  // Last resort: use fallback (entry price or previous known price)
  return isNaN(fallbackPrice) || fallbackPrice <= 0 ? 0 : fallbackPrice
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

    const key = `last_trading_price_${userEmail}`
    const prices = (() => {
      try {
        const stored = localStorage.getItem(key)
        return stored ? JSON.parse(stored) : {}
      } catch {
        return {}
      }
    })()

    prices[symbol] = {
      price,
      timestamp: Date.now(),
    }

    localStorage.setItem(key, JSON.stringify(prices))
    
    // Sync to database in background (non-blocking)
    syncPriceToDatabase(userEmail, symbol, price).catch(err => 
      console.warn("Failed to sync price to database:", err)
    )
  } catch (error) {
    console.warn("Failed to store last trading price:", error)
  }
}

/**
 * Get last trading price for a symbol
 */
export function getLastTradingPrice(
  userEmail: string,
  symbol: string
): number | undefined {
  try {
    if (!userEmail || !symbol) return undefined

    const key = `last_trading_price_${userEmail}`
    const stored = localStorage.getItem(key)
    if (!stored) return undefined

    const prices = JSON.parse(stored)
    const data = prices[symbol]

    if (data && typeof data.price === "number" && !isNaN(data.price) && data.price > 0) {
      return data.price
    }

    return undefined
  } catch (error) {
    console.warn("Failed to get last trading price:", error)
    return undefined
  }
}

/**
 * Load last trading prices from database for a user
 * This is async - use await when calling
 */
export async function loadPricesFromDatabase(userEmail: string): Promise<Record<string, number>> {
  try {
    const response = await fetch("/api/prices/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail })
    })

    const data = await response.json()
    if (data.success && data.prices) {
      // Also sync to localStorage for faster access
      const key = `last_trading_price_${userEmail}`
      const prices: any = {}
      Object.entries(data.prices).forEach(([symbol, price]: [string, any]) => {
        prices[symbol] = {
          price,
          timestamp: Date.now(),
        }
      })
      localStorage.setItem(key, JSON.stringify(prices))
      return data.prices
    }
    return {}
  } catch (error) {
    console.warn("Failed to load prices from database:", error)
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
    const response = await fetch("/api/prices/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, symbol, price })
    })
    
    if (!response.ok) {
      console.warn("Failed to sync price:", response.statusText)
    }
  } catch (error) {
    console.warn("Failed to sync price to database:", error)
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
    console.warn("Failed to clear trading prices:", error)
  }
}

/**
 * Calculate unrealized P&L for all positions
 */
export interface PortfolioMetrics {
  totalInvested: number
  totalCurrentValue: number
  totalPnL: number
  totalPnLPercent: number
  totalProfit: number
  totalLoss: number
  profitCount: number
  lossCount: number
}

export function calculatePortfolioMetrics(positions: OptionPosition[]): PortfolioMetrics {
  let totalProfit = 0
  let totalLoss = 0
  let profitCount = 0
  let lossCount = 0
  let totalInvested = 0
  let totalCurrentValue = 0

  positions.forEach((pos) => {
    const pnl = calculateOptionsPnL(
      pos.entryPrice,
      pos.currentPrice,
      pos.action,
      pos.quantity,
      pos.lotSize
    )

    const investedValue = pos.entryPrice * pos.quantity * pos.lotSize
    const currentValue = pos.currentPrice * pos.quantity * pos.lotSize

    totalInvested += investedValue
    totalCurrentValue += currentValue

    if (pnl >= 0) {
      totalProfit += pnl
      profitCount++
    } else {
      totalLoss += Math.abs(pnl)
      lossCount++
    }
  })

  const totalPnL = totalProfit - totalLoss
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    totalPnLPercent: Math.round(totalPnLPercent * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalLoss: Math.round(totalLoss * 100) / 100,
    profitCount,
    lossCount,
  }
}
