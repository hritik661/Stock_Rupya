import { getTimeRangeParams } from "./market-utils"

export interface StockQuote {
  symbol: string
  shortName: string
  longName?: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketPreviousClose: number
  regularMarketOpen: number
  regularMarketDayHigh: number
  regularMarketDayLow: number
  regularMarketVolume: number
  marketCap?: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  averageVolume?: number
  currency: string
}

export interface ChartData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export async function fetchStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    // Normalize symbol for Yahoo Finance (append .NS for Indian stocks if not present)
    let normalizedSymbol = symbol.trim().toUpperCase()
    // If symbol is not an index or already has .NS/.BO, append .NS (for Indian stocks)
    if (!normalizedSymbol.endsWith('.NS') && !normalizedSymbol.endsWith('.BO') && /^[A-Z0-9]+$/.test(normalizedSymbol)) {
      normalizedSymbol = normalizedSymbol + '.NS'
    }
    const response = await fetch(`/api/stock/quote?symbol=${encodeURIComponent(normalizedSymbol)}`)
    if (!response.ok) {
      // Try fallback: original symbol (for non-Indian stocks)
      if (normalizedSymbol !== symbol) {
        const fallbackResponse = await fetch(`/api/stock/quote?symbol=${encodeURIComponent(symbol)}`)
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          return fallbackData
        }
      }
      throw new Error("Failed to fetch")
    }
    const data = await response.json()
    return data
  } catch (err) {
    // Optionally log error
    return null
  }
}

export async function fetchMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
  try {
    // Batch symbols into groups of up to 100 to avoid server-side limits
    const chunkSize = 100
    const chunks: string[][] = []
    for (let i = 0; i < symbols.length; i += chunkSize) {
      chunks.push(symbols.slice(i, i + chunkSize))
    }

    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await fetch(`/api/stock/quotes?symbols=${encodeURIComponent(chunk.join(","))}`)
        if (!response.ok) return []
        const data = await response.json()
        return data as StockQuote[]
      })
    )

    // Flatten and return
    return results.flat()
  } catch {
    return []
  }
}

export async function fetchChartData(symbol: string, range = "1M"): Promise<ChartData[]> {
  try {
    const { period1, period2, interval } = getTimeRangeParams(range)
    const response = await fetch(
      `/api/stock/chart?symbol=${encodeURIComponent(symbol)}&period1=${period1}&period2=${period2}&interval=${interval}`,
    )
    if (!response.ok) throw new Error("Failed to fetch")
    const data = await response.json()
    return data
  } catch {
    return []
  }
}

export async function searchStocks(query: string): Promise<Array<{ symbol: string; name: string; exchange: string }>> {
  try {
    const response = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`)
    if (!response.ok) throw new Error("Failed to fetch")
    const data = await response.json()
    return data
  } catch {
    return []
  }
}

export async function fetchGainersLosers(type: "gainers" | "losers", count: number = 20): Promise<StockQuote[]> {
  try {
    const response = await fetch(`/api/stock/gainers-losers?type=${type}&count=${count}`)
    if (!response.ok) throw new Error("Failed to fetch")
    const data = await response.json()
    return data
  } catch {
    return []
  }
}

export async function fetchFiftyTwoWeekData(type: "all" | "near-high" | "near-low" | "volatile" = "all") {
  try {
    const response = await fetch(`/api/stock/52-week-data?type=${type}`)
    if (!response.ok) throw new Error("Failed to fetch 52-week data")
    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching 52-week data:", error)
    return null
  }
}

