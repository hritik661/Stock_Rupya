"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getETFConstituents, getTotalAllocation, type ETFConstituent } from "@/lib/etf-holdings"

interface ETFHoldingsProps {
  symbol: string
}

export function ETFHoldings({ symbol }: ETFHoldingsProps) {
  const constituents = getETFConstituents(symbol)
  const totalAllocation = getTotalAllocation(symbol)

  if (constituents.length === 0) {
    return null
  }

  // Sort by allocation descending
  const sorted = [...constituents].sort((a, b) => b.allocation - a.allocation)

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">ETF Constituents</CardTitle>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Holdings breakdown for this ETF (Total: {totalAllocation.toFixed(1)}%)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sorted.map((constituent: ETFConstituent, idx: number) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{constituent.symbol}</p>
                  <p className="text-xs text-muted-foreground">{constituent.name}</p>
                </div>
                <span className="font-semibold text-sm text-primary">{constituent.allocation.toFixed(1)}%</span>
              </div>
              {/* Allocation bar */}
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  style={{ width: `${Math.min(100, constituent.allocation)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        <div className="mt-6 pt-6 border-t border-border/50 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Top Holding</p>
            <p className="font-semibold text-sm">{sorted[0]?.symbol}</p>
            <p className="text-xs text-primary">{sorted[0]?.allocation.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Holdings</p>
            <p className="font-semibold text-sm">{constituents.length}</p>
            <p className="text-xs text-muted-foreground">constituents</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
