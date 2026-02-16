import { NextResponse } from "next/server"

interface YahooNewsItem {
  title: string
  link: string
  pubDate: string
  description: string
}

// Indian stock tickers and their display names
const INDIAN_STOCKS = {
  "RELIANCE.NS": { name: "Reliance Industries", keywords: ["Reliance", "RIL", "Mukesh Ambani"] },
  "TCS.NS": { name: "Tata Consultancy Services", keywords: ["TCS", "Tata Consultancy"] },
  "HDFCBANK.NS": { name: "HDFC Bank", keywords: ["HDFC Bank", "HDFC"] },
  "INFY.NS": { name: "Infosys", keywords: ["Infosys", "INFY"] },
  "ICICIBANK.NS": { name: "ICICI Bank", keywords: ["ICICI Bank", "ICICI"] },
  "SBIN.NS": { name: "State Bank of India", keywords: ["SBI", "State Bank"] },
  "BHARTIARTL.NS": { name: "Bharti Airtel", keywords: ["Airtel", "Bharti Airtel"] },
  "ITC.NS": { name: "ITC Limited", keywords: ["ITC"] },
  "TATAMOTORS.NS": { name: "Tata Motors", keywords: ["Tata Motors", "Tata EV"] },
  "WIPRO.NS": { name: "Wipro", keywords: ["Wipro"] },
  "SUNPHARMA.NS": { name: "Sun Pharma", keywords: ["Sun Pharma", "Sun Pharmaceutical"] },
  "ADANIENT.NS": { name: "Adani Enterprises", keywords: ["Adani", "Adani Group"] },
  "KOTAKBANK.NS": { name: "Kotak Mahindra Bank", keywords: ["Kotak", "Kotak Bank"] },
  "TATASTEEL.NS": { name: "Tata Steel", keywords: ["Tata Steel"] },
  "AXISBANK.NS": { name: "Axis Bank", keywords: ["Axis Bank"] },
}

function detectRelatedStocks(text: string): string[] {
  const relatedStocks: string[] = []
  const upperText = text.toUpperCase()

  for (const [ticker, info] of Object.entries(INDIAN_STOCKS)) {
    for (const keyword of info.keywords) {
      if (upperText.includes(keyword.toUpperCase())) {
        if (!relatedStocks.includes(ticker)) {
          relatedStocks.push(ticker)
        }
        break
      }
    }
  }

  return relatedStocks
}

function detectSentiment(text: string): "positive" | "negative" | "neutral" {
  const positiveWords = [
    "surge",
    "rally",
    "gain",
    "profit",
    "growth",
    "rise",
    "up",
    "beat",
    "strong",
    "positive",
    "bullish",
    "outperform",
    "buy",
    "upgrade",
  ]
  const negativeWords = [
    "fall",
    "drop",
    "decline",
    "loss",
    "down",
    "weak",
    "negative",
    "bearish",
    "underperform",
    "sell",
    "downgrade",
    "crash",
    "slump",
  ]

  const lowerText = text.toLowerCase()
  let positiveScore = 0
  let negativeScore = 0

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) positiveScore++
  })

  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) negativeScore++
  })

  if (positiveScore > negativeScore) return "positive"
  if (negativeScore > positiveScore) return "negative"
  return "neutral"
}

function generateBuyRecommendation(sentiment: string, relatedStocks: string[]): string | null {
  if (sentiment === "positive" && relatedStocks.length > 0) {
    const stock = relatedStocks[0].replace(".NS", "")
    const recommendations = [
      `Consider buying ${stock} - Strong positive momentum`,
      `${stock} looks promising for long-term investment`,
      `Bullish signal for ${stock} - Good entry point`,
      `${stock} showing strength - Add to watchlist`,
    ]
    return recommendations[Math.floor(Math.random() * recommendations.length)]
  }
  return null
}

