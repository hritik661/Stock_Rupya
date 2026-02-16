import { type NextRequest, NextResponse } from "next/server"

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60000 // 1 minute for ultra-fast updates (was 5 minutes)

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") // 'gainers' or 'losers'
  const count = parseInt(request.nextUrl.searchParams.get("count") || request.nextUrl.searchParams.get("limit") || "20")

  if (!type || !["gainers", "losers"].includes(type)) {
    return NextResponse.json({ error: "Type must be 'gainers' or 'losers'" }, { status: 400 })
  }

  const cacheKey = `${type}_${count}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    // Return with aggressive cache headers
    const response = NextResponse.json(cached.data)
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    response.headers.set('CDN-Cache-Control', 'max-age=60')
    return response
  }

  try {
    // Yahoo Finance gainers/losers URLs
    const urls = {
      gainers: "https://finance.yahoo.com/markets/stocks/gainers/",
      losers: "https://finance.yahoo.com/markets/stocks/losers/"
    }

    const url = urls[type as keyof typeof urls]

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${type} data`)
    }

    const html = await response.text()

    // Extract stock data from the HTML
    // This is a simplified approach - in production you'd want more robust parsing
    const stocks = extractStocksFromHTML(html, count)

    // If HTML parsing fails, fallback to a predefined list of Indian stocks
    let dataToReturn = stocks
    if (stocks.length === 0) {
      dataToReturn = await getFallbackIndianStocks(type, count)
    }

    const responseData = { 
      gainers: type === 'gainers' ? dataToReturn : [],
      losers: type === 'losers' ? dataToReturn : [],
      [type]: dataToReturn
    }
    cache.set(cacheKey, { data: dataToReturn, timestamp: Date.now() })
    return NextResponse.json(responseData)

  } catch (error) {
    console.error(`Error fetching ${type}:`, error)

    // Fallback to predefined Indian stocks
    const fallbackStocks = await getFallbackIndianStocks(type, count)
    const responseData = { 
      gainers: type === 'gainers' ? fallbackStocks : [],
      losers: type === 'losers' ? fallbackStocks : [],
      [type]: fallbackStocks
    }
    cache.set(cacheKey, { data: fallbackStocks, timestamp: Date.now() })
    return NextResponse.json(responseData)
  }
}

function extractStocksFromHTML(html: string, count: number) {
  const stocks = []

  try {
    // Look for JSON data in the HTML (Yahoo Finance embeds data)
    const jsonMatch = html.match(/root\.App\.main\s*=\s*({.+?});/)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1])
      const quotes = data?.context?.dispatcher?.stores?.QuoteSummaryStore?.quoteSummary?.result || []

      for (const quote of quotes.slice(0, count)) {
        if (quote.symbol && quote.symbol.includes('.NS')) { // Only Indian stocks
          stocks.push({
            symbol: quote.symbol,
            shortName: quote.shortName || quote.longName || '',
            longName: quote.longName || quote.shortName || '',
            regularMarketPrice: quote.regularMarketPrice || 0,
            regularMarketChange: quote.regularMarketChange || 0,
            regularMarketChangePercent: quote.regularMarketChangePercent || 0,
            regularMarketPreviousClose: quote.regularMarketPreviousClose || 0,
            regularMarketOpen: quote.regularMarketOpen || 0,
            regularMarketDayHigh: quote.regularMarketDayHigh || 0,
            regularMarketDayLow: quote.regularMarketDayLow || 0,
            regularMarketVolume: quote.regularMarketVolume || 0,
            marketCap: quote.marketCap || 0,
            fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
            currency: quote.currency || 'INR'
          })
        }
      }
    }
  } catch (error) {
    console.error('Error parsing HTML:', error)
  }

  return stocks
}

async function getFallbackIndianStocks(type: string, count: number) {
  // Fallback: Get Indian stocks and sort by change
  const { INDIAN_STOCKS } = await import("@/lib/stocks-data")
  // Consider all Indian stocks so newly added symbols are included
  const symbols = INDIAN_STOCKS.map(s => s.symbol)

  try {
    const { fetchMultipleQuotes } = await import("@/lib/yahoo-finance")
    const quotes = await fetchMultipleQuotes(symbols)

    // Sort by change percent
    const sorted = quotes.sort((a, b) => {
      const aChange = a.regularMarketChangePercent || 0
      const bChange = b.regularMarketChangePercent || 0
      return type === 'gainers' ? bChange - aChange : aChange - bChange
    })

    // Filter for the requested type and limit
    const filtered = sorted.filter(quote => {
      const change = quote.regularMarketChangePercent || 0
      return type === 'gainers' ? change > 0 : change < 0
    }).slice(0, count)

    return filtered
  } catch (error) {
    console.error('Fallback failed:', error)
    return []
  }
}
