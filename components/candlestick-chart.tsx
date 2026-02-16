"use client"

import { useMemo, useRef, useEffect, useState } from "react"
import type { ChartData } from "@/lib/yahoo-finance"
import { formatCurrency } from "@/lib/market-utils"

interface CandlestickChartProps {
  data: ChartData[]
  currentRange: string
}

export function CandlestickChart({ data, currentRange }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(900)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    updateWidth()
    checkMobile()
    window.addEventListener('resize', updateWidth)
    window.addEventListener('resize', checkMobile)
    return () => {
      window.removeEventListener('resize', updateWidth)
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const chartConfig = useMemo(() => {
    if (!data || data.length === 0) return null

    const padding = isMobile 
      ? { top: 20, right: 40, bottom: 50, left: 10 }
      : { top: 20, right: 80, bottom: 50, left: 10 }
    const width = Math.min(containerWidth, 1200) // Max width for large screens
    const height = isMobile ? 250 : 300
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    const prices = data.flatMap((d) => [d.high, d.low])
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 1
    const pricePadding = priceRange * 0.05

    const adjustedMin = minPrice - pricePadding
    const adjustedMax = maxPrice + pricePadding
    const adjustedRange = adjustedMax - adjustedMin

    const candleWidth = Math.max(2, Math.min(15, chartWidth / data.length - 1))
    const candleGap = Math.max(0.5, (chartWidth - candleWidth * data.length) / (data.length - 1))

    const scaleY = (price: number) => {
      return chartHeight - ((price - adjustedMin) / adjustedRange) * chartHeight + padding.top
    }

    const scaleX = (index: number) => {
      return padding.left + index * (candleWidth + candleGap) + candleWidth / 2
    }

    return {
      padding,
      width,
      height,
      chartWidth,
      chartHeight,
      minPrice: adjustedMin,
      maxPrice: adjustedMax,
      priceRange: adjustedRange,
      candleWidth,
      scaleY,
      scaleX,
    }
  }, [data, containerWidth])

  if (!chartConfig || !data || data.length === 0) {
    return (
      <div className="h-[250px] md:h-[300px] flex flex-col items-center justify-center text-muted-foreground">
        <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-center">Chart data not available</p>
        <p className="text-xs text-center mt-2">Try selecting a different time range</p>
      </div>
    )
  }

  const { padding, width, height, chartHeight, minPrice, maxPrice, priceRange, candleWidth, scaleY, scaleX } =
    chartConfig

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    if (currentRange === "1D") {
      return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    }
    if (currentRange === "1W" || currentRange === "1M") {
      return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    }
    if (currentRange === "5Y" || currentRange === "MAX") {
      return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
    }
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
  }

  // Generate price levels for grid
  const priceLevels = Array.from({ length: 6 }, (_, i) => {
    const price = minPrice + (priceRange * i) / 5
    return { price, y: scaleY(price) }
  })

  const isLargeValue = maxPrice > 5000

  return (
    <div ref={containerRef} className="w-full overflow-x-auto scrollbar-hide">
      <svg
        width={width}
        height={height}
        className="min-w-full"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Background grid - Fixed grid line color */}
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
              x={width - padding.right + (isMobile ? 5 : 10)}
              y={level.y + 4}
              fill="#a1a1aa"
              fontSize={isMobile ? 9 : 11}
              fontFamily="monospace"
              fontWeight={500}
            >
              {isLargeValue
                ? `₹${(level.price / 100000).toFixed(1)}L`
                : `₹${level.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            </text>
          </g>
        ))}

        {/* Candlesticks */}
        {data.map((candle, i) => {
          const x = scaleX(i)
          const bullish = candle.close >= candle.open
          const bodyTop = scaleY(Math.max(candle.open, candle.close))
          const bodyBottom = scaleY(Math.min(candle.open, candle.close))
          const bodyHeight = Math.max(1, bodyBottom - bodyTop)

          return (
            <g key={i} className="group">
              {/* Wick */}
              <line
                x1={x}
                y1={scaleY(candle.high)}
                x2={x}
                y2={scaleY(candle.low)}
                stroke={bullish ? "hsl(145, 63%, 49%)" : "hsl(0, 84%, 60%)"}
                strokeWidth={1}
              />
              {/* Body */}
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={bullish ? "hsl(145, 63%, 49%)" : "hsl(0, 84%, 60%)"}
                rx={1}
              />
              {/* Hover tooltip area */}
              <rect
                x={x - candleWidth / 2 - 2}
                y={padding.top}
                width={candleWidth + 4}
                height={chartHeight}
                fill="transparent"
                className="cursor-crosshair"
              >
                <title>
                  {`${formatDate(candle.timestamp)}\nOpen: ${formatCurrency(candle.open)}\nHigh: ${formatCurrency(candle.high)}\nLow: ${formatCurrency(candle.low)}\nClose: ${formatCurrency(candle.close)}\nVolume: ${(candle.volume / 1000000).toFixed(2)}M`}
                </title>
              </rect>
            </g>
          )
        })}

        {/* X-axis labels - Fixed X-axis label color to be more visible */}
        {data
          .filter((_, i) => i % Math.ceil(data.length / 8) === 0)
          .map((candle, i) => {
            const originalIndex = data.indexOf(candle)
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
                {formatDate(candle.timestamp)}
              </text>
            )
          })}
      </svg>
    </div>
  )
}
