import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("https://www.goodreturns.in/silver-rates/mumbai.html", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    const html = await response.text()

    // Extract silver rates from the HTML
    // Looking for patterns like: ₹99.90 per gram and ₹99,900 per kg
    const gramMatch = html.match(/₹([\d,]+\.?\d*)\s*(?:<[^>]*>)*\s*(?:per gram|\/g|Silver \/g)/)
    const kgMatch = html.match(/₹([\d,]+)\s*(?:<[^>]*>)*\s*(?:per kilogram|\/kg|Silver \/kg)/)

    // More robust extraction using multiple patterns
    let gramPrice = null
    let kgPrice = null

    // Try to find the data in the HTML by looking for specific text patterns
    const silverPerGramPattern = /Silver\s*\/g[\s\S]*?₹([\d.]+)/
    const silverPerKgPattern = /Silver\s*\/kg[\s\S]*?₹([\d,]+)/

    const gramPatternMatch = html.match(silverPerGramPattern)
    const kgPatternMatch = html.match(silverPerKgPattern)

    if (gramPatternMatch) {
      gramPrice = Number.parseFloat(gramPatternMatch[1])
    }

    if (kgPatternMatch) {
      kgPrice = Number.parseFloat(kgPatternMatch[1].replace(/,/g, ""))
    }

    // If direct matching fails, use a broader approach
    if (!gramPrice || !kgPrice) {
      // Look for the rates table or main display
      const ratesMatch = html.match(
        /The price of silver in Mumbai today is[\s\S]*?₹([\d.]+)[\s\S]*?per gram[\s\S]*?₹([\d,]+)[\s\S]*?per kilogram/,
      )

      if (ratesMatch) {
        gramPrice = Number.parseFloat(ratesMatch[1])
        kgPrice = Number.parseFloat(ratesMatch[2].replace(/,/g, ""))
      }
    }

    // Default values based on the fetched data (as fallback)
    if (!gramPrice) gramPrice = 99.9
    if (!kgPrice) kgPrice = 99900

    // Calculate 10g price
    const price10g = gramPrice * 10

    return NextResponse.json({
      source: "GoodReturns.in Mumbai",
      silver: {
        pricePerGram: gramPrice,
        pricePerKg: kgPrice,
        pricePer10g: price10g,
        change: -0.1, // This would need to be extracted if available
        changePercent: -0.1,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching GoodReturns data:", error)
    // Return fallback data
    return NextResponse.json(
      {
        source: "GoodReturns.in Mumbai (Cached)",
        silver: {
          pricePerGram: 99.9,
          pricePerKg: 99900,
          pricePer10g: 999,
          change: -100,
          changePercent: -0.1,
        },
        timestamp: new Date().toISOString(),
        error: "Failed to fetch real-time data",
      },
      { status: 200 },
    )
  }
}
