"use client"

import { Area, AreaChart, ResponsiveContainer } from "recharts"

interface MiniChartProps {
  data: Array<{ timestamp: number; close: number }>
  isPositive: boolean
}

export function MiniChart({ data, isPositive }: MiniChartProps) {
  const color = isPositive ? "#10B981" : "#EF4444"
  const gradientId = `mini-gradient-${isPositive ? "positive" : "negative"}`

  return (
    <div
      className={`rounded-lg overflow-hidden ${isPositive ? "ring-1 ring-emerald-500/30" : "ring-1 ring-rose-500/30"} animate-[pulse_2s_ease-in-out_infinite]`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.1} />
              <stop offset="40%" stopColor={color} stopOpacity={0.05} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
            <filter id="mini-glow">
              <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={0.5}
            strokeLinecap="round"
            fill={`url(#${gradientId})`}
            filter="url(#mini-glow)"
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
