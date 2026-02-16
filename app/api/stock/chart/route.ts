import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")
  const period1 = request.nextUrl.searchParams.get("period1")
  const period2 = request.nextUrl.searchParams.get("period2")
  const interval = request.nextUrl.searchParams.get("interval")

  if (!symbol || !period1 || !period2 || !interval) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=${interval}`
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      throw new Error("Yahoo Finance API error")
    }

    const data = await response.json()
    const result = data?.chart?.result?.[0]

    if (!result) {
      return NextResponse.json([], { status: 404 })
    }

    const timestamps = result.timestamp || []
    const quote = result.indicators?.quote?.[0] || {}
    const meta = result.meta
    const isCrypto = symbol.includes("BTC") || meta?.quoteType === "CRYPTOCURRENCY"
    const multiplier = isCrypto ? 88 : 1

    const chartData = timestamps
      .map((timestamp: number, index: number) => ({
        timestamp,
        open: (quote.open?.[index] || 0) * multiplier,
        high: (quote.high?.[index] || 0) * multiplier,
        low: (quote.low?.[index] || 0) * multiplier,
        close: (quote.close?.[index] || 0) * multiplier,
        volume: quote.volume?.[index] || 0,
      }))
      .filter((d: { close: number }) => d.close > 0)

    // Filter for Indian market hours (9:15 AM to 3:30 PM IST) for 1D charts
    let filteredData = chartData
    if (interval === "5m" && !isCrypto && !symbol.includes("GC=F") && !symbol.includes("SI=F")) {
      filteredData = chartData.filter((d: { timestamp: number }) => {
        const date = new Date(d.timestamp * 1000)
        // Convert to IST (UTC+5:30)
        const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000))
        const hours = istTime.getHours()
        const minutes = istTime.getMinutes()
        const totalMinutes = hours * 60 + minutes
        
        // Market hours: 9:15 AM (555 minutes) to 3:30 PM (930 minutes)
        return totalMinutes >= 555 && totalMinutes <= 930
      })
    }

    return NextResponse.json(filteredData)
  } catch (error) {
    console.error("Chart fetch error:", error)
    return NextResponse.json([], { status: 500 })
  }
}
