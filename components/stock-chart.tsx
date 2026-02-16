"use client"

import { ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from "recharts"
import { Button } from "@/components/ui/button"
import type { ChartData } from "@/lib/yahoo-finance"
import { formatCurrency } from "@/lib/market-utils"

interface StockChartProps {
  data: ChartData[]
  onRangeChange: (range: string) => void
  currentRange: string
  isPositive: boolean
  hideControls?: boolean
}

const TIME_RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "MAX"]

export function StockChart({ data, onRangeChange, currentRange, isPositive, hideControls }: StockChartProps) {
  const color = isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"
  const gradientId = `chartGradient-${isPositive ? 'positive' : 'negative'}`

  const formatXAxis = (timestamp: number) => {
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
    return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartData }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      const date = new Date(item.timestamp * 1000)
      return (
        <div className="rounded-xl border-2 border-border/50 bg-card/95 backdrop-blur-md p-3 md:p-4 shadow-2xl min-w-[180px] md:min-w-[200px] hover:border-border/70 transition-colors">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <div className={`w-3 h-3 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <p className="text-sm font-semibold text-foreground">
              {date.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Price:</span>
              <span className="font-mono font-bold text-foreground">{formatCurrency(item.close)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Volume:</span>
              <span className="font-mono text-sm text-foreground">{(item.volume / 1000000).toFixed(2)}M</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
        <Activity className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-center">Chart data not available</p>
        <p className="text-xs text-center mt-2">Try selecting a different time range</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      {!hideControls && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1">
            {TIME_RANGES.map((range) => (
              <Button
                key={range}
                variant={currentRange === range ? "default" : "ghost"}
                size="sm"
                onClick={() => onRangeChange(range)}
                className="text-xs"
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Chart - Enhanced for better mobile and desktop view */}
      <div className="h-[300px] md:h-[450px] lg:h-[500px] w-full rounded-xl overflow-hidden border-2 border-border/50 bg-card/30 backdrop-blur-sm">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={data} 
            margin={{ top: 20, right: 80, left: 20, bottom: 40 }}
            className="drop-shadow-sm"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="30%" stopColor={color} stopOpacity={0.2} />
                <stop offset="70%" stopColor={color} stopOpacity={0.1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid 
              strokeDasharray="2 4" 
              stroke="hsl(0 0% 40%)" 
              vertical={false} 
              opacity={0.3}
              strokeWidth={0.5}
            />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              stroke="hsl(0 0% 60%)"
              fill="hsl(0 0% 60%)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "hsl(0 0% 30%)", strokeWidth: 0.5 }}
              tick={{ fill: "hsl(0 0% 60%)" }}
              padding={{ left: 20, right: 20 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={(value) => `₹${value.toLocaleString("en-IN")}`}
              stroke="hsl(0 0% 60%)"
              fill="hsl(0 0% 60%)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "hsl(0 0% 30%)", strokeWidth: 0.5 }}
              width={75}
              orientation="right"
              tick={{ fill: "hsl(0 0% 60%)" }}
              dx={10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="close" 
              stroke={color} 
              strokeWidth={2.5} 
              fill={`url(#${gradientId})`}
              filter="url(#glow)"
              dot={false}
              activeDot={{
                r: 4,
                fill: color,
                stroke: "hsl(0 0% 100%)",
                strokeWidth: 2,
                filter: "drop-shadow(0 0 6px " + color + "40)"
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
