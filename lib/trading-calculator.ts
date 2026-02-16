import { isMarketOpen } from './market-utils'

/**
 * COMPREHENSIVE TRADING CALCULATOR
 * 
 * Handles perfect balance calculations for:
 * - Stocks (BUY/SELL)
 * - Options (CE/PE with lot sizes)
 * - Indices (NIFTY, BANKNIFTY, SENSEX)
 * 
 * Key Rules:
 * 1. When buying: Balance DECREASES by (price × quantity × lotSize)
 * 2. When selling: Balance INCREASES by (currentPrice × quantity × lotSize)
 * 3. P&L is calculated separately for DISPLAY ONLY
 * 4. When market is CLOSED: P&L shows 0, use last trading price for balance
 * 5. When market is OPEN: P&L shows real-time gains/losses
 */

export interface TradeCalculation {
  // Balance impact
  balanceDebit: number      // Amount to deduct from balance (on BUY)
  balanceCredit: number     // Amount to credit to balance (on SELL)
  
  // P&L (for display only)
  pnl: number              // Profit/Loss amount
  pnlPercent: number       // Profit/Loss percentage
  
  // Position tracking
  investedAmount: number   // Total amount invested
  currentValue: number     // Current market value
  
  // Market status
  isMarketOpen: boolean
  useLastTradingPrice: boolean
}

/**
 * Calculate buy transaction
 * When you BUY: You spend money = current price × quantity × lot size
 */
export function calculateBuyTransaction(
  currentPrice: number,
  quantity: number,
  lotSize: number = 1
): TradeCalculation {
  const balanceDebit = currentPrice * quantity * lotSize
  
  return {
    balanceDebit,
    balanceCredit: 0,
    pnl: 0,                    // No P&L on buy, only on sell
    pnlPercent: 0,
    investedAmount: balanceDebit,
    currentValue: balanceDebit,
    isMarketOpen: isMarketOpen().isOpen,
    useLastTradingPrice: false,
  }
}

/**
 * Calculate sell transaction
 * When you SELL: You receive money = current price × quantity × lot size
 * 
 * IMPORTANT: You ALWAYS get the current market price, not (entry price + P&L)
 */
