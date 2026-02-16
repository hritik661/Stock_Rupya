import { NextResponse, type NextRequest } from "next/server"

interface IndicesPriceData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  volume: number
  currency: string
  marketStatus: string
  timestamp: number
}

// Map of Indian indices to Yahoo Finance symbols
const INDICES_MAP: Record<string, { symbol: string; name: string; currency: string }> = {
  NIFTY: { symbol: "^NSEI", name: "NIFTY 50", currency: "INR" },
  BANKNIFTY: { symbol: "^NSEBANK", name: "BANK NIFTY", currency: "INR" },
  SENSEX: { symbol: "^BSESN", name: "BSE SENSEX", currency: "INR" },
  NIFTYIT: { symbol: "^CNXIT", name: "NIFTY IT", currency: "INR" },
  NIFTYPHARMA: { symbol: "^CNXPHARMA", name: "NIFTY PHARMA", currency: "INR" },
  NIFTYAUTO: { symbol: "^CNXAUTO", name: "NIFTY AUTO", currency: "INR" },
  FINNIFTY: { symbol: "^CNXINFRA", name: "FINNIFTY", currency: "INR" },
  MIDCAP: { symbol: "^CNXM100", name: "NIFTY MIDCAP 100", currency: "INR" },
}

async function fetchIndexPrice(symbol: string): Promise<IndicesPriceData | null> {
  try {
    const indicesConfig = INDICES_MAP[symbol]
    if (!indicesConfig) {
      console.error(`Index ${symbol} not found in mapping`)
      return null
    }

    const yFinanceSymbol = indicesConfig.symbol

    // Fetch from Yahoo Finance v8 API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yFinanceSymbol
    )}?range=1d&interval=1m&includePrePost=false`

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 30 }, // Cache for 30 seconds
    })

    if (!response.ok) {
      console.error(`Yahoo Finance API error for ${yFinanceSymbol}: ${response.status}`)
      return null
    }

    const data = await response.json()
    const result = data?.chart?.result?.[0]
    const meta = result?.meta

    if (!meta) {
      console.error(`No meta data for ${yFinanceSymbol}`)
      return null
    }

    const quote = result.indicators?.quote?.[0] || {}
    const timestamps = result.timestamp || []
    const closes = quote.close || []
    const opens = quote.open || []
    const highs = quote.high || []
    const lows = quote.low || []
    const volumes = quote.volume || []

    // Get latest valid values
    const getLatestValid = (arr: (number | null)[]) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] !== null && !isNaN(arr[i] as number)) {
          return arr[i]
        }
      }
      return null
    }

    const currentPrice = meta.regularMarketPrice || getLatestValid(closes) || 0
    const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0
    const openPrice = meta.regularMarketOpen || getLatestValid(opens) || currentPrice
    const dayHigh = meta.regularMarketDayHigh || Math.max(...highs.filter((h: number | null) => h !== null && !isNaN(h)))
    const dayLow = meta.regularMarketDayLow || Math.min(...lows.filter((l: number | null) => l !== null && !isNaN(l)))
    const volume = meta.regularMarketVolume || volumes.reduce((a: number, b: number | null) => a + (b || 0), 0)

    return {
      symbol,
      name: indicesConfig.name,
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      open: Math.round(openPrice * 100) / 100,
      high: Math.round(dayHigh * 100) / 100,
      low: Math.round(dayLow * 100) / 100,
      volume: Math.round(volume),
      currency: indicesConfig.currency,
      marketStatus: meta.marketState || "UNKNOWN",
      timestamp: Date.now(),
    }
  } catch (error) {
    console.error(`Error fetching index ${symbol}:`, error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol")
    const all = request.nextUrl.searchParams.get("all")

    if (all === "true") {
      // Fetch all indices
      const promises = Object.keys(INDICES_MAP).map((key) => fetchIndexPrice(key))
      const results = await Promise.all(promises)
      const indices = results.filter((result) => result !== null) as IndicesPriceData[]

      return NextResponse.json({
        success: true,
        indices,
        timestamp: Date.now(),
      })
    }

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: "Symbol parameter is required. Use ?symbol=NIFTY or ?all=true",
        },
        { status: 400 }
      )
    }

    const price = await fetchIndexPrice(symbol)

    if (!price) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not fetch price for index ${symbol}`,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      ...price,
    })
  } catch (error) {
    console.error("Indices API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch indices data",
      },
      { status: 500 }
    )
  }
}
