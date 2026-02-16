"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, BitcoinIcon } from "lucide-react"

const USD_TO_INR_RATE = 88

export function BitcoinCard() {
  const [btcData, setBtcData] = useState<{
    price: number
    change24h: number
    changePercent24h: number
    high24h: number
    low24h: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBitcoinData = async () => {
      try {
        setLoading(true)
        // Fetch from Binance API for live Bitcoin data
        const response = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT")
        const data = await response.json()

        const priceUSD = Number.parseFloat(data.lastPrice)
        const changePercent = Number.parseFloat(data.priceChangePercent)

        setBtcData({
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
    // Refresh every 30 seconds
    const interval = setInterval(fetchBitcoinData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !btcData) {
    return (
      <Card className="bg-gradient-to-br from-card to-secondary/30 border border-primary/20">
        <CardContent className="p-6">
          <div className="h-24 bg-secondary rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  const isPositive = btcData.change24h >= 0
  const priceINR = btcData.price * USD_TO_INR_RATE

  return (
    <Link href="/stock/BTC-USD" className="block">
      <Card className="bg-gradient-to-br from-card via-secondary/20 to-primary/5 transition-all duration-300 cursor-pointer group rounded-xl overflow-hidden relative border border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BitcoinIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Bitcoin (BTC)</CardTitle>
                <p className="text-xs text-muted-foreground">Live Cryptocurrency Price</p>
              </div>
            </div>
            <Badge variant={isPositive ? "default" : "destructive"} className="gap-1">
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? "+" : ""}
              {btcData.changePercent24h.toFixed(2)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Price in INR</p>
            <p className="text-3xl font-bold font-mono">
              ₹{priceINR.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">≈ ${btcData.price.toFixed(2)} USD</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">24h High</p>
              <p className="text-sm font-semibold">
                ₹{(btcData.high24h * USD_TO_INR_RATE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">24h Low</p>
              <p className="text-sm font-semibold">
                ₹{(btcData.low24h * USD_TO_INR_RATE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
