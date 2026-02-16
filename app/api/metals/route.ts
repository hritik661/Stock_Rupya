import { NextResponse } from "next/server"

// USD to INR exchange rate - fetch real rate from Yahoo Finance
async function getUSDINRRate(): Promise<number> {
  try {
    const response = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X?interval=1d&range=1d", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 300 },
    })
    const data = await response.json()
    const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice
    return rate || 83.5 // Fallback rate
  } catch {
    return 83.5 // Fallback rate
  }
}

// Fetch gold price from Yahoo Finance (per troy ounce in USD)
async function fetchGoldPrice() {
  try {
    const response = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=5d", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 300 },
    })
    const data = await response.json()
    const result = data?.chart?.result?.[0]
    const meta = result?.meta
    const quote = result?.indicators?.quote?.[0]

    const currentPrice = meta?.regularMarketPrice || 2650
    const previousClose = meta?.chartPreviousClose || meta?.previousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = (change / previousClose) * 100

    return {
      priceUSD: currentPrice, // Price per troy ounce
      change,
      changePercent,
      historicalData: quote,
    }
  } catch (error) {
    console.error("Error fetching gold price:", error)
    return {
      priceUSD: 2650,
      change: 5,
      changePercent: 0.19,
      historicalData: null,
    }
  }
}

// Fetch silver price from Yahoo Finance (per troy ounce in USD)
async function fetchSilverPrice() {
  try {
    const response = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/SI=F?interval=1d&range=5d", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 300 },
    })
    const data = await response.json()
    const result = data?.chart?.result?.[0]
    const meta = result?.meta
    const quote = result?.indicators?.quote?.[0]

    const currentPrice = meta?.regularMarketPrice || 31
    const previousClose = meta?.chartPreviousClose || meta?.previousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = (change / previousClose) * 100

    return {
      priceUSD: currentPrice, // Price per troy ounce
      change,
      changePercent,
      historicalData: quote,
    }
  } catch (error) {
    console.error("Error fetching silver price:", error)
    return {
      priceUSD: 31,
      change: -0.2,
      changePercent: -0.64,
      historicalData: null,
    }
  }
}

// Gold: USD/oz → INR/10g (1 troy oz = 31.1035g, so 10g = 10/31.1035 oz)
// Silver: USD/oz → INR/1kg (1 troy oz = 31.1035g, so 1kg = 1000g = 1000/31.1035 oz ≈ 32.1507 oz)
function convertToIndianUnits(pricePerOunceUSD: number, usdInrRate: number, metalType: "gold" | "silver") {
  if (metalType === "gold") {
    // Convert to INR per 10 grams
    // Price per gram = pricePerOunceUSD / 31.1035
    // Price per 10g = (pricePerOunceUSD / 31.1035) * 10
    const price10gUSD = (pricePerOunceUSD / 31.1035) * 10
    const price10gINR = price10gUSD * usdInrRate
    return {
      pricePer10g: price10gINR,
      displayPrice: Math.round(price10gINR),
    }
  } else {
    // Convert to INR per 1 kilogram
    // 1 kg = 1000 grams = 1000 / 31.1035 troy ounces
    const ouncesPerKg = 1000 / 31.1035
    const pricePerKgUSD = pricePerOunceUSD * ouncesPerKg
    const pricePerKgINR = pricePerKgUSD * usdInrRate
    return {
      pricePerKg: pricePerKgINR,
      displayPrice: Math.round(pricePerKgINR),
    }
  }
}

export async function GET() {
  try {
    // Fetch all data in parallel
    const [goldData, silverData, usdInrRate] = await Promise.all([
      fetchGoldPrice(),
      fetchSilverPrice(),
      getUSDINRRate(),
    ])

    const goldINR = convertToIndianUnits(goldData.priceUSD, usdInrRate, "gold")
    const silverINR = convertToIndianUnits(silverData.priceUSD, usdInrRate, "silver")

    const goldChangeINR = (goldData.change / 31.1035) * 10 * usdInrRate
    const silverChangeINR = ((silverData.change * 1000) / 31.1035) * usdInrRate

    return NextResponse.json({
      gold: {
        // 10g price (24K and 22K without making charges)
        price24k: Math.round(goldINR.pricePer10g),
        price22k: Math.round(goldINR.pricePer10g * 0.916), // 22K is 91.6% pure
        priceUSD: goldData.priceUSD,
        unit: "10g",
        change: Math.round(goldChangeINR),
        changePercent: goldData.changePercent,
        usdInrRate,
      },
      silver: {
        price: Math.round(silverINR.pricePerKg),
        priceUSD: silverData.priceUSD,
        unit: "1kg",
        change: Math.round(silverChangeINR),
        changePercent: silverData.changePercent,
        usdInrRate,
      },
      exchangeRate: usdInrRate,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in metals API:", error)
    // Return fallback prices
    return NextResponse.json({
      gold: {
        price24k: 78500,
        price22k: 71900,
        priceUSD: 2650,
        unit: "10g",
        change: 150,
        changePercent: 0.19,
        usdInrRate: 83.5,
      },
      silver: {
        price: 95000,
        priceUSD: 31,
        unit: "1kg",
        change: -500,
        changePercent: -0.52,
        usdInrRate: 83.5,
      },
      exchangeRate: 83.5,
      lastUpdated: new Date().toISOString(),
    })
  }
}
