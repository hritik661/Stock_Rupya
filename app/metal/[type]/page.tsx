"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { Header } from "@/components/header"
import { IndicesTicker } from "@/components/indices-ticker"
import { LogoImage } from "@/components/logo-image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, BarChart3, Activity, RefreshCw } from "lucide-react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from "recharts"

const TIME_RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y"]

interface MetalPrices {
  gold: {
    price24k: number
    price22k: number
    unit: string
    change: number
    changePercent: number
    priceUSD?: number
  }
  silver: {
    price: number
    unit: string
    change: number
    changePercent: number
    priceUSD?: number
  }
  exchangeRate?: number
}

interface GoodReturnsData {
  source: string
  silver: {
    pricePerGram: number
    pricePerKg: number
    pricePer10g: number
    change: number
    changePercent: number
  }
  timestamp: string
  error?: string
}

// Generate mock historical data for metals
function generateMetalChartData(basePrice: number, range: string) {
  const dataPoints =
    range === "1D" ? 78 : range === "1W" ? 84 : range === "1M" ? 30 : range === "3M" ? 90 : range === "6M" ? 180 : 365
  const volatility = range === "1D" ? 0.001 : range === "1W" ? 0.005 : range === "1M" ? 0.01 : 0.03
  const data = []
  let price = basePrice * (1 - volatility * dataPoints * 0.5)

  const now = Date.now()
  const interval =
    range === "1D"
      ? 5 * 60 * 1000
      : range === "1W"
        ? 2 * 60 * 60 * 1000
        : range === "1M"
          ? 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000

  for (let i = 0; i < dataPoints; i++) {
    const change = (Math.random() - 0.48) * basePrice * volatility
    price = Math.max(price + change, basePrice * 0.9)
    const timestamp = Math.floor((now - (dataPoints - i) * interval) / 1000)

    const open = price
    const close = price + (Math.random() - 0.5) * basePrice * volatility * 0.5
    const high = Math.max(open, close) + Math.random() * basePrice * volatility * 0.3
    const low = Math.min(open, close) - Math.random() * basePrice * volatility * 0.3

    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 100000) + 10000,
    })
  }
  return data
}

