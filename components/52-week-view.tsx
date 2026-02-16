"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatPercentage } from "@/lib/market-utils"
import type { FiftyTwoWeekData, FiftyTwoWeekStats } from "@/lib/52-week-data"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"

interface FiftyTwoWeekViewProps {
  type?: "all" | "near-high" | "near-low" | "volatile"
  title?: string
  description?: string
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

export function FiftyTwoWeekView({
  type = "all",
  title: customTitle,
  description: customDescription,
  limit = 30,
  autoRefresh = true,
  refreshInterval = 3600000, // 1 hour
}: FiftyTwoWeekViewProps) {
  const [data, setData] = useState<FiftyTwoWeekStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedView, setSelectedView] = useState<"all" | "near-high" | "near-low" | "volatile">(type)
  const [showMore, setShowMore] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/stock/52-week-data?type=${selectedView}`,
        { cache: "no-store" }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch 52-week data")
      }

      const result = await response.json()
      setData(result)
      setLastUpdated(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch data"
      setError(message)
      console.error("[52W View] Error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    if (!autoRefresh) return

    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [selectedView, autoRefresh, refreshInterval])

  const getDisplayData = (): FiftyTwoWeekData[] => {
    if (!data) return []

    let displayData: FiftyTwoWeekData[] = data.stocks || []
    if (selectedView === "near-high") displayData = data.topNearHigh || []
    else if (selectedView === "near-low") displayData = data.topNearLow || []
    else if (selectedView === "volatile") displayData = data.mostVolatile || []

    const displayLimit = showMore ? limit : 4
    return displayData.slice(0, displayLimit)
  }

  const displayData = getDisplayData()

  const getTitle = () => {
    if (customTitle) return customTitle
    if (selectedView === "near-high") return "52-Week Highs"
    if (selectedView === "near-low") return "52-Week Lows"
    if (selectedView === "volatile") return "Most Volatile"
    return "52-Week High & Low"
  }

  const getDescription = () => {
    if (customDescription) return customDescription
    if (selectedView === "near-high") return "Stocks trading near their 52-week highs"
    if (selectedView === "near-low") return "Stocks trading near their 52-week lows"
    if (selectedView === "volatile") return "Stocks with the largest 52-week price range"
    return "Top Indian stocks 52-week performance analysis"
  }

  const renderStockRow = (stock: FiftyTwoWeekData, index: number) => {
    const isNearHigh = stock.distanceFromHigh < 10
    const isNearLow = stock.distanceFromLow < 10

    return (
      <Link
        key={stock.symbol}
        href={`/stock/${encodeURIComponent(stock.symbol)}`}
      >
        <div className="flex items-center justify-between p-2 md:p-3 border-b hover:bg-secondary/50 transition-colors last:border-b-0 cursor-pointer gap-1 md:gap-2">
          {/* Rank & Symbol */}
          <div className="flex items-center gap-2 md:gap-3 min-w-[120px] md:min-w-[180px]">
            <div className="text-[10px] md:text-xs font-bold text-muted-foreground w-4 md:w-6">{index + 1}</div>
            <div>
              <div className="font-semibold text-xs md:text-sm">{stock.symbol.replace(".NS", "")}</div>
              <div className="text-[9px] md:text-xs text-muted-foreground truncate">{stock.name}</div>
            </div>
          </div>

          {/* Current Price */}
          <div className="text-right min-w-[80px] md:min-w-[100px]">
            <div className="font-semibold text-xs md:text-sm">{formatCurrency(stock.currentPrice)}</div>
            <div className={`text-[9px] md:text-xs ${stock.regularMarketChangePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
              {stock.regularMarketChangePercent > 0 ? "+" : ""}{formatPercentage(stock.regularMarketChangePercent)}
            </div>
          </div>

          {/* 52W Range */}
          <div className="text-right min-w-[90px] md:min-w-[110px] hidden sm:block">
            <div className="text-[8px] md:text-xs text-muted-foreground">52W Range</div>
            <div className="font-medium text-[9px] md:text-xs">
              {formatCurrency(stock.fiftyTwoWeekLow)} - {formatCurrency(stock.fiftyTwoWeekHigh)}
            </div>
            <div className="text-[8px] text-muted-foreground">{formatPercentage(stock.rangePercent)}</div>
          </div>

          {/* Distance from High */}
          <div className="text-right min-w-[75px] md:min-w-[90px]">
            <div className="text-[8px] md:text-xs text-muted-foreground">From High</div>
            <div className={`font-medium text-[9px] md:text-xs ${stock.distanceFromHigh < 10 ? "text-amber-600 font-bold" : ""}`}>
              {stock.distanceFromHigh.toFixed(1)}%
            </div>
            {isNearHigh && <Badge className="mt-0.5 text-[7px] md:text-[8px] px-1 py-0 h-4 md:h-auto">Near High</Badge>}
          </div>

          {/* Distance from Low */}
          <div className="text-right min-w-[75px] md:min-w-[90px]">
            <div className="text-[8px] md:text-xs text-muted-foreground">From Low</div>
            <div className={`font-medium text-[9px] md:text-xs ${stock.distanceFromLow < 10 ? "text-green-600 font-bold" : ""}`}>
              {stock.distanceFromLow.toFixed(1)}%
            </div>
            {isNearLow && <Badge variant="outline" className="mt-0.5 text-[7px] md:text-[8px] px-1 py-0 h-4 md:h-auto">Near Low</Badge>}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="w-full space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-1 md:gap-2">
        <h2 className="text-lg md:text-2xl font-bold">{getTitle()}</h2>
        <p className="text-xs md:text-sm text-muted-foreground">{getDescription()}</p>
        {lastUpdated && (
          <p className="text-[10px] md:text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()} • Auto-refresh every {(refreshInterval / 60000).toFixed(0)} minutes
          </p>
        )}
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 md:gap-2 flex-wrap">
        <Button
          variant={selectedView === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedView("all")}
          className="text-[11px] md:text-xs h-8 md:h-auto"
        >
          All Stocks
        </Button>
        <Button
          variant={selectedView === "near-high" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedView("near-high")}
          className="text-[11px] md:text-xs h-8 md:h-auto"
        >
          <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
          Near High
        </Button>
        <Button
          variant={selectedView === "near-low" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedView("near-low")}
          className="text-[11px] md:text-xs h-8 md:h-auto"
        >
          <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
          Near Low
        </Button>
        <Button
          variant={selectedView === "volatile" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedView("volatile")}
          className="text-[11px] md:text-xs h-8 md:h-auto"
        >
          <Activity className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
          Volatile
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="text-[11px] md:text-xs h-8 md:h-auto ml-auto"
        >
          Refresh
        </Button>
      </div>

      {/* Content Card */}
      <Card className="border-border">
        <CardHeader className="pb-2 md:pb-3 px-3 md:px-4 py-2 md:py-3">
          <CardTitle className="text-sm md:text-base lg:text-lg flex items-center justify-between">
            <span>{displayData.length} Stocks</span>
            {data && (
              <span className="text-[10px] md:text-xs font-normal text-muted-foreground">
                Avg. {data.averageHighPercent.toFixed(1)}% from 52W high
              </span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading && (
            <div className="space-y-1.5 md:space-y-2 p-2 md:p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-10 md:h-12 w-full" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-2 md:p-4 text-center text-xs md:text-sm text-red-600">
              {error}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="ml-2 text-[10px] md:text-xs h-7 md:h-auto"
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && displayData.length === 0 && (
            <div className="p-2 md:p-4 text-center text-xs md:text-sm text-muted-foreground">
              No stocks found
            </div>
          )}

          {!loading && !error && displayData.length > 0 && (
            <div className="divide-y">
              {displayData.map((stock, index) => renderStockRow(stock, index))}
            </div>
          )}

          {!loading && !error && displayData.length > 0 && !showMore && (
            <div className="p-2 md:p-3 border-t text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMore(true)}
                className="text-[11px] md:text-xs h-8 md:h-auto w-full md:w-auto"
              >
                Show More
              </Button>
            </div>
          )}

          {!loading && !error && displayData.length > 0 && showMore && (
            <div className="p-2 md:p-3 border-t text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMore(false)}
                className="text-[11px] md:text-xs h-8 md:h-auto w-full md:w-auto"
              >
                Show Less
              </Button>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  )
}

export default FiftyTwoWeekView
