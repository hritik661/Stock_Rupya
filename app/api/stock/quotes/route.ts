import { type NextRequest, NextResponse } from "next/server"

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 45000 // 45 seconds for faster refresh

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols")

  if (!symbols) {
    return NextResponse.json({ error: "Symbols are required" }, { status: 400 })
  }

  const symbolList = symbols.split(",").slice(0, 100) // Allow up to 100 symbols
  const cacheKey = symbolList.sort().join(",")

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    // Return cached response with caching headers
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=45',
        'CDN-Cache-Control': 'max-age=45',
      }
    })
  }

  try {
    const quotes = await Promise.all(
      symbolList.map(async (symbol, index) => {
        // Reduced delay for parallel fetching
        await new Promise((resolve) => setTimeout(resolve, index * 50))

        try {
          const cleanSymbol = symbol.trim().toUpperCase()
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}?range=1d&interval=1m&includePrePost=false&events=div%7Csplit`

          let response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0",
              Accept: "application/json",
            },
          })

          if (!response.ok) {
            const backupUrl = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(cleanSymbol)}&range=1d&interval=1m`
            response = await fetch(backupUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0",
                Accept: "application/json",
              },
            })

            if (!response.ok) return null

            const backupData = await response.json()
            const sparkResult = backupData?.spark?.result?.[0]?.response?.[0]
            if (!sparkResult?.meta) return null

            const currentPrice = meta.regularMarketPrice || closes[closes.length - 1] || 0
            const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice

            const safeCurrentPrice = isNaN(currentPrice) ? 0 : currentPrice
            const safePreviousClose = isNaN(previousClose) ? safeCurrentPrice : previousClose

            return {
              symbol: meta.symbol,
              shortName: meta.symbol,
              longName: meta.symbol,
              regularMarketPrice: safeCurrentPrice,
              regularMarketChange: safeCurrentPrice - safePreviousClose,
              regularMarketChangePercent:
                safePreviousClose > 0 ? ((safeCurrentPrice - safePreviousClose) / safePreviousClose) * 100 : 0,
              regularMarketPreviousClose: safePreviousClose,
              regularMarketOpen: isNaN(meta.regularMarketOpen) ? 0 : meta.regularMarketOpen || 0,
              regularMarketDayHigh: isNaN(meta.regularMarketDayHigh) ? 0 : meta.regularMarketDayHigh || 0,
              regularMarketDayLow: isNaN(meta.regularMarketDayLow) ? 0 : meta.regularMarketDayLow || 0,
              regularMarketVolume: isNaN(meta.regularMarketVolume) ? 0 : meta.regularMarketVolume || 0,
              marketCap: meta.marketCap,
              fiftyTwoWeekHigh: isNaN(meta.fiftyTwoWeekHigh) ? 0 : meta.fiftyTwoWeekHigh || 0,
              fiftyTwoWeekLow: isNaN(meta.fiftyTwoWeekLow) ? 0 : meta.fiftyTwoWeekLow || 0,
              averageVolume: meta.averageDailyVolume10Day,
              currency: meta.currency || "INR",
            }
          }
          const data = await response.json()
          const result = data?.chart?.result?.[0]
          const meta = result?.meta

          if (!meta) return null

          const quote = result.indicators?.quote?.[0] || {}
          const closes = quote.close?.filter((c: number | null) => c !== null) || []
          const currentPrice = meta.regularMarketPrice || closes[closes.length - 1] || 0
          const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice
          const change = currentPrice - previousClose
          const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

          // Ensure numeric values are not NaN
          const safeCurrentPrice = isNaN(currentPrice) ? 0 : currentPrice
          const safePreviousClose = isNaN(previousClose) ? safeCurrentPrice : previousClose
          const safeChange = safeCurrentPrice - safePreviousClose
          const safeChangePercent = safePreviousClose > 0 ? (safeChange / safePreviousClose) * 100 : 0

          return {
            symbol: meta.symbol,
            shortName: meta.shortName || meta.symbol,
            longName: meta.longName || meta.shortName,
            regularMarketPrice: safeCurrentPrice,
            regularMarketChange: safeChange,
            regularMarketChangePercent: safeChangePercent,
            regularMarketPreviousClose: safePreviousClose,
            regularMarketOpen: isNaN(meta.regularMarketOpen) ? 0 : meta.regularMarketOpen || 0,
            regularMarketDayHigh: isNaN(meta.regularMarketDayHigh) ? 0 : meta.regularMarketDayHigh || 0,
            regularMarketDayLow: isNaN(meta.regularMarketDayLow) ? 0 : meta.regularMarketDayLow || 0,
            regularMarketVolume: isNaN(meta.regularMarketVolume) ? 0 : meta.regularMarketVolume || 0,
            marketCap: meta.marketCap,
            fiftyTwoWeekHigh: isNaN(meta.fiftyTwoWeekHigh) ? 0 : meta.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: isNaN(meta.fiftyTwoWeekLow) ? 0 : meta.fiftyTwoWeekLow || 0,
            averageVolume: meta.averageDailyVolume10Day,
            currency: meta.currency || "INR",
          }
        } catch (error) {
          console.error(`[v0] Error fetching ${symbol}:`, error)
          return null
        }
      }),
    )

    const validQuotes = quotes.filter((q) => q !== null)

    cache.set(cacheKey, { data: validQuotes, timestamp: Date.now() })

    return NextResponse.json(validQuotes, {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=45',
        'CDN-Cache-Control': 'max-age=45',
      }
    })
  } catch (error) {
    console.error("[v0] Quotes fetch error:", error)
    return NextResponse.json([], { status: 500 })
  }
}
