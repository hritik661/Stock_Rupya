"use client"

import { TrendingUp, TrendingDown, Zap, Target } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { LogoImage } from "./logo-image"

interface StockInfoCardProps {
  symbol: string
  company: string
  currentPrice: number
  prediction: number
  confidence: number
  trend: "up" | "down"
  index?: number
}

export function StockInfoCard({
  symbol,
  company,
  currentPrice,
  prediction,
  confidence,
  trend,
  index = 0,
}: StockInfoCardProps) {
  // Ensure numeric values are not NaN
  const safeCurrentPrice = isNaN(currentPrice) ? 0 : currentPrice
  const safePrediction = isNaN(prediction) ? 0 : prediction
  
  const change = safePrediction - safeCurrentPrice
  const changePercent = ((change / safeCurrentPrice) * 100).toFixed(2)
  const isPositive = change >= 0

  return (
    <Card
      className="bg-gradient-to-br from-card/80 to-card/40 hover:border-border/70 overflow-hidden transition-all duration-300 animate-fade-in-up card-hover group border-2 border-border/50"
      style={{ animationDelay: `${index * 80}ms` }}
    >

      <CardContent className="p-5 md:p-6 relative">
        {/* Logo Box - Top Right Corner */}
        <div className="absolute top-4 right-5 w-16 h-16 flex items-center justify-center overflow-hidden">
          <LogoImage
            symbol={symbol}
            name={company}
            size={48}
            className="w-14 h-14 object-contain"
            alt={company}
          />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4 md:mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-foreground">{symbol}</h3>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">{company}</span>
            </div>
            <p className="text-sm text-muted-foreground">Current: ₹{safeCurrentPrice.toFixed(2)}</p>
          </div>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center`}>
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
          </div>
        </div>

        {/* Prediction Info */}
        <div className="glass-morphism rounded-lg p-4 md:p-5 mb-4 md:mb-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                <Target className="h-4 w-4" /> Predicted Price
              </p>
              <p className={`text-lg md:text-xl font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                ₹{safePrediction.toFixed(2)}
              </p>
              <p className={`text-xs md:text-sm font-medium ${isPositive ? "text-green-500/80" : "text-red-500/80"}`}>
                {isPositive ? "+" : ""}{changePercent}%
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                <Zap className="h-4 w-4" /> Confidence
              </p>
              <p className="text-lg md:text-xl font-bold text-primary">{confidence}%</p>
              <div className="w-full bg-secondary/50 rounded-full h-1.5 mt-2">
                <div className="bg-gradient-to-r from-primary to-accent h-1.5 rounded-full transition-all duration-300" style={{ width: `${confidence}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div className="text-xs md:text-sm p-2.5 md:p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-muted-foreground mb-0.5">Expected Change</p>
            <p className={`font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
              ₹{Math.abs(change).toFixed(2)}
            </p>
          </div>
          <div className="text-xs md:text-sm p-2.5 md:p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-muted-foreground mb-0.5">Timeframe</p>
            <p className="font-bold text-primary">48 Hours</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
