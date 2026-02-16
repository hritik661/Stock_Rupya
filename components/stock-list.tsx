
"use client"

import { useState, useEffect } from "react"
import { INDIAN_STOCKS, SECTORS } from "@/lib/stocks-data"
import { fetchMultipleQuotes, fetchChartData, type StockQuote, type ChartData } from "@/lib/yahoo-finance"
import { formatCurrency } from "@/lib/market-utils"
import { StockCard } from "./stock-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function StockList() {
  // Show more/less logic
  const [stocks, setStocks] = useState<StockQuote[]>([])
  const [showAllStocks, setShowAllStocks] = useState(false)

  const [visibleCount, setVisibleCount] = useState(8) // Show 8 by default for desktop, 4 for mobile
  // Fixed number of Most Traded to show (top 20 by volume)
  const MOST_TRADED_COUNT = 20
  const [showAllTraded, setShowAllTraded] = useState(false)
  const [chartDataMap, setChartDataMap] = useState<Record<string, ChartData[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSector, setSelectedSector] = useState("All")

    // Set visibleCount and mostTradedVisibleCount based on screen size after mount
    // Handle resize and showAll toggle (does NOT reference stocks)
    useEffect(() => {
      const updateVisibleCount = () => {
        const mobile = window.innerWidth < 768
        setVisibleCount(mobile ? 4 : 8);
        // reset showAllTraded when resizing to avoid showing full list unexpectedly
        setShowAllTraded(false)
      };
      updateVisibleCount();
      window.addEventListener('resize', updateVisibleCount);
      return () => window.removeEventListener('resize', updateVisibleCount);
    }, []);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true)
        setError(null)
        let filteredStocks = INDIAN_STOCKS
        if (selectedSector !== "All") {
          filteredStocks = filteredStocks.filter((s) => s.sector === selectedSector)
        }
        // If "All", fetch top 250 stocks; otherwise fetch top 12
        const limit = selectedSector === "All" ? Math.min(250, filteredStocks.length) : 12
        const symbols = filteredStocks.slice(0, limit).map((s) => s.symbol)
        let data = []
        try {
          data = await fetchMultipleQuotes(symbols)
        } catch (apiErr) {
          console.error("API fetch error:", apiErr)
        }
        // Fallback to local data if API fails
        if (!data || data.length === 0) {
          data = filteredStocks.map(s => ({
            symbol: s.symbol,
            shortName: s.name,
            longName: s.name,
            regularMarketPrice: 0,
            regularMarketChange: 0,
            regularMarketChangePercent: 0,
            regularMarketPreviousClose: 0,
            regularMarketOpen: 0,
            regularMarketDayHigh: 0,
            regularMarketDayLow: 0,
            regularMarketVolume: 0,
            marketCap: 0,
            fiftyTwoWeekHigh: 0,
            fiftyTwoWeekLow: 0,
            averageVolume: 0,
            currency: "INR"
          }))
          setError("Live market data unavailable. Showing local stock list only.")
        }
        // Sort stocks: gainers first (highest %), then losers (most negative %)
        let sortedStocks
        if (selectedSector === "All") {
          const gainers = data.filter(s => (s.regularMarketChangePercent || 0) > 0).sort((a, b) => (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0))
          const losers = data.filter(s => (s.regularMarketChangePercent || 0) <= 0).sort((a, b) => (a.regularMarketChangePercent || 0) - (b.regularMarketChangePercent || 0))
          sortedStocks = [...gainers, ...losers]
        } else if (selectedSector === "Top Gainers") {
          sortedStocks = data.sort((a, b) => (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0))
        } else if (selectedSector === "Top Losers") {
          sortedStocks = data.sort((a, b) => (a.regularMarketChangePercent || 0) - (b.regularMarketChangePercent || 0))
        } else {
          sortedStocks = data.sort((a, b) => (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0))
        }
        setStocks(sortedStocks)
        // Fetch mini chart data ONLY for first 12 visible stocks to optimize performance
        const chartPromises = sortedStocks.slice(0, 12).map(async (stock) => {
          try {
            const chartData = await fetchChartData(stock.symbol, "1W")
            return { symbol: stock.symbol, data: chartData }
          } catch {
            return { symbol: stock.symbol, data: [] }
          }
        })
        const chartResults = await Promise.all(chartPromises)
        const chartMap: Record<string, ChartData[]> = {}
        chartResults.forEach((result) => {
          chartMap[result.symbol] = result.data
        })
        setChartDataMap(chartMap)
      } catch (err) {
        console.error("[v0] Error fetching stocks:", err)
        setError("Failed to load stock data. Please refresh the page. " + (err?.message || ''))
      } finally {
        setLoading(false)
      }
    }
    fetchStocks()
  }, [selectedSector])

  return (
    <div>
      <div className="relative mb-4 md:mb-8">
        <div className="flex gap-1.5 flex-wrap p-2 md:p-3 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
          {/* Show All Stocks button */}
          <button
            onClick={() => setSelectedSector("All")}
            className={cn(
              "px-2 py-1 md:px-4 md:py-3 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-black via-gray-900 to-gray-800 text-white shadow-lg border border-gray-700",
              selectedSector === "All" ? "scale-105 ring-2 ring-yellow-400" : "bg-secondary/80 text-secondary-foreground hover:bg-secondary hover:border-border hover:scale-105",
            )}
            style={{letterSpacing: '0.02em'}}
          >
            All Stocks
          </button>
          {/* Show sector buttons including Top Gainers and Top Losers */}
          {SECTORS.filter(sector => sector !== "All").map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={cn(
                "px-2 py-1 md:px-4 md:py-3 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200",
                "border border-transparent shadow-sm",
                selectedSector === sector
                  ? "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white scale-105"
                  : "bg-secondary/80 text-secondary-foreground hover:bg-secondary hover:border-border hover:scale-105",
              )}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-2">
          {[...Array(visibleCount)].map((_, i) => (
            <Skeleton key={i} className="h-8 md:h-10 rounded-lg p-0.5" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-secondary/20 rounded-2xl border border-dashed border-border">
          <p className="text-muted-foreground mb-4">{error.includes('No market data') ? 'No results found for your search.' : error}</p>
          <button onClick={() => window.location.reload()} className="text-primary hover:underline font-medium">
            Try Refreshing
          </button>
        </div>
      ) : stocks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No results found for your search.</p>
        </div>
      ) : (
        <>
          {/* All Stocks - show more/less, no logo, consistent box size, no duplicates */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8`}>
            {Array.from(new Map(stocks.map(s => [s.symbol, s])).values())
              .slice(0, showAllStocks ? stocks.length : visibleCount)
              .map((stock) => (
                <StockCard
                  key={stock.symbol}
                  stock={stock}
                  chartData={chartDataMap[stock.symbol]?.map((d) => ({ timestamp: d.timestamp, close: d.close }))}
                  hideLogo={true}
                  largeCard={true}
                />
              ))}
          </div>
          {stocks.length > visibleCount && (
            <div className="flex justify-center mt-4">
              <button
                className="px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded bg-black text-white hover:bg-gray-900 transition font-semibold"
                onClick={() => setShowAllStocks((prev) => !prev)}
                style={{backgroundColor: '#111'}}
              >
                {showAllStocks ? 'Show Less' : 'Show More'}
              </button>
            </div>
          )}
          {/* Most Traded - normal style, no box, show more/less, no logo, consistent box size, no duplicate Show More, basic CSS */}
          <div className="mt-8">
            <h2 className="text-lg md:text-xl font-bold mb-2 text-yellow-600 tracking-wide">Most Traded Stocks (Top 20)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 bg-black/10 p-2 md:p-4 rounded-xl border border-yellow-700">
              {Array.from(new Map(stocks.sort((a, b) => (b.regularMarketVolume || 0) - (a.regularMarketVolume || 0)).map(s => [s.symbol, s])).values())
                .slice(0, showAllTraded ? MOST_TRADED_COUNT : visibleCount)
                .map((stock) => (
                    <StockCard
                      key={stock.symbol}
                      stock={stock}
                      chartData={chartDataMap[stock.symbol]?.map((d) => ({ timestamp: d.timestamp, close: d.close }))}
                      hideLogo={true}
                      largeCard={true}
                      noBox={true}
                    />
                ))}
            </div>
            {MOST_TRADED_COUNT > visibleCount && (
              <div className="flex justify-center mt-4">
                <button
                  className="px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded bg-black text-white hover:bg-gray-900 transition font-semibold"
                  onClick={() => setShowAllTraded((prev) => !prev)}
                  style={{backgroundColor: '#111'}}
                >
                  {showAllTraded ? 'Show Less' : 'Show More'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