export async function GET() {
  try {
    // Fetch real news from Yahoo Finance India
    const yahooNewsUrl = "https://feeds.finance.yahoo.com/rss/2.0/headline"

    const allNews: any[] = []

    try {
      const response = await fetch(yahooNewsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      })

      if (response.ok) {
        const xml = await response.text()

        // Parse RSS XML for real Yahoo Finance news
        const titleMatches = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g) || []
        const linkMatches = xml.match(/<link>(.*?)<\/link>/g) || []
        const descMatches =
          xml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/g) || []
        const dateMatches = xml.match(/<pubDate>(.*?)<\/pubDate>/g) || []

        // Get today's date for filtering
        const today = new Date()
        const todayString = today.toISOString().split('T')[0]

        for (let i = 1; i < Math.min(titleMatches.length, 20); i++) {
          const title = titleMatches[i]?.replace(/<\/?title>|<!\[CDATA\[|\]\]>/g, "").trim()
          const link = linkMatches[i]?.replace(/<\/?link>/g, "").trim()
          const desc = descMatches[i]?.replace(/<\/?description>|<!\[CDATA\[|\]\]>/g, "").trim()
          const pubDate = dateMatches[i - 1]?.replace(/<\/?pubDate>/g, "").trim()

          if (title && link && title !== "Yahoo Finance") {
            // Filter for Indian market news
            const isIndianNews = title.toLowerCase().includes('india') || 
                                title.toLowerCase().includes('nse') || 
                                title.toLowerCase().includes('bse') || 
                                desc?.toLowerCase().includes('india') ||
                                desc?.toLowerCase().includes('indian')

            if (isIndianNews) {
              const relatedStocks = detectRelatedStocks(title + " " + (desc || ""))
              const sentiment = detectSentiment(title + " " + (desc || ""))

              allNews.push({
                id: `yahoo-${i}`,
                title,
                summary: desc || title,
                source: "Yahoo Finance",
                publishedAt: pubDate || new Date().toISOString(),
                url: link,
                sentiment,
                relatedStocks: relatedStocks.length > 0 ? relatedStocks : ["^NSEI"],
                recommendation: relatedStocks.length > 0 ? generateBuyRecommendation(sentiment, relatedStocks) : null,
              })
            }
          }
        }
      }
    } catch (rssError) {
      console.log("RSS fetch failed, trying alternative method")
    }

    // If we got news from RSS, return it
    if (allNews.length >= 5) {
      return NextResponse.json(allNews.slice(0, 10), {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=900",
        },
      })
    }

    // Fallback: Try to fetch from Yahoo Finance news page directly
    try {
      const newsResponse = await fetch("https://finance.yahoo.com/news/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        next: { revalidate: 300 },
      })

      if (newsResponse.ok) {
        const html = await newsResponse.text()

        // Extract news items from the HTML (simplified parsing)
        const newsItems: any[] = []
        const today = new Date()
        const todayString = today.toISOString().split('T')[0]

        // Look for news headlines in the HTML
        const headlineRegex = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi
        const linkRegex = /href="([^"]*finance\.yahoo\.com\/news[^"]*)"/gi

        const headlines: string[] = []
        const links: string[] = []

        let match
        while ((match = headlineRegex.exec(html)) !== null && headlines.length < 10) {
          const headline = match[1].trim()
          if (headline.length > 20 && !headline.includes("Yahoo") && !headline.includes("Finance")) {
            headlines.push(headline)
          }
        }

        while ((match = linkRegex.exec(html)) !== null && links.length < 10) {
          links.push(match[1])
        }

        for (let i = 0; i < Math.min(headlines.length, links.length, 10); i++) {
          const title = headlines[i]
          const url = links[i] || `https://finance.yahoo.com/news/`

          if (title) {
            const relatedStocks = detectRelatedStocks(title)
            const sentiment = detectSentiment(title)

            newsItems.push({
              id: `yahoo-page-${i}`,
              title,
              summary: `${title} - Latest market news from Yahoo Finance.`,
              source: "Yahoo Finance",
              publishedAt: new Date().toISOString(),
              url,
              sentiment,
              relatedStocks: relatedStocks.length > 0 ? relatedStocks : ["^NSEI"],
              recommendation: relatedStocks.length > 0 ? generateBuyRecommendation(sentiment, relatedStocks) : null,
            })
          }
        }

        if (newsItems.length > 0) {
          return NextResponse.json(newsItems, {
            headers: {
              "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=900",
            },
          })
        }
      }
    } catch (pageError) {
      console.log("Page scraping failed, using fallback news")
    }

    // If all methods fail, return a message about news unavailability
    return NextResponse.json([{
      id: "no-news",
      title: "Market News Currently Unavailable",
      summary: "We're currently unable to fetch the latest market news. Please check back later for real-time updates from Yahoo Finance.",
      source: "System Message",
      publishedAt: new Date().toISOString(),
      url: "https://finance.yahoo.com",
      sentiment: "neutral" as const,
      relatedStocks: [],
      recommendation: null,
    }], {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=150",
      },
    })
  } catch (error) {
    console.error("Error in news API:", error)
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 })
  }
}
