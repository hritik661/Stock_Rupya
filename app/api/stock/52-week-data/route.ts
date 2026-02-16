import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { TOP_30_INDIAN_STOCKS, processFiftyTwoWeekStats } from "@/lib/52-week-data"

interface CachedData {
  timestamp: number
  data: any
}

// In-memory cache for 52-week data (valid for 1 hour)
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour
let cachedFiftyTwoWeekData: CachedData | null = null

/**
 * Fetch 52-week data for a single stock from Yahoo Finance
 */
async function fetchStock52WeekData(symbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=1y&interval=1d&includePrePost=false`

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout per stock
    })

    if (!response.ok) {
      console.warn(`[52W] Failed to fetch ${symbol}: ${response.status}`)
      return null
    }

    const data = await response.json()
    const result = data?.chart?.result?.[0]
    const meta = result?.meta

    if (!meta) {
      console.warn(`[52W] No metadata for ${symbol}`)
      return null
    }

    const quote = result?.indicators?.quote?.[0] || {}
    const timestamps = result?.timestamp || []
    const highs = quote.high || []
    const lows = quote.low || []
    const closes = quote.close || []

    // Calculate 52-week high and low from the data
    let fiftyTwoWeekHigh = 0
    let fiftyTwoWeekLow = Infinity
    let highDate: number | undefined
    let lowDate: number | undefined

    for (let i = 0; i < highs.length; i++) {
      const high = highs[i]
      const low = lows[i]

      if (high && high > fiftyTwoWeekHigh) {
        fiftyTwoWeekHigh = high
        highDate = timestamps[i]
      }
      if (low && low < fiftyTwoWeekLow) {
        fiftyTwoWeekLow = low
        lowDate = timestamps[i]
      }
    }

    // Get current price and other metrics
    const currentPrice = meta.regularMarketPrice || closes[closes.length - 1] || 0
    const previousClose = meta.previousClose || closes[closes.length - 2] || currentPrice

    // Calculate simple moving averages
    const fiftyDayAverage = closes.length >= 50
      ? closes.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50
      : undefined

    const twoHundredDayAverage = closes.length >= 200
      ? closes.slice(-200).reduce((a: number, b: number) => a + b, 0) / 200
      : undefined

    return {
      symbol,
      shortName: meta.longName || symbol,
      longName: meta.longName || symbol,
      regularMarketPrice: currentPrice,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      fiftyTwoWeekLowDate: lowDate ? new Date(lowDate * 1000).toISOString() : undefined,
      fiftyTwoWeekHighDate: highDate ? new Date(highDate * 1000).toISOString() : undefined,
      previousClose,
      regularMarketChange: currentPrice - previousClose,
      regularMarketChangePercent:
        previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0,
      fiftyDayAverage,
      twoHundredDayAverage,
      currency: meta.currency || "INR",
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.warn(`[52W] Timeout fetching ${symbol}`)
      } else {
        console.error(`[52W] Error fetching ${symbol}:`, error.message)
      }
    }
    return null
  }
}

/**
 * Fetch 52-week data for multiple stocks in parallel
 */
async function fetchMultiple52WeekData(symbols: string[]) {
  const results = await Promise.allSettled(symbols.map(symbol => fetchStock52WeekData(symbol)))

  return results
    .map((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        return result.value
      }
      console.warn(`[52W] Failed to fetch ${symbols[index]}`)
      return null
    })
    .filter(item => item !== null)
}

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type") || "all"
    const forceRefresh = request.nextUrl.searchParams.get("refresh") === "true"

    // Check cache
    const now = Date.now()
    if (!forceRefresh && cachedFiftyTwoWeekData && now - cachedFiftyTwoWeekData.timestamp < CACHE_DURATION) {
      console.log("[52W] Returning cached data")
      return NextResponse.json(cachedFiftyTwoWeekData.data, {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      })
    }

    console.log("[52W] Fetching fresh 52-week data for 30 stocks...")

    // Fetch all 30 stocks in parallel
    const quotes = await fetchMultiple52WeekData(TOP_30_INDIAN_STOCKS)

    if (quotes.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch 52-week data", stocks: [] },
        { status: 500 }
      )
    }

    // Process the data
    const stats = processFiftyTwoWeekStats(quotes)

    // Cache the results
    cachedFiftyTwoWeekData = {
      timestamp: now,
      data: stats,
    }

    // Return based on type
    let response: any = stats

    if (type === "near-high") {
      response = {
        ...stats,
        stocks: stats.topNearHigh || [],
      }
    } else if (type === "near-low") {
      response = {
        ...stats,
        stocks: stats.topNearLow || [],
      }
    } else if (type === "volatile") {
      response = {
        ...stats,
        stocks: stats.mostVolatile || [],
      }
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[52W] API Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch 52-week data", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint to manually refresh cache
 */
export async function POST(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action")

    if (action === "refresh") {
      cachedFiftyTwoWeekData = null // Clear cache
      console.log("[52W] Cache cleared, will fetch fresh data")

      // Fetch fresh data
      const quotes = await fetchMultiple52WeekData(TOP_30_INDIAN_STOCKS)
      const stats = processFiftyTwoWeekStats(quotes)

      cachedFiftyTwoWeekData = {
        timestamp: Date.now(),
        data: stats,
      }

      return NextResponse.json({
        success: true,
        message: "52-week data refreshed",
        timestamp: cachedFiftyTwoWeekData.timestamp,
        stocksCount: quotes.length,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[52W] POST Error:", error)
    return NextResponse.json(
      { error: "Failed to refresh data", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
