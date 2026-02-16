"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import type { StockQuote } from "@/lib/yahoo-finance"
import { formatCurrency, formatPercentage } from "@/lib/market-utils"
import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { MiniChart } from "./mini-chart"
import { INDIAN_STOCKS } from "@/lib/stocks-data"

interface StockCardProps {
  stock: StockQuote
  chartData?: Array<{ timestamp: number; close: number }>
}

export function StockCard({ stock, chartData, hideLogo, largeCard, noBox }: StockCardProps & { hideLogo?: boolean, largeCard?: boolean, noBox?: boolean }) {
  const isPositive = (stock.regularMarketChangePercent || 0) >= 0;
  // Card size logic
  const cardSize = largeCard
    ? 'min-h-[130px] md:min-h-[180px] h-[140px] md:h-[200px] p-3 md:p-5'
    : 'min-h-[90px] md:min-h-[120px] h-[110px] md:h-[150px] p-2 md:p-3';
  // Boxless style
  const cardBox = noBox ? 'border-none bg-transparent shadow-none' : `border-2 border-border/50 bg-gradient-to-br from-card/80 to-card/40 hover:border-border/70 hover:shadow-lg transition-all ${isPositive ? "hover:border-green-500/60" : "hover:border-red-500/60"}`;
  return (
    <Link href={`/stock/${encodeURIComponent(stock.symbol)}`}>
      <Card
        className={`group transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl cursor-pointer overflow-hidden relative flex flex-col justify-between ${cardSize} ${cardBox}`}
      >
        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Header with Symbol, %, and Logo (logo hidden if hideLogo) */}
          <div className="flex items-center justify-between gap-1 md:gap-2 mb-0.5 md:mb-2">
            <div className="space-y-0.5 min-w-0 flex-1">
              {/* SYMBOL + % BADGE */}
              <div className="flex items-center gap-0.5 md:gap-1">
                <h3 className="font-bold text-xs md:text-base tracking-tight">
                  {stock.symbol.replace(".NS", "").replace(".BO", "").replace("^", "")}
                </h3>
                <div
                  className={`flex items-center gap-0.5 text-[9px] md:text-[10px] px-1 py-0.5 rounded-lg font-semibold
                    ${
                      isPositive
                        ? "bg-emerald-700/40 text-emerald-400 border border-emerald-600/80"
                        : "bg-red-500/20 text-red-500 border border-red-500/30"
                    }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  ) : (
                    <TrendingDown className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  )}
                  {formatPercentage(stock.regularMarketChangePercent)}
                </div>
              </div>
              <p className="text-[9px] md:text-xs text-muted-foreground truncate max-w-full group-hover:text-muted-foreground/80 transition-colors">
                {stock.shortName}
              </p>
            </div>
            {/* Logo hidden for all views if hideLogo is true */}
          </div>
          {/* Mini Chart */}
          {chartData && chartData.length > 0 && (
            <div className="h-6 md:h-10 mb-0.5 md:mb-2 -mx-0.5 md:-mx-1 px-0.5 md:px-1 py-0.5 bg-secondary/20 rounded-lg group-hover:bg-secondary/40 transition-colors">
              <MiniChart data={chartData} isPositive={isPositive} />
            </div>
          )}
          {/* Price Section */}
          <div className="space-y-0.5 md:space-y-1">
            <div className="space-y-0.5 md:space-y-1">
              <p className="text-base md:text-xl font-bold font-mono tracking-tight group-hover:text-primary transition-colors">
                {formatCurrency(stock.regularMarketPrice)}
              </p>
              <p
                className={`text-[11px] md:text-sm font-semibold flex items-center gap-1 ${
                  isPositive ? "text-emerald-400" : "text-red-500"
                }`}
              >
                {isPositive ? "+" : ""}
                {formatCurrency(stock.regularMarketChange).replace("₹", "")}
              </p>
            </div>
            <div className="pt-0.5 border-t border-border/30 space-y-0.5 md:space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] md:text-xs text-muted-foreground">Volume</span>
                <span className="text-[10px] md:text-xs font-mono font-semibold text-foreground">
                  {(stock.regularMarketVolume / 1_000_000).toFixed(2)}M
                </span>
              </div>
              {stock.marketCap && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs text-muted-foreground">Market Cap</span>
                  <span className="text-[10px] md:text-xs font-mono font-semibold text-foreground">
                    {stock.marketCap > 1_000_000_000 ? `₹${(stock.marketCap / 1_000_000_000).toFixed(1)}B` : `₹${(stock.marketCap / 1_000_000).toFixed(0)}M`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