export function calculateSellTransaction(
  entryPrice: number,
  currentPrice: number,
  quantity: number,
  action: 'BUY' | 'SELL' = 'BUY',
  lotSize: number = 1
): TradeCalculation {
  const investedAmount = entryPrice * quantity * lotSize
  const currentValue = currentPrice * quantity * lotSize
  
  // P&L = current value - invested amount
  let pnl = 0
  
  if (action === 'BUY') {
    // BUY position: profit when currentPrice > entryPrice
    pnl = (currentPrice - entryPrice) * quantity * lotSize
  } else {
    // SELL position: profit when currentPrice < entryPrice
    pnl = (entryPrice - currentPrice) * quantity * lotSize
  }
  
  const pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0
  
  // CRITICAL: Credit = CURRENT MARKET PRICE × quantity × lot size
  // NOT: entry price + P&L (that would be double-counting!)
  const balanceCredit = currentPrice * quantity * lotSize
  
  const marketStatus = isMarketOpen()
  
  return {
    balanceDebit: 0,
    balanceCredit,
    pnl: Math.round(pnl * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
    investedAmount,
    currentValue,
    isMarketOpen: marketStatus.isOpen,
    useLastTradingPrice: !marketStatus.isOpen,  // If market closed, use last trading price
  }
}

/**
 * Calculate unrealized P&L (display only, doesn't affect balance)
 * This is shown in the portfolio to display gains/losses
 * 
 * IMPORTANT: This is SEPARATE from balance calculation
 */
export function calculateUnrealizedPnL(
  entryPrice: number,
  currentPrice: number,
  quantity: number,
  action: 'BUY' | 'SELL' = 'BUY',
  lotSize: number = 1
): {
  pnl: number
  pnlPercent: number
  currentValue: number
} {
  const investedAmount = entryPrice * quantity * lotSize
  const currentValue = currentPrice * quantity * lotSize
  
  let pnl = 0
  if (action === 'BUY') {
    pnl = (currentPrice - entryPrice) * quantity * lotSize
  } else {
    pnl = (entryPrice - currentPrice) * quantity * lotSize
  }
  
  const pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0
  
  return {
    pnl: Math.round(pnl * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
    currentValue,
  }
}

/**
 * Determine if we should use last trading price
 * Used when market is closed and user is closing a position
 */
export function shouldUseLastTradingPrice(): boolean {
  return !isMarketOpen().isOpen
}

/**
 * Calculate portfolio metrics
 */
export interface PortfolioMetrics {
  totalInvested: number          // Total money put into positions
  totalCurrentValue: number      // Current market value of all positions
  totalUnrealizedPnL: number    // Total P&L if you close now
  totalUnrealizedPnLPercent: number
  availableBalance: number       // Cash balance not invested
  totalPortfolioValue: number    // Balance + current value of positions
  isMarketOpen: boolean
}

export function calculatePortfolioMetrics(
  availableBalance: number,
  positions: Array<{
    entryPrice: number
    currentPrice: number
    quantity: number
    action?: 'BUY' | 'SELL'
    lotSize?: number
  }>
): PortfolioMetrics {
  let totalInvested = 0
  let totalCurrentValue = 0
  let totalUnrealizedPnL = 0
  
  positions.forEach(pos => {
    const lotSize = pos.lotSize || 1
    const action = pos.action || 'BUY'
    
    const invested = pos.entryPrice * pos.quantity * lotSize
    const current = pos.currentPrice * pos.quantity * lotSize
    
    totalInvested += invested
    totalCurrentValue += current
    
    if (action === 'BUY') {
      totalUnrealizedPnL += (pos.currentPrice - pos.entryPrice) * pos.quantity * lotSize
    } else {
      totalUnrealizedPnL += (pos.entryPrice - pos.currentPrice) * pos.quantity * lotSize
    }
  })
  
  const totalUnrealizedPnLPercent = totalInvested > 0 
    ? (totalUnrealizedPnL / totalInvested) * 100 
    : 0
  
  const totalPortfolioValue = availableBalance + totalCurrentValue
  
  return {
    totalInvested,
    totalCurrentValue,
    totalUnrealizedPnL: Math.round(totalUnrealizedPnL * 100) / 100,
    totalUnrealizedPnLPercent: Math.round(totalUnrealizedPnLPercent * 100) / 100,
    availableBalance,
    totalPortfolioValue,
    isMarketOpen: isMarketOpen().isOpen,
  }
}

/**
 * Validate if user has sufficient balance to make a purchase
 */
export function validateSufficientBalance(
  currentBalance: number,
  requiredAmount: number
): { isValid: boolean; shortfall?: number } {
  if (currentBalance >= requiredAmount) {
    return { isValid: true }
  }
  
  return {
    isValid: false,
    shortfall: requiredAmount - currentBalance,
  }
}

/**
 * Calculate sell all scenario
 * Returns total credit when closing ALL positions
 */
export function calculateCloseAllPositions(
  positions: Array<{
    entryPrice: number
    currentPrice: number
    quantity: number
    action?: 'BUY' | 'SELL'
    lotSize?: number
  }>
): {
  totalCredit: number
  totalPnL: number
  breakdown: Array<{
    name: string
    credit: number
    pnl: number
  }>
} {
  let totalCredit = 0
  let totalPnL = 0
  const breakdown: Array<{ name: string; credit: number; pnl: number }> = []
  
  positions.forEach((pos, idx) => {
    const lotSize = pos.lotSize || 1
    const action = pos.action || 'BUY'
    
    const credit = pos.currentPrice * pos.quantity * lotSize
    let pnl = 0
    
    if (action === 'BUY') {
      pnl = (pos.currentPrice - pos.entryPrice) * pos.quantity * lotSize
    } else {
      pnl = (pos.entryPrice - pos.currentPrice) * pos.quantity * lotSize
    }
    
    totalCredit += credit
    totalPnL += pnl
    
    breakdown.push({
      name: `Position ${idx + 1}`,
      credit,
      pnl,
    })
  })
  
  return {
    totalCredit: Math.round(totalCredit * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    breakdown,
  }
}

/**
 * Summary of the calculation system:
 * 
 * BALANCE CALCULATION (What affects your balance):
 * BUY:  Balance -= (currentPrice × quantity × lotSize)
 * SELL: Balance += (currentPrice × quantity × lotSize)
 * 
 * P&L DISPLAY (Separate - doesn't affect balance):
 * For BUY positions:  P&L = (currentPrice - entryPrice) × quantity × lotSize
 * For SELL positions: P&L = (entryPrice - currentPrice) × quantity × lotSize
 * 
 * MARKET STATUS:
 * - Market OPEN: Use real-time prices, show live P&L
 * - Market CLOSED: Use last trading prices, P&L shows based on closing price
 * 
 * SELL ALL when MARKET CLOSED:
 * - All positions closed at last trading prices
 * - Balance = original balance (if all bought and sold)
 * - P&L settled based on closing prices
 */
