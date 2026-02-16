"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, BitcoinIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { useRef } from "react"

const USD_TO_INR_RATE = 88

export function BitcoinTicker() {
  const [btcData, setbtcData] = useState<{
    price: number
    change24h: number
    changePercent24h: number
    high24h: number
    low24h: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchBitcoinData = async () => {
      try {
        setLoading(true)
        const response = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT")
        const data = await response.json()

        const priceUSD = Number.parseFloat(data.lastPrice)
        const changePercent = Number.parseFloat(data.priceChangePercent)

        setbtcData({
          price: priceUSD,
          change24h: Number.parseFloat(data.priceChange),
          changePercent24h: changePercent,
          high24h: Number.parseFloat(data.highPrice),
          low24h: Number.parseFloat(data.lowPrice),
        })
      } catch (error) {
        console.error("Error fetching Bitcoin data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBitcoinData()
    const interval = setInterval(fetchBitcoinData, 30000)
    return () => clearInterval(interval)
  }, [])

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  if (loading || !btcData) {
    return <div className="h-32 bg-secondary rounded-lg animate-pulse" />
  }

  const isPositive = btcData.change24h >= 0
  const priceINR = btcData.price * USD_TO_INR_RATE

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Bitcoin Market</h2>
      <div className="relative group">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollBehavior: "smooth" }}
        >
          <Link href="/stock/BTC-USD" className="block flex-shrink-0 w-96">
            <Card className="h-full bg-gradient-to-br from-card via-secondary/20 to-primary/5 hover:border-primary/40 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/10 group">
              <CardContent className="p-6 space-y-4 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <BitcoinIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Bitcoin (BTC)</h3>
                        <p className="text-xs text-muted-foreground">Live Crypto Price</p>
                      </div>
                    </div>
                    <Badge variant={isPositive ? "default" : "destructive"} className="gap-1">
                      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isPositive ? "+" : ""}
                      {btcData.changePercent24h.toFixed(2)}%
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Price in INR</p>
                      <p className="text-2xl font-bold font-mono glow-bitcoin">
                        ₹{priceINR.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">≈ ${btcData.price.toFixed(2)} USD</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">24h High</p>
                        <p className="text-sm font-semibold">
                          ₹{(btcData.high24h * USD_TO_INR_RATE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">24h Low</p>
                        <p className="text-sm font-semibold">
                          ₹{(btcData.low24h * USD_TO_INR_RATE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-10 p-2 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-all opacity-0 group-hover:opacity-100 duration-200"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-10 p-2 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-all opacity-0 group-hover:opacity-100 duration-200"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
