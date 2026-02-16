"use client"

import { useMemo, useRef, useEffect, useState } from "react"
import type { ChartData } from "@/lib/yahoo-finance"
import { formatCurrency } from "@/lib/market-utils"

interface LineChartProps {
  data: ChartData[]
  currentRange: string
}

export function LineChart({ data, currentRange }: LineChartProps) {
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
      ? { top: 15, right: 20, bottom: 40, left: 10 }
      : { top: 15, right: 30, bottom: 40, left: 10 }
    const width = containerWidth
    const height = isMobile ? 280 : 350
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    const closePrices = data.map((d) => d.close)
    const minPrice = Math.min(...closePrices)
    const maxPrice = Math.max(...closePrices)
    const priceRange = maxPrice - minPrice || 1

    const xScale = chartWidth / (data.length - 1 || 1)
    const yScale = chartHeight / priceRange

    const points = data.map((d, i) => ({
      x: padding.left + i * xScale,
      y: padding.top + chartHeight - (d.close - minPrice) * yScale,
      price: d.close,
      time: new Date(d.timestamp * 1000).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }))

    return {
      width,
      height,
      padding,
      points,
      minPrice: minPrice.toFixed(2),
      maxPrice: maxPrice.toFixed(2),
      currentPrice: data[data.length - 1]?.close.toFixed(2),
      change: (data[data.length - 1]?.close - data[0]?.close).toFixed(2),
      changePercent: (((data[data.length - 1]?.close - data[0]?.close) / data[0]?.close) * 100).toFixed(2),
    }
  }, [data, containerWidth, isMobile])

  if (!chartConfig) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data available for chart
      </div>
    )
  }

  const pathD = chartConfig.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ")

  const isPositive = parseFloat(chartConfig.change) >= 0

  return (
    <div ref={containerRef} className="w-full">
      <div className="bg-secondary/20 p-3 md:p-4 rounded-lg mb-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-muted-foreground text-xs md:text-sm">Current Price</p>
            <p className="text-2xl md:text-3xl font-bold font-mono">{formatCurrency(parseFloat(chartConfig.currentPrice))}</p>
          </div>
          <div className={`text-right ${isPositive ? "text-primary" : "text-destructive"}`}>
            <p className="text-muted-foreground text-xs md:text-sm">Change</p>
            <p className="text-lg md:text-xl font-bold">
              {isPositive ? "+" : ""}{chartConfig.change} ({chartConfig.changePercent}%)
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Range</p>
            <p className="text-sm font-mono">
              {formatCurrency(parseFloat(chartConfig.minPrice))} - {formatCurrency(parseFloat(chartConfig.maxPrice))}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg bg-background">
        <svg
          width={chartConfig.width}
          height={chartConfig.height}
          className="w-full bg-background"
          style={{ minWidth: `${chartConfig.width}px` }}
        >
          {/* Grid lines */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.2" />
              <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartConfig.padding.top + chartConfig.height * ratio
            return (
              <line
                key={`grid-${i}`}
                x1={chartConfig.padding.left}
                y1={y}
                x2={chartConfig.width - chartConfig.padding.right}
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.1"
              />
            )
          })}

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const price =
              parseFloat(chartConfig.minPrice) +
              (parseFloat(chartConfig.maxPrice) - parseFloat(chartConfig.minPrice)) * (1 - ratio)
            const y = chartConfig.padding.top + chartConfig.height * ratio
            return (
              <text
                key={`label-${i}`}
                x={chartConfig.padding.left - 5}
                y={y}
                textAnchor="end"
                fontSize={isMobile ? "10" : "12"}
                fill="currentColor"
                opacity="0.6"
              >
                {price.toFixed(0)}
              </text>
            )
          })}

          {/* Line path with gradient fill */}
          <defs>
            <clipPath id="clip">
              <rect
                x={chartConfig.padding.left}
                y={0}
                width={chartConfig.width - chartConfig.padding.left - chartConfig.padding.right}
                height={chartConfig.height}
              />
            </clipPath>
          </defs>

          {/* Filled area under line */}
          <path
            d={`${pathD} L ${chartConfig.points[chartConfig.points.length - 1].x} ${chartConfig.padding.top + chartConfig.height} L ${chartConfig.points[0].x} ${chartConfig.padding.top + chartConfig.height} Z`}
            fill="url(#lineGradient)"
            clipPath="url(#clip)"
          />

          {/* Line */}
          <path
            d={pathD}
            stroke={isPositive ? "#10b981" : "#ef4444"}
            strokeWidth={isMobile ? "2" : "2.5"}
            fill="none"
            clipPath="url(#clip)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {chartConfig.points.map((point, i) => (
            <circle
              key={`point-${i}`}
              cx={point.x}
              cy={point.y}
              r={isMobile ? "2" : "2.5"}
              fill={isPositive ? "#10b981" : "#ef4444"}
              opacity="0.6"
            />
          ))}

          {/* X-axis */}
          <line
            x1={chartConfig.padding.left}
            y1={chartConfig.padding.top + chartConfig.height}
            x2={chartConfig.width - chartConfig.padding.right}
            y2={chartConfig.padding.top + chartConfig.height}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.2"
          />
        </svg>
      </div>

      {/* Time labels */}
      <div className="mt-2 flex justify-between px-2 text-xs text-muted-foreground">
        <span>{chartConfig.points[0]?.time}</span>
        <span>{chartConfig.points[Math.floor(chartConfig.points.length / 2)]?.time}</span>
        <span>{chartConfig.points[chartConfig.points.length - 1]?.time}</span>
      </div>
    </div>
  )
}
