"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { INDICES } from "@/lib/stocks-data"
import { fetchMultipleQuotes, type StockQuote } from "@/lib/yahoo-finance"
import { formatPercentage } from "@/lib/market-utils"
import { LogoImage } from "./logo-image"
import { cn } from "@/lib/utils"

interface MetalPrices {
  gold: {
    price24k: number
    price22k: number
    priceUSD: number
    unit: string
    change: number
    changePercent: number
  }
  silver: {
    price: number
    priceUSD: number
    unit: string
    change: number
    changePercent: number
  }
  exchangeRate: number
}

export function IndicesTicker() {
  const { user } = useAuth()
  const [indices, setIndices] = useState<StockQuote[]>([])
  const [metalPrices, setMetalPrices] = useState<MetalPrices | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchIndices = async () => {
      const regularIndices = INDICES.filter((i) => i.symbol !== "GC=F" && i.symbol !== "SI=F")
      const symbols = regularIndices.map((i) => i.symbol)
      const data = await fetchMultipleQuotes(symbols)
      setIndices(data)

      try {
        const metalResponse = await fetch("/api/metals")
        const metalData = await metalResponse.json()
        setMetalPrices(metalData)
      } catch (error) {
        console.error("Error fetching metal prices:", error)
      }

      setLoading(false)
    }

    fetchIndices()
    const interval = setInterval(fetchIndices, 15000)

    return () => {
      clearInterval(interval)
    }
  }, [user])

  if (!user) return null

  const formatPrice = (price: number, symbol: string, currency?: string) => {
    // US indices (S&P 500, Dow 30, Russell 2000, Nasdaq)
    if (symbol === "^GSPC" || symbol === "^DJI" || symbol === "^RUT" || symbol === "^IXIC") {
      return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    }
    // Nikkei
    if (symbol === "^N225") {
      return `¥${price.toLocaleString("en-JP", { maximumFractionDigits: 0 })}`
    }
    // Crude Oil
    if (symbol === "CL=F") {
      return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    // Indian indices and BTC-INR
    if (
      currency === "INR" ||
      symbol.includes(".NS") ||
      symbol === "^BSESN" ||
      symbol === "^NSEI" ||
      symbol === "^NSEBANK" ||
      symbol === "^CNXIT" ||
      symbol === "BTC-INR"
    ) {
      return `₹${price.toLocaleString("en-IN", { maximumFractionDigits: price > 1000 ? 0 : 2 })}`
    }
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <div className="border-b border-border bg-card/50 py-2">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="flex items-center gap-2 animate-pulse">
                <div className="h-3 w-16 bg-secondary rounded" />
                <div className="h-3 w-12 bg-secondary rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Move gold (GC=F) and silver (SI=F) to the end of the ticker order
  const reorderedIndices = [
    ...INDICES.filter((i) => i.symbol !== "GC=F" && i.symbol !== "SI=F"),
    ...INDICES.filter((i) => i.symbol === "GC=F" || i.symbol === "SI=F"),
  ]

  return (
    <div className="border-b border-border bg-card/50 py-2 overflow-hidden indices-ticker-mobile">
      <div className="container mx-auto px-4">
        <div className="flex animate-scroll-horizontal gap-3 md:gap-4 overflow-x-auto">
          {/* First set of indices */}
          {reorderedIndices.map((indexInfo) => {
            if (indexInfo.symbol === "GC=F" && metalPrices) {
              const isPositive = metalPrices.gold.changePercent >= 0
              return (
                <Link
                  key={indexInfo.symbol}
                  href={`/metal/gold`}
                  className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded-lg transition-all bg-amber-500/5"
                >
                  <div className="flex items-center gap-2">
                    <LogoImage
                      symbol={indexInfo.symbol}
                      name={indexInfo.name}
                      size={56}
                      alt={indexInfo.name}
                      className="h-6 w-6 rounded-md flex-shrink-0 object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-[8px] uppercase tracking-widest text-muted-foreground">
                        {indexInfo.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-xs">
                          ₹{metalPrices.gold.price24k.toLocaleString("en-IN")}
                        </span>
                        <span
                          className={cn(
                            "ticker-change flex items-center font-bold px-1 py-0.5 rounded bg-secondary/50 text-[10px]",
                            isPositive ? "text-primary" : "text-destructive",
                          )}
                        >
                          {isPositive ? "▲" : "▼"}
                          {formatPercentage(Math.abs(metalPrices.gold.changePercent))}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            }

            if (indexInfo.symbol === "SI=F" && metalPrices) {
              const isPositive = metalPrices.silver.changePercent >= 0
              return (
                <Link
                  key={indexInfo.symbol}
                  href={`/metal/silver`}
                  className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded-lg transition-all bg-slate-400/5"
                >
                  <div className="flex items-center gap-2">
                    <LogoImage
                      symbol={indexInfo.symbol}
                      name={indexInfo.name}
                      size={56}
                      alt={indexInfo.name}
                      className="h-6 w-6 rounded-md flex-shrink-0 object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-[8px] uppercase tracking-widest text-muted-foreground">
                        {indexInfo.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-xs">
                          ₹{metalPrices.silver.price.toLocaleString("en-IN")}
                        </span>
                        <span
                          className={cn(
                            "ticker-change flex items-center font-bold px-1 py-0.5 rounded bg-secondary/50 text-[10px]",
                            isPositive ? "text-primary" : "text-destructive",
                          )}
                        >
                          {isPositive ? "▲" : "▼"}
                          {formatPercentage(Math.abs(metalPrices.silver.changePercent))}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            }

            // Regular indices from Yahoo Finance
            const index = indices.find((i) => i.symbol === indexInfo.symbol)
            if (!index) return null

            const isPositive = index.regularMarketChange >= 0

            const getIndexStyle = (symbol: string) => {
              if (symbol === "BTC-INR") return "bg-yellow-500/5"
              if (symbol === "CL=F") return "bg-orange-500/5"
              if (symbol === "^GSPC" || symbol === "^DJI" || symbol === "^RUT")
                return "bg-blue-500/5"
              if (symbol === "^N225") return "bg-red-500/5"
              return ""
            }

            return (
              <Link
                key={index.symbol}
                href={`/stock/${encodeURIComponent(index.symbol)}`}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded-lg transition-all",
                  getIndexStyle(index.symbol),
                )}
              >
                <div className="flex items-center gap-2">
                  <LogoImage
                    symbol={indexInfo.symbol}
                    name={indexInfo.name}
                    size={28}
                    alt={indexInfo.name}
                    className="h-6 w-6 rounded-md flex-shrink-0 object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-[8px] uppercase tracking-widest text-muted-foreground">
                      {indexInfo.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-xs">
                        {formatPrice(index.regularMarketPrice, index.symbol, index.currency)}
                      </span>
                      <span
                        className={cn(
                          "ticker-change flex items-center font-bold px-1 py-0.5 rounded bg-secondary/50 text-[10px]",
                          isPositive ? "text-primary" : "text-destructive",
                        )}
                      >
                        {isPositive ? "▲" : "▼"}
                        {formatPercentage(Math.abs(index.regularMarketChangePercent))}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}

          {/* Duplicate set of indices for seamless scrolling */}
          {reorderedIndices.map((indexInfo) => {
            if (indexInfo.symbol === "GC=F" && metalPrices) {
              const isPositive = metalPrices.gold.changePercent >= 0
              return (
                <Link
                  key={`${indexInfo.symbol}-duplicate`}
                  href={`/metal/gold`}
                  className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded-lg transition-all bg-amber-500/5"
                >
                  <div className="flex items-center gap-2">
                    <LogoImage
                      symbol={indexInfo.symbol}
                      name={indexInfo.name}
                      size={56}
                      alt={indexInfo.name}
                      className="h-6 w-6 rounded-md flex-shrink-0 object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-[8px] uppercase tracking-widest text-muted-foreground">
                        {indexInfo.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-xs">
                          ₹{metalPrices.gold.price24k.toLocaleString("en-IN")}
                        </span>
                        <span
                          className={cn(
                            "flex items-center text-[10px] font-bold px-1 py-0.5 rounded bg-secondary/50",
                            isPositive ? "text-primary" : "text-destructive",
                          )}
                        >
                          {isPositive ? "▲" : "▼"}
                          {formatPercentage(Math.abs(metalPrices.gold.changePercent))}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            }

            if (indexInfo.symbol === "SI=F" && metalPrices) {
              const isPositive = metalPrices.silver.changePercent >= 0
              return (
                <Link
                  key={`${indexInfo.symbol}-duplicate`}
                  href={`/metal/silver`}
                  className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded-lg transition-all bg-slate-400/5"
                >
                  <div className="flex items-center gap-2">
                    <LogoImage
                      symbol={indexInfo.symbol}
                      name={indexInfo.name}
                      size={56}
                      alt={indexInfo.name}
                      className="h-6 w-6 rounded-md flex-shrink-0 object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-[8px] uppercase tracking-widest text-muted-foreground">
                        {indexInfo.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-xs">
                          ₹{metalPrices.silver.price.toLocaleString("en-IN")}
                        </span>
                        <span
                          className={cn(
                            "flex items-center text-[10px] font-bold px-1 py-0.5 rounded bg-secondary/50",
                            isPositive ? "text-primary" : "text-destructive",
                          )}
                        >
                          {isPositive ? "▲" : "▼"}
                          {formatPercentage(Math.abs(metalPrices.silver.changePercent))}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            }

            // Regular indices from Yahoo Finance
            const index = indices.find((i) => i.symbol === indexInfo.symbol)
            if (!index) return null

            const isPositive = index.regularMarketChange >= 0

            const getIndexStyle = (symbol: string) => {
              if (symbol === "BTC-INR") return "bg-yellow-500/5"
              if (symbol === "CL=F") return "bg-orange-500/5"
              if (symbol === "^GSPC" || symbol === "^DJI" || symbol === "^RUT")
                return "bg-blue-500/5"
              if (symbol === "^N225") return "bg-red-500/5"
              return ""
            }

            return (
              <Link
                key={`${index.symbol}-duplicate`}
                href={`/stock/${encodeURIComponent(index.symbol)}`}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded-lg transition-all",
                  getIndexStyle(index.symbol),
                )}
              >
                <div className="flex items-center gap-2">
                  <LogoImage
                    symbol={indexInfo.symbol}
                    name={indexInfo.name}
                    size={28}
                    alt={indexInfo.name}
                    className="h-6 w-6 rounded-md flex-shrink-0 object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-[8px] uppercase tracking-widest text-muted-foreground">
                      {indexInfo.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-xs">
                        {formatPrice(index.regularMarketPrice, index.symbol, index.currency)}
                      </span>
                      <span
                        className={cn(
                          "ticker-change flex items-center font-bold px-1 py-0.5 rounded bg-secondary/50 text-[10px]",
                          isPositive ? "text-primary" : "text-destructive",
                        )}
                      >
                        {isPositive ? "▲" : "▼"}
                        {formatPercentage(Math.abs(index.regularMarketChangePercent))}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
