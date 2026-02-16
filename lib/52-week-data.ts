/**
 * 52-Week High/Low Data Manager
 * Fetches and manages 52-week high and low prices for Indian stocks
 */

export interface FiftyTwoWeekData {
  symbol: string
  name: string
  currentPrice: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  highDate?: string
  lowDate?: string
  range: number // High - Low
  rangePercent: number // (High - Low) / Low * 100
  distanceFromHigh: number // How far from 52W high (as percentage)
  distanceFromLow: number // How far from 52W low (as percentage)
  daysHighFromLow: number // Days since hitting 52W low estimate
  fiftyDayAverage?: number
  twoHundredDayAverage?: number
}

export interface FiftyTwoWeekStats {
  timestamp: number
  stocks: FiftyTwoWeekData[]
  topNearHigh: FiftyTwoWeekData[]
  topNearLow: FiftyTwoWeekData[]
  mostVolatile: FiftyTwoWeekData[]
  averageHighPercent: number
}

// Top 30 Indian stocks for 52-week tracking
export const TOP_30_INDIAN_STOCKS = [
  "RELIANCE.NS",
  "TCS.NS",
  "HDFCBANK.NS",
  "INFY.NS",
  "ICICIBANK.NS",
  "SBIN.NS",
  "HINDUNILVR.NS",
  "WIPRO.NS",
  "BAJAJFINSV.NS",
  "MARUTI.NS",
  "LT.NS",
  "AXISBANK.NS",
  "KOTAKBANK.NS",
  "ASIANPAINT.NS",
  "SUNPHARMA.NS",
  "NESTLEIND.NS",
  "POWERGRID.NS",
  "JSWSTEEL.NS",
  "BAJAJFINSV.NS",
  "BHARTIARTL.NS",
  "ULTRACEMCO.NS",
  "ADANIPORTS.NS",
  "NTPC.NS",
  "ONGC.NS",
  "TATASTEEL.NS",
  "BPCL.NS",
  "TITAN.NS",
  "INDIGO.NS",
  "GRASIM.NS",
  "TECHM.NS",
]

/**
 * Calculate distance from 52-week high as percentage
 * @param currentPrice Current stock price
 * @param fiftyTwoWeekHigh 52-week high price
 * @returns Percentage distance (0 = at high, 100 = at low equivalent)
 */
export function calculateDistanceFromHigh(currentPrice: number, fiftyTwoWeekHigh: number): number {
  if (fiftyTwoWeekHigh <= 0) return 0
  const distance = ((fiftyTwoWeekHigh - currentPrice) / fiftyTwoWeekHigh) * 100
  return Math.round(distance * 100) / 100
}

/**
 * Calculate distance from 52-week low as percentage
 * @param currentPrice Current stock price
 * @param fiftyTwoWeekLow 52-week low price
 * @returns Percentage distance (0 = at low, 100 = at high equivalent)
 */
export function calculateDistanceFromLow(currentPrice: number, fiftyTwoWeekLow: number): number {
  if (fiftyTwoWeekLow <= 0) return 0
  const distance = ((currentPrice - fiftyTwoWeekLow) / fiftyTwoWeekLow) * 100
  return Math.round(distance * 100) / 100
}

/**
 * Calculate 52-week range
 * @param high 52-week high
 * @param low 52-week low
 * @returns Object with range value and percentage
 */
export function calculateRange(high: number, low: number): { value: number; percent: number } {
  if (low <= 0) return { value: 0, percent: 0 }
  const value = high - low
  const percent = (value / low) * 100
  return {
    value: Math.round(value * 100) / 100,
    percent: Math.round(percent * 100) / 100,
  }
}

/**
 * Process 52-week data from stock quote
 */
export function process52WeekData(quote: any): FiftyTwoWeekData | null {
  if (!quote || !quote.symbol) return null

  const currentPrice = quote.regularMarketPrice || 0
  const high = quote.fiftyTwoWeekHigh || 0
  const low = quote.fiftyTwoWeekLow || 0

  if (high <= 0 || low <= 0) return null

  const range = calculateRange(high, low)
  const distanceFromHigh = calculateDistanceFromHigh(currentPrice, high)
  const distanceFromLow = calculateDistanceFromLow(currentPrice, low)

  return {
    symbol: quote.symbol,
    name: quote.shortName || quote.longName || quote.symbol,
    currentPrice,
    fiftyTwoWeekHigh: high,
    fiftyTwoWeekLow: low,
    range: range.value,
    rangePercent: range.percent,
    distanceFromHigh,
    distanceFromLow,
    daysHighFromLow: Math.round((distanceFromLow / 100) * 365), // Estimate
    fiftyDayAverage: quote.fiftyDayAverage,
    twoHundredDayAverage: quote.twoHundredDayAverage,
  }
}

/**
 * Process multiple 52-week data and create analytics
 */
export function processFiftyTwoWeekStats(quotes: any[]): FiftyTwoWeekStats {
  const processedData = quotes
    .map(q => process52WeekData(q))
    .filter((item): item is FiftyTwoWeekData => item !== null)
    .sort((a, b) => b.distanceFromHigh - a.distanceFromHigh) // Sort by distance from high (descending)

  // Top 10 stocks nearest to 52W high
  const topNearHigh = processedData
    .sort((a, b) => a.distanceFromHigh - b.distanceFromHigh)
    .slice(0, 10)

  // Top 10 stocks nearest to 52W low
  const topNearLow = processedData
    .sort((a, b) => b.distanceFromLow - a.distanceFromLow)
    .slice(0, 10)

  // Top 10 most volatile (largest range)
  const mostVolatile = processedData
    .sort((a, b) => b.rangePercent - a.rangePercent)
    .slice(0, 10)

  const averageHighPercent =
    processedData.length > 0
      ? processedData.reduce((sum, s) => sum + s.distanceFromHigh, 0) / processedData.length
      : 0

  return {
    timestamp: Date.now(),
    stocks: processedData,
    topNearHigh,
    topNearLow,
    mostVolatile,
    averageHighPercent: Math.round(averageHighPercent * 100) / 100,
  }
}
