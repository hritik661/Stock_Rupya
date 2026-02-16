import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  try {
    // Use v8 chart API with 1 day range to get current quote data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m&includePrePost=false`
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 30 },
    })

    if (!response.ok) {
      throw new Error("Yahoo Finance API error")
    }

    const data = await response.json()
    const result = data?.chart?.result?.[0]
    const meta = result?.meta

    if (!meta) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 })
    }

    // Extract quote data from meta and indicators
    const quote = result.indicators?.quote?.[0] || {}
    const closes = quote.close?.filter((c: number | null) => c !== null) || []
    const highs = quote.high?.filter((h: number | null) => h !== null) || []
    const lows = quote.low?.filter((l: number | null) => l !== null) || []
    const volumes = quote.volume?.filter((v: number | null) => v !== null) || []

    const currentPrice = meta.regularMarketPrice || meta.chartPreviousClose || 0
    const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

    // Ensure numeric values are not NaN
    const safeCurrentPrice = isNaN(currentPrice) ? 0 : currentPrice
    const safePreviousClose = isNaN(previousClose) ? safeCurrentPrice : previousClose
    const safeChange = safeCurrentPrice - safePreviousClose
    const safeChangePercent = safePreviousClose > 0 ? (safeChange / safePreviousClose) * 100 : 0

    return NextResponse.json({
      symbol: meta.symbol,
      shortName: meta.shortName || meta.symbol,
      longName: meta.longName || meta.shortName || meta.symbol,
      regularMarketPrice: safeCurrentPrice,
      regularMarketChange: safeChange,
      regularMarketChangePercent: safeChangePercent,
      regularMarketPreviousClose: safePreviousClose,
      regularMarketOpen: isNaN(meta.regularMarketOpen) ? 0 : meta.regularMarketOpen || 0,
      regularMarketDayHigh: isNaN(meta.regularMarketDayHigh) ? Math.max(...highs, 0) : meta.regularMarketDayHigh || Math.max(...highs, 0),
      regularMarketDayLow: isNaN(meta.regularMarketDayLow) ? Math.min(...lows.filter((l: number) => l > 0), safeCurrentPrice) : meta.regularMarketDayLow || Math.min(...lows.filter((l: number) => l > 0), safeCurrentPrice),
      regularMarketVolume: isNaN(meta.regularMarketVolume) ? volumes.reduce((a: number, b: number) => a + b, 0) : meta.regularMarketVolume || volumes.reduce((a: number, b: number) => a + b, 0),
      marketCap: meta.marketCap,
      fiftyTwoWeekHigh: isNaN(meta.fiftyTwoWeekHigh) ? 0 : meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: isNaN(meta.fiftyTwoWeekLow) ? 0 : meta.fiftyTwoWeekLow || 0,
      averageVolume: meta.averageDailyVolume10Day,
      currency: meta.currency || (meta.symbol.endsWith(".NS") || meta.symbol.endsWith(".BO") ? "INR" : "USD"),
    })
  } catch (error) {
    console.error("Quote fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 })
  }
}
