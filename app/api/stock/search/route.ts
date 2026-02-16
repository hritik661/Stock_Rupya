import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 })
  }

  try {
    // Use Yahoo Finance search API - fuzzy enabled to find more matches
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=50&newsCount=0&enableFuzzyQuery=true`
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    })

    if (!response.ok) {
      throw new Error("Yahoo Finance API error")
    }

    const data = await response.json()
    const quotes = data?.quotes || []

    // Filter results and format them
    const validResults = []
    
    for (const q of quotes) {
      // Skip if not a stock quote
      if (q.quoteType !== 'EQUITY' && q.quoteType !== 'ETF') {
        continue
      }

      let symbol = q.symbol || ''
      let valid = false

      // First, try with the symbol as-is
      if (symbol && (symbol.includes('.NS') || symbol.includes('.BO') || symbol.includes('.') === false)) {
        valid = true
      }

      // If not valid and Indian stock, try adding .NS
      if (!valid && symbol && !symbol.includes('.') && q.exchange === 'NSE') {
        symbol = symbol + '.NS'
        valid = true
      }

      // If still not valid, try with .BO for BSE
      if (!valid && symbol && !symbol.includes('.') && q.exchange === 'BSE') {
        symbol = symbol + '.BO'
        valid = true
      }

      // Accept any result with a valid symbol and name
      if (valid || (symbol && (q.shortname || q.longname))) {
        validResults.push({
          symbol,
          name: q.shortname || q.longname || symbol,
          exchange: q.exchange,
          type: q.quoteType,
        })
      }
    }

    // Limit results to top 25
    return NextResponse.json(validResults.slice(0, 25))
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json([], { status: 500 })
  }
}
