"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/market-utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CandlestickChart } from "@/components/candlestick-chart"
import { LineChart } from "@/components/line-chart"
import { TrendingUp, TrendingDown, Activity, Volume2 } from "lucide-react"


interface OptionChainProps {
  stockPrice: number
  symbol: string
  onTrade: (action: "BUY" | "SELL", type: "CE" | "PE", strike: number, price: number) => void
  onStockTrade?: (action: "BUY" | "SELL", price: number) => void
}

export function OptionChain({ stockPrice, symbol, onTrade, onStockTrade }: OptionChainProps) {
  const [expiry, setExpiry] = useState("Current Week")

  const strikes = useMemo(() => {
    const spot = Math.round(stockPrice / 50) * 50
    const list = []
    for (let i = -8; i <= 8; i++) {
      const strike = spot + i * 50
      const dist = Math.abs(strike - stockPrice)
      const cePrice = Math.max(5, (stockPrice - strike) * 0.8 + 50 - dist * 0.2)
      const pePrice = Math.max(5, (strike - stockPrice) * 0.8 + 50 - dist * 0.2)

      list.push({
        strike,
        cePrice,
        pePrice,
        ceChange: (Math.random() - 0.4) * 20,
        peChange: (Math.random() - 0.4) * 20,
        ceOI: Math.floor(Math.random() * 50000) + 10000,
        peOI: Math.floor(Math.random() * 50000) + 10000,
        ceVolume: Math.floor(Math.random() * 10000) + 1000,
        peVolume: Math.floor(Math.random() * 10000) + 1000,
        ceIV: (15 + Math.random() * 30).toFixed(2),
        peIV: (15 + Math.random() * 30).toFixed(2),
        isATM: Math.abs(strike - stockPrice) < 25,
        isITM: i < 0,
      })
    }
    return list
  }, [stockPrice])

  const [chartOpen, setChartOpen] = useState<null | { type: "CE" | "PE"; strike: number; price: number }>(null)

  const generateOptionChart = (price: number, points = 40) => {
    const data: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[] = []
    let last = price
    const now = Math.floor(Date.now() / 1000)
    for (let i = points - 1; i >= 0; i--) {
      const t = now - i * 3600 * 6
      const volatility = Math.max(0.01, price * 0.02)
      const change = (Math.random() - 0.5) * volatility
      const open = Math.max(0.1, last + change)
      const close = Math.max(0.1, open + (Math.random() - 0.5) * volatility)
      const high = Math.max(open, close) + Math.random() * volatility
      const low = Math.min(open, close) - Math.random() * volatility
      const volume = Math.floor(Math.random() * 10000) + 100
      data.push({ timestamp: t, open, high, low, close, volume })
      last = close
    }
    return data
  }

  return (
    <Card className="border-2 border-primary/40 mt-6 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-xl font-bold mb-1">Option Chain - {symbol.replace(".NS", "")}</CardTitle>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Spot Price: <span className="font-mono font-semibold text-foreground">{formatCurrency(stockPrice)}</span>
            </p>
            {onStockTrade && (
              <div className="flex gap-1">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-7 px-3 text-xs"
                  onClick={() => onStockTrade("BUY", stockPrice)}
                >
                  BUY
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold h-7 px-3 text-xs"
                  onClick={() => onStockTrade("SELL", stockPrice)}
                >
                  SELL
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {["Current Week", "Next Week", "Monthly"].map((e) => (
            <Badge
              key={e}
              variant={expiry === e ? "default" : "outline"}
              className="cursor-pointer px-4 py-1.5"
              onClick={() => setExpiry(e)}
            >
              {e}
            </Badge>
          ))}
        </div>
      </CardHeader>
      {/* Chart Dialog */}
      <Dialog open={!!chartOpen} onOpenChange={() => setChartOpen(null)}>
        <DialogContent className="max-w-5xl min-w-[320px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {chartOpen ? `${chartOpen.type} ${symbol.replace('.NS','')} ${chartOpen.strike} Analysis` : "Chart"}
            </DialogTitle>
          </DialogHeader>
          {chartOpen && (
            <Tabs defaultValue="candlestick" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="candlestick">Candlestick</TabsTrigger>
                <TabsTrigger value="line">Line Chart</TabsTrigger>
              </TabsList>
              <TabsContent value="candlestick" className="mt-4">
                <div className="p-2">
                  <CandlestickChart data={generateOptionChart(chartOpen.price, 80) as any} currentRange={"1M"} />
                </div>
              </TabsContent>
              <TabsContent value="line" className="mt-4">
                <div className="p-2">
                  <LineChart data={generateOptionChart(chartOpen.price, 80) as any} currentRange={"1M"} />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border bg-secondary/50">
                <TableHead
                  colSpan={5}
                  className="text-center bg-primary/10 text-primary font-bold text-base border-r border-border"
                >
                  CALLS (CE)
                </TableHead>
                <TableHead className="text-center bg-secondary/50 font-bold text-base border-r border-border">
                  STRIKE
                </TableHead>
                <TableHead colSpan={5} className="text-center bg-destructive/10 text-destructive font-bold text-base">
                  PUTS (PE)
                </TableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent border-border bg-secondary/30 text-xs">
                <TableHead className="text-center">OI</TableHead>
                <TableHead className="text-center">CHNG</TableHead>
                <TableHead className="text-center">VOL</TableHead>
                <TableHead className="text-center">IV</TableHead>
                <TableHead className="text-center border-r border-border">LTP</TableHead>
                <TableHead className="text-center bg-secondary/30 font-bold border-r border-border">PRICE</TableHead>
                <TableHead className="text-center">LTP</TableHead>
                <TableHead className="text-center">IV</TableHead>
                <TableHead className="text-center">VOL</TableHead>
                <TableHead className="text-center">CHNG</TableHead>
                <TableHead className="text-center">OI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {strikes.map((s) => (
                <TableRow
                  key={s.strike}
                  className={`border-border transition-colors ${
                    s.isATM ? "bg-accent/10 font-semibold" : s.isITM ? "bg-primary/5" : "hover:bg-secondary/20"
                  }`}
                >
                  {/* CE Data */}
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {(s.ceOI / 1000).toFixed(1)}k
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    <div
                      className={`inline-flex items-center gap-0.5 ${s.ceChange >= 0 ? "text-primary" : "text-destructive"}`}
                    >
                      {s.ceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(s.ceChange).toFixed(1)}%
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {(s.ceVolume / 1000).toFixed(1)}k
                  </TableCell>
                  <TableCell className="text-center text-xs font-mono text-muted-foreground">{s.ceIV}%</TableCell>
                  <TableCell className="text-center border-r border-border">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold h-9 px-4 text-sm border-2 border-green-500 shadow-md"
                        onClick={() => onTrade("BUY", "CE", s.strike, s.cePrice)}
                      >
                        BUY
                      </Button>
                      <span className="flex flex-col items-center">
                        <span className="flex items-center gap-1">
                          <span className="text-sm font-mono font-bold text-foreground">
                            ₹{formatCurrency(s.cePrice).replace("₹", "")}
                          </span>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 md:h-10 md:w-10 p-0 ml-2 text-sm md:text-base font-bold border-2 border-green-500 text-white bg-green-600 hover:bg-green-700 shadow-md"
                            title="Quick Buy"
                            onClick={() => onTrade("BUY", "CE", s.strike, s.cePrice)}
                          >
                            B
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 md:h-10 md:w-10 p-0 ml-1 text-sm md:text-base font-bold border-2 border-red-500 text-white bg-red-600 hover:bg-red-700 shadow-md"
                            title="Quick Sell"
                            onClick={() => onTrade("SELL", "CE", s.strike, s.cePrice)}
                          >
                            S
                          </Button>
                        </span>
                        <span className="text-xs text-muted-foreground">LTP</span>
                      </span>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white font-bold h-9 px-4 text-sm border-2 border-red-500 shadow-md"
                        onClick={() => onTrade("SELL", "CE", s.strike, s.cePrice)}
                      >
                        SELL
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 ml-2 hover:bg-secondary border"
                        onClick={() => setChartOpen({ type: "CE", strike: s.strike, price: s.cePrice })}
                      >
                        📈
                      </Button>
                    </div>
                  </TableCell>

                  {/* Strike Price */}
                  <TableCell
                    className={`text-center font-bold font-mono text-base border-r border-border ${
                      s.isATM ? "bg-accent/20 text-accent-foreground" : "bg-secondary/20"
                    }`}
                  >
                    {s.strike}
                    {s.isATM && (
                      <Badge variant="secondary" className="ml-2 text-[9px] px-1 py-0">
                        ATM
                      </Badge>
                    )}
                  </TableCell>

                  {/* PE Data */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 mr-2 hover:bg-secondary border"
                        onClick={() => setChartOpen({ type: "PE", strike: s.strike, price: s.pePrice })}
                      >
                        📈
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold h-9 px-4 text-sm border-2 border-green-500 shadow-md"
                        onClick={() => onTrade("BUY", "PE", s.strike, s.pePrice)}
                      >
                        BUY
                      </Button>
                      <span className="flex flex-col items-center">
                        <span className="flex items-center gap-1">
                          <span className="text-sm font-mono font-bold text-foreground">
                            ₹{formatCurrency(s.pePrice).replace("₹", "")}
                          </span>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 md:h-10 md:w-10 p-0 ml-2 text-sm md:text-base font-bold border-2 border-green-500 text-white bg-green-600 hover:bg-green-700 shadow-md"
                            title="Quick Buy"
                            onClick={() => onTrade("BUY", "PE", s.strike, s.pePrice)}
                          >
                            B
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 md:h-10 md:w-10 p-0 ml-1 text-sm md:text-base font-bold border-2 border-red-500 text-white bg-red-600 hover:bg-red-700 shadow-md"
                            title="Quick Sell"
                            onClick={() => onTrade("SELL", "PE", s.strike, s.pePrice)}
                          >
                            S
                          </Button>
                        </span>
                        <span className="text-xs text-muted-foreground">LTP</span>
                      </span>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white font-bold h-9 px-4 text-sm border-2 border-red-500 shadow-md"
                        onClick={() => onTrade("SELL", "PE", s.strike, s.pePrice)}
                      >
                        SELL
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs font-mono text-muted-foreground">{s.peIV}%</TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {(s.peVolume / 1000).toFixed(1)}k
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    <div
                      className={`inline-flex items-center gap-0.5 ${s.peChange >= 0 ? "text-primary" : "text-destructive"}`}
                    >
                      {s.peChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(s.peChange).toFixed(1)}%
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {(s.peOI / 1000).toFixed(1)}k
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 py-4 text-xs text-muted-foreground border-t border-border bg-secondary/20">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3" />
            <span>OI: Open Interest</span>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className="h-3 w-3" />
            <span>VOL: Volume</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3" />
            <span>CHNG: % Change</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono">IV: Implied Volatility</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono">LTP: Last Traded Price</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
