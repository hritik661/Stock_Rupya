/**
 * 52-Week Module Integration Helpers
 * Use these functions to integrate 52-week features throughout your app
 */

import { FiftyTwoWeekView } from "@/components/52-week-view"
import { fetchFiftyTwoWeekData } from "@/lib/yahoo-finance"
import type { FiftyTwoWeekStats } from "@/lib/52-week-data"

/**
 * Navigation Link Configuration
 * Add to your main navigation menu
 */
export const FIFTY_TWO_WEEK_NAV = {
  name: "52-Week Analysis",
  href: "/52-week-highs-lows",
  description: "Track stocks at 52-week highs and lows",
  icon: "TrendingUp",
}

/**
 * Dashboard Widget Configuration
 * Use to add 52-week widget to dashboard
 */
export interface FiftyTwoWeekWidgetConfig {
  type: "all" | "near-high" | "near-low" | "volatile"
  title: string
  limit: number
  showStats: boolean
}

export const DASHBOARD_WIDGETS: Record<string, FiftyTwoWeekWidgetConfig> = {
  topHighs: {
    type: "near-high",
    title: "52-Week Highs",
    limit: 5,
    showStats: true,
  },
  topLows: {
    type: "near-low",
    title: "52-Week Lows",
    limit: 5,
    showStats: true,
  },
  volatile: {
    type: "volatile",
    title: "Most Volatile",
    limit: 5,
    showStats: true,
  },
}

/**
 * Get 52-week insights for a specific stock
 */
export async function getStock52WeekInsights(symbol: string) {
  try {
    const data = await fetchFiftyTwoWeekData("all")
    if (!data || !data.stocks) return null

    const stock = data.stocks.find(s => s.symbol === symbol || s.symbol === `${symbol}.NS`)
    return stock || null
  } catch (error) {
    console.error("Error getting 52-week insights:", error)
    return null
  }
}

/**
 * Get recommendation based on 52-week position
 */
export function get52WeekRecommendation(distanceFromHigh: number, distanceFromLow: number): {
  signal: "bullish" | "neutral" | "bearish"
  text: string
  color: string
} {
  if (distanceFromHigh < 5) {
    return {
      signal: "bullish",
      text: "Hitting new highs - Strong momentum",
      color: "text-green-600",
    }
  }
  if (distanceFromHigh < 15) {
    return {
      signal: "bullish",
      text: "Near 52W high - Good strength",
      color: "text-green-500",
    }
  }
  if (distanceFromLow < 5) {
    return {
      signal: "bearish",
      text: "Near 52W low - Potential reversal",
      color: "text-red-600",
    }
  }
  if (distanceFromLow < 15) {
    return {
      signal: "bearish",
      text: "Testing 52W lows - Weakness",
      color: "text-red-500",
    }
  }
  return {
    signal: "neutral",
    text: "Trading in mid-range",
    color: "text-yellow-600",
  }
}

/**
 * Format 52-week data for display in tooltips
 */
export function format52WeekTooltip(stock: any): string {
  return `
52-Week High: ₹${stock.fiftyTwoWeekHigh.toFixed(2)}
52-Week Low: ₹${stock.fiftyTwoWeekLow.toFixed(2)}
Current: ₹${stock.currentPrice.toFixed(2)}
From High: ${stock.distanceFromHigh.toFixed(1)}%
From Low: ${stock.distanceFromLow.toFixed(1)}%
Range: ${stock.rangePercent.toFixed(1)}%
  `.trim()
}

/**
 * Compare stock position within 52-week range
 * Returns a value 0-100 (0=at low, 100=at high)
 */
export function get52WeekPosition(
  currentPrice: number,
  fiftyTwoWeekLow: number,
  fiftyTwoWeekHigh: number
): number {
  if (fiftyTwoWeekHigh <= fiftyTwoWeekLow) return 50
  const position = ((currentPrice - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow)) * 100
  return Math.max(0, Math.min(100, position))
}

/**
 * Get color based on position in 52-week range
 */
export function get52WeekColor(position: number): string {
  if (position >= 80) return "bg-green-600" // Near high
  if (position >= 60) return "bg-green-500"
  if (position >= 40) return "bg-yellow-500" // Middle
  if (position >= 20) return "bg-red-500"
  return "bg-red-600" // Near low
}

/**
 * Integration example for Stock Detail Page
 */
export async function addFiftyTwoWeekToStockDetail(symbol: string) {
  const insight = await getStock52WeekInsights(symbol)
  if (!insight) return null

  const position = get52WeekPosition(
    insight.currentPrice,
    insight.fiftyTwoWeekLow,
    insight.fiftyTwoWeekHigh
  )
  const recommendation = get52WeekRecommendation(insight.distanceFromHigh, insight.distanceFromLow)
  const color = get52WeekColor(position)

  return {
    insight,
    position,
    recommendation,
    color,
    tooltip: format52WeekTooltip(insight),
  }
}

/**
 * Get stats summary
 */
export async function get52WeekStatsSummary(): Promise<FiftyTwoWeekStats | null> {
  try {
    return await fetchFiftyTwoWeekData("all")
  } catch (error) {
    console.error("Error getting stats:", error)
    return null
  }
}

/**
 * Check if stock is trending towards highs or lows
 */
export function get52WeekTrend(distanceFromHigh: number, distanceFromLow: number): "bullish" | "bearish" | "neutral" {
  if (distanceFromHigh < distanceFromLow) return "bullish"
  if (distanceFromLow < distanceFromHigh) return "bearish"
  return "neutral"
}