export default function MetalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const metalType = params.type as string

  const [metalPrices, setMetalPrices] = useState<MetalPrices | null>(null)
  const [goodReturnsData, setGoodReturnsData] = useState<GoodReturnsData | null>(null)
  const [currentRange, setCurrentRange] = useState("1M")
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)

  const isGold = metalType === "gold"
  const metalName = isGold ? "GOLD (10g)" : "SILVER (1kg)"
  const metalColor = isGold ? "hsl(45, 93%, 47%)" : "hsl(210, 10%, 70%)"

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/metals")
        const data = await response.json()
        setMetalPrices(data)

        if (metalType === "silver") {
          const goodReturnsResponse = await fetch("/api/goodreturns")
          const goodReturnsJson = await goodReturnsResponse.json()
          setGoodReturnsData(goodReturnsJson)
        }
      } catch (error) {
        console.error("Error fetching metal prices:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [metalType])

  const currentPrice = isGold ? metalPrices?.gold.price24k || 78500 : metalPrices?.silver.price || 95000

  // Compute 10g from the raw GC=F USD/oz value and exchange rate (if available)
  const computed10gFromGC = (() => {
    if (!isGold || !metalPrices) return null
    const pricePerOunceUSD = typeof metalPrices.gold.priceUSD === "number" ? metalPrices.gold.priceUSD : null
    const usdInr = metalPrices.exchangeRate || 83.5
    if (pricePerOunceUSD === null || pricePerOunceUSD === undefined) return null
    const pricePerGramUSD = pricePerOunceUSD / 31.1035
    const price10gINR = Math.round(pricePerGramUSD * 10 * usdInr)
    return { pricePerOunceUSD, usdInr, price10gINR }
  })()

  // Compute 1kg from the raw SI=F USD/oz value and exchange rate (if available)
  const computedSilverFromSI = (() => {
    if (isGold || !metalPrices) return null
    const pricePerOunceUSD = typeof metalPrices.silver.priceUSD === "number" ? metalPrices.silver.priceUSD : null
    const usdInr = metalPrices.exchangeRate || 83.5
    if (pricePerOunceUSD === null || pricePerOunceUSD === undefined) return null

    // 1 kg = 1000g = 1000/31.1035 troy ounces ≈ 32.1507 oz
    const ouncesPerKg = 1000 / 31.1035
    const pricePerKgUSD = pricePerOunceUSD * ouncesPerKg
    const pricePerKgINR = Math.round(pricePerKgUSD * usdInr)
    return { pricePerOunceUSD, usdInr, pricePerKgINR }
  })()

  const displayedPrice = isGold ? computed10gFromGC?.price10gINR : goodReturnsData?.silver.pricePerKg

  const chartData = useMemo(() => {
    return generateMetalChartData(currentPrice, currentRange)
  }, [currentPrice, currentRange])

  const handleRangeChange = (range: string) => {
    setChartLoading(true)
    setCurrentRange(range)
    setTimeout(() => setChartLoading(false), 300)
  }

  const change = isGold ? metalPrices?.gold.change || 0 : goodReturnsData?.silver.change || 0
  const changePercent = isGold ? metalPrices?.gold.changePercent || 0 : goodReturnsData?.silver.changePercent || 0
  const isPositive = change >= 0

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    if (currentRange === "1D") {
      return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    }
    if (currentRange === "1W" || currentRange === "1M") {
      return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    }
    return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <IndicesTicker />
        <main className="container mx-auto px-4 py-6">
          <div className="h-8 w-48 bg-secondary rounded animate-pulse mb-6" />
          <div className="h-[450px] bg-secondary rounded-xl animate-pulse" />
        </main>
      </div>
    )
  }

  // Candlestick chart renderer
  const renderCandlestick = () => {
    const padding = { top: 20, right: 80, bottom: 50, left: 10 }
    const width = 900
    const height = 400
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    const prices = chartData.flatMap((d) => [d.high, d.low])
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 1
    const pricePadding = priceRange * 0.05

    const adjustedMin = minPrice - pricePadding
    const adjustedMax = maxPrice + pricePadding
    const adjustedRange = adjustedMax - adjustedMin

    const candleWidth = Math.max(3, Math.min(12, chartWidth / chartData.length - 2))
    const candleGap = Math.max(1, (chartWidth - candleWidth * chartData.length) / (chartData.length - 1))

    const scaleY = (price: number) => {
      return chartHeight - ((price - adjustedMin) / adjustedRange) * chartHeight + padding.top
    }

    const scaleX = (index: number) => {
      return padding.left + index * (candleWidth + candleGap) + candleWidth / 2
    }

    const priceLevels = Array.from({ length: 6 }, (_, i) => {
      const price = adjustedMin + (adjustedRange * i) / 5
      return { price, y: scaleY(price) }
    })

    return (
      <div className="w-full overflow-x-auto scrollbar-hide">
        <svg
          width={Math.max(width, chartData.length * (candleWidth + 2) + padding.left + padding.right)}
          height={height}
          className="min-w-full"
        >
          {priceLevels.map((level, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={level.y}
                x2={width - padding.right}
                y2={level.y}
                stroke="#52525b"
                strokeDasharray="4,4"
                strokeOpacity={0.7}
              />
              <text
                x={width - padding.right + 10}
                y={level.y + 4}
                fill="#a1a1aa"
                fontSize={11}
                fontFamily="monospace"
                fontWeight={500}
              >
                ₹{level.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </text>
            </g>
          ))}

          {chartData.map((candle, i) => {
            const x = scaleX(i)
            const bullish = candle.close >= candle.open
            const bodyTop = scaleY(Math.max(candle.open, candle.close))
            const bodyBottom = scaleY(Math.min(candle.open, candle.close))
            const bodyHeight = Math.max(1, bodyBottom - bodyTop)

            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={scaleY(candle.high)}
                  x2={x}
                  y2={scaleY(candle.low)}
                  stroke={bullish ? "hsl(145, 63%, 49%)" : "hsl(0, 84%, 60%)"}
                  strokeWidth={1}
                />
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={bullish ? "hsl(145, 63%, 49%)" : "hsl(0, 84%, 60%)"}
                  rx={1}
                />
                <title>
                  {`${formatXAxis(candle.timestamp)}\nOpen: ₹${candle.open.toLocaleString("en-IN")}\nHigh: ₹${candle.high.toLocaleString("en-IN")}\nLow: ₹${candle.low.toLocaleString("en-IN")}\nClose: ₹${candle.close.toLocaleString("en-IN")}`}
                </title>
              </g>
            )
          })}

          {chartData
            .filter((_, i) => i % Math.ceil(chartData.length / 8) === 0)
            .map((candle, i) => {
              const originalIndex = chartData.indexOf(candle)
              const x = scaleX(originalIndex)
              return (
                <text
                  key={i}
                  x={x}
                  y={height - 15}
                  fill="#a1a1aa"
                  fontSize={11}
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontWeight={500}
                >
                  {formatXAxis(candle.timestamp)}
                </text>
              )
            })}
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <IndicesTicker />

      <main className="container mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-3 mb-1">
              <LogoImage
                symbol={isGold ? "GC=F" : "SI=F"}
                name={isGold ? "Gold" : "Silver"}
                size={48}
                className="h-12 w-12 rounded-md flex-shrink-0 object-cover"
              />
              <h1 className="text-3xl font-bold">{metalName}</h1>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground">
              {isGold ? "24 Karat Gold Price from GoodReturns.in" : "Silver 1kg Price from GoodReturns.in"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-4 mb-8">
          <span className="text-5xl font-bold font-mono tracking-tight">
            ₹{displayedPrice?.toLocaleString("en-IN")}
          </span>
          {isGold ? (
            <div className="text-sm text-muted-foreground">
              Live from <span className="font-mono">${computed10gFromGC?.pricePerOunceUSD.toFixed(2)}/oz</span> (GC=F) •
              10g ≈ <span className="font-mono">₹{computed10gFromGC?.price10gINR.toLocaleString("en-IN")}</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Live from <span className="font-mono">${goodReturnsData?.silver.pricePerGram.toFixed(2)}/g</span> (SI=F) •
              1kg ≈ <span className="font-mono">₹{goodReturnsData?.silver.pricePerKg.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className={`flex items-center gap-2 ${isPositive ? "text-primary" : "text-destructive"}`}>
            {isPositive ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
            <span className="text-2xl font-semibold">
              {isPositive ? "+" : ""}₹{Math.abs(change).toLocaleString("en-IN")}
            </span>
            <span className="text-2xl font-semibold">
              ({isPositive ? "+" : ""}
              {changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Area */}
          <div className="lg:col-span-2">
            <Card className="border-border rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <Tabs defaultValue="candlestick" className="w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <TabsList className="bg-secondary/50">
                      <TabsTrigger
                        value="line"
                        className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <Activity className="h-4 w-4" />
                        Line
                      </TabsTrigger>
                      <TabsTrigger
                        value="candlestick"
                        className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Candlestick
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex gap-1 flex-wrap">
                      {TIME_RANGES.map((range) => (
                        <Button
                          key={range}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRangeChange(range)}
                          disabled={chartLoading}
                          className={cn(
                            "text-xs font-medium px-3 rounded-full transition-all",
                            currentRange === range
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "hover:bg-secondary",
                          )}
                        >
                          {range}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {chartLoading ? (
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading chart data...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <TabsContent value="line" className="mt-0">
                        <div className="h-[400px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 90, left: 10, bottom: 20 }}>
                              <defs>
                                <linearGradient id="metalGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={metalColor} stopOpacity={0.3} />
                                  <stop offset="100%" stopColor={metalColor} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(0 0% 30%)"
                                vertical={false}
                                opacity={0.5}
                              />
                              <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatXAxis}
                                stroke="#a1a1aa"
                                fontSize={12}
                                tickLine={false}
                                axisLine={{ stroke: "#52525b" }}
                                tick={{ fill: "#a1a1aa" }}
                              />
                              <YAxis
                                domain={["auto", "auto"]}
                                tickFormatter={(value) => `₹${value.toLocaleString("en-IN")}`}
                                stroke="#a1a1aa"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: "#52525b" }}
                                width={85}
                                orientation="right"
                                tick={{ fill: "#a1a1aa" }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                }}
                                formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Price"]}
                                labelFormatter={(label) => formatXAxis(label)}
                              />
                              <Area
                                type="monotone"
                                dataKey="close"
                                stroke={metalColor}
                                strokeWidth={2}
                                fill="url(#metalGradient)"
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </TabsContent>

                      <TabsContent value="candlestick" className="mt-0">
                        {renderCandlestick()}
                      </TabsContent>
                    </>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Trade Panel */}
          <div className="space-y-6">
            {/* TradePanel removed for metals */}

            <Card className="border-border rounded-xl mt-6 bg-gradient-to-br from-card via-secondary/10 to-primary/5 border border-primary/20 hover:border-primary/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Price Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {isGold ? (
                    <>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Calculated 10g (live)</p>
                        <p className="font-mono font-semibold text-lg">
                          {computed10gFromGC ? `₹${computed10gFromGC.price10gINR.toLocaleString("en-IN")}` : "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">24K Gold (10g)</p>
                        <p className="font-mono font-semibold text-lg">
                          ₹{metalPrices?.gold.price24k.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">22K Gold (10g)</p>
                        <p className="font-mono font-semibold text-lg">
                          ₹{metalPrices?.gold.price22k.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Silver (1kg)</p>
                      <p className="font-mono font-semibold text-lg">
                        ₹{goodReturnsData?.silver.pricePerKg.toLocaleString("en-IN")}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Change</p>
                    <div className="space-y-1">
                      <p
                        className={cn(
                          "font-mono font-semibold text-lg",
                          isPositive ? "text-primary" : "text-destructive",
                        )}
                      >
                        {isPositive ? "+" : ""}₹{Math.abs(change).toLocaleString("en-IN")}
                      </p>
                      <p
                        className={cn(
                          "text-sm font-bold px-2 py-1 rounded-md",
                          isPositive ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
                        )}
                      >
                        {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border rounded-xl bg-gradient-to-br from-card via-secondary/10 to-primary/5 border border-primary/20 hover:border-primary/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Today's Change</span>
                    <span className={cn("font-mono font-semibold", isPositive ? "text-primary" : "text-destructive")}>
                      {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "absolute h-full rounded-full transition-all duration-500",
                        isPositive ? "bg-gradient-to-r from-primary/80 to-primary" : "bg-gradient-to-r from-destructive/80 to-destructive"
                      )}
                      style={{
                        width: `${Math.max(5, Math.min(95, Math.abs(changePercent) * 10))}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>0%</span>
                    <span>{changePercent.toFixed(2)}%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price Movement</span>
                    <span className="font-mono font-semibold">
                      ₹{Math.abs(change).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "absolute h-full rounded-full transition-all duration-500",
                        isPositive ? "bg-gradient-to-r from-green-500/80 to-green-500" : "bg-gradient-to-r from-red-500/80 to-red-500"
                      )}
                      style={{
                        width: `${Math.max(5, Math.min(95, (Math.abs(change) / (displayedPrice || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>₹0</span>
                    <span>₹{Math.abs(change).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
