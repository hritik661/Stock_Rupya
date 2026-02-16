"use client"

import { useState, useEffect } from "react"
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react"

interface TickerSymbol {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  icon?: string
}

export function MarketTicker() {
  const [tickers, setTickers] = useState<TickerSymbol[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const symbols = [
          "^BSESN",      // SENSEX
          "^NSEI",       // NIFTY 50
          "^NSEBANK",    // BANK NIFTY
          "RELIANCE.NS", // Major stock
          "ADANIENT.NS", // Major stock
          "HDFCBANK.NS", // Major stock
          "INFY.NS",     // Tech
        ]

        const response = await fetch(
          `/api/stock/quotes?symbols=${symbols.join(",")}`
        )
        const data = await response.json()

        const formattedTickers = symbols.map((symbol) => {
          const quote = data[symbol] || {}
          const change = (quote.currentPrice || 0) - (quote.previousClose || quote.currentPrice || 0)
          const changePercent = quote.previousClose ? (change / quote.previousClose) * 100 : 0

          return {
            symbol,
            name: quote.longName?.split(" ")[0] || symbol.replace(".NS", ""),
            price: quote.currentPrice || 0,
            change,
            changePercent,
          }
        })

        setTickers(formattedTickers)
      } catch (error) {
        console.error("Error fetching ticker data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTickers()
    const interval = setInterval(fetchTickers, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="w-full h-14 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg animate-pulse border border-border/20" />
    )
  }

  return (
    <div className="w-full bg-gradient-to-r from-primary/5 via-card/50 to-accent/5 border border-primary/10 rounded-lg overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 md:gap-4 px-3 md:px-4 py-3 md:py-4 min-w-min">
        {tickers.map((ticker) => {
          const isPositive = ticker.changePercent >= 0
          return (
            <div
              key={ticker.symbol}
              className="flex-shrink-0 flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-card/60 border border-border/30 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex flex-col gap-0.5 min-w-fit">
                <p className="text-xs md:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {ticker.name}
                </p>
                <p className={`text-xs md:text-sm font-semibold ${isPositive ? "text-emerald-400" : "text-red-500"}`}>
                  ₹{ticker.price.toFixed(2)}
                </p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${isPositive ? "bg-emerald-700/25" : "bg-red-500/10"}`}>
                {isPositive ? (
                  <ArrowUpIcon className="h-3 md:h-4 w-3 md:w-4 text-emerald-400" />
                ) : (
                  <ArrowDownIcon className="h-3 md:h-4 w-3 md:w-4 text-red-500" />
                )}
                <span className={`text-xs md:text-sm font-bold ${isPositive ? "text-emerald-400" : "text-red-500"}`}>
                  {ticker.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
