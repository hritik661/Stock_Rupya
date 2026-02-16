"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useBalance } from "@/hooks/use-balance"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/market-utils"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { CandlestickChart } from "@/components/candlestick-chart"
import { StockChart } from "@/components/stock-chart"
import { BarChart3, Activity } from "lucide-react"
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
} from "recharts"

import { TradePanel } from "@/components/trade-panel"
import { LogoImage } from "@/components/logo-image"
import { Zap } from "lucide-react"

interface StockPrediction {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  predictedGrowth: number
  confidence: number
  timeframe: string
  signal: string
  sector: string
}

// Company logo mappings
const STOCK_LOGO_MAP: Record<string, string> = {
  'TCS': 'tcs.com',
  'INFY': 'infosys.com',
  'WIPRO': 'wipro.com',
  'HCLTECH': 'hcltech.com',
  'TECHM': 'techmahindra.com',
  'LTIM': 'ltimindtree.com',
  'HDFCBANK': 'hdfcbank.com',
  'ICICIBANK': 'icicibank.com',
  'SBIN': 'sbin.in',
  'KOTAKBANK': 'kotak.com',
  'AXISBANK': 'axisbank.com',
  'INDUSINDBK': 'indusindbank.com',
  'MARUTI': 'maruti.co.in',
  'M&M': 'mahindra.com',
  'RELIANCE': 'ril.com',
  'BHARTIARTL': 'airtel.in',
  'ITC': 'itcportal.com',
  'NESTLEIND': 'nestle.in',
  'LT': 'larsentoubro.com',
  'ASIANPAINT': 'asianpaints.com',
  'SUNPHARMA': 'sunpharma.com',
  'BAJAJ-AUTO': 'bajajauto.com',
  'HEROMOTOCO': 'heromotocorp.com',
  'EICHERMOT': 'eichermotors.com',
  'TATAMOTORS': 'tatamotors.com',
  'PNB': 'pnbindia.in',
  'BANKBARODA': 'bankofbaroda.in',
  'IDFCFIRSTB': 'idfcfirstbank.com',
  'BANDHANBNK': 'bandhanbank.com',
}

const getCompanyLogoUrl = (symbol: string) => {
  const cleanSymbol = symbol.replace(".NS", "").replace(".BO", "").replace("^", "")
  const domain = STOCK_LOGO_MAP[cleanSymbol]
  
  if (!domain) {
    return `https://logo.duckduckgo.com/?domain=${cleanSymbol.toLowerCase()}.com&size=large`
  }
  
  return `https://logo.duckduckgo.com/?domain=${domain}&size=large`
}

function generateStockChartData(basePrice: number, range: string) {
  const dataPoints = range === "1D" ? 78 : range === "1W" ? 84 : range === "1M" ? 30 : 90
  const volatility = range === "1D" ? 0.005 : range === "1W" ? 0.01 : 0.015
  const data = []
  let price = basePrice * (1 - volatility * 5)

  const now = Date.now()
  const interval = range === "1D" ? 5 * 60 * 1000 : range === "1W" ? 2 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000

  for (let i = 0; i < dataPoints; i++) {
    const change = (Math.random() - 0.45) * basePrice * volatility
    price = Math.max(price + change, basePrice * 0.85)
    const timestamp = Math.floor((now - (dataPoints - i) * interval) / 1000)

    const open = price
    const close = price + (Math.random() - 0.5) * basePrice * volatility * 0.5
    const high = Math.max(open, close) + Math.random() * basePrice * volatility * 0.3
    const low = Math.min(open, close) - Math.random() * basePrice * volatility * 0.3

    data.push({ timestamp, open, high, low, close, volume: Math.floor(Math.random() * 1000000) + 100000 })
  }
  return data
}

export function PredictionsList() {
  const { user, markPredictionsAsPaid, updateBalance } = useAuth()
  const { deductBalance, addBalance } = useBalance()
  const { toast } = useToast()

  // Guard: If no user at all, return nothing
  // Otherwise show predictions (page is the gatekeeper for isPredictionPaid)
  if (!user) {
    console.warn('🔒 PredictionsList blocked - no user logged in')
    return null
  }
  
  const [predictions, setPredictions] = useState<StockPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [displayCount, setDisplayCount] = useState(50) // Show 50 initially for faster load

  const [selectedStock, setSelectedStock] = useState<StockPrediction | null>(null)
  const [chartRange, setChartRange] = useState("1M")
  const [chartType, setChartType] = useState<"line" | "candlestick">("candlestick")
  const [showTradeFullscreen, setShowTradeFullscreen] = useState(false)
  const [tradeInitialTab, setTradeInitialTab] = useState<'buy' | 'sell' | null>(null)
  const [tradePopup, setTradePopup] = useState<{ visible: boolean; message?: string }>({ visible: false })
  const [quantityDialog, setQuantityDialog] = useState<{ visible: boolean; stock: StockPrediction | null; type: 'buy' | 'sell' | null; quantity: string }>({ visible: false, stock: null, type: null, quantity: '1' })
  const router = useRouter()
  

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const { INDIAN_STOCKS } = await import("@/lib/stocks-data")
        const { quoteCache } = await import("@/lib/cache-utils")
        const { fetchMultipleQuotes } = await import("@/lib/yahoo-finance")
        
        // Fetch all stocks and show predictions for strong movers (>= 5%)
        const allSymbols = INDIAN_STOCKS.map(stock => stock.symbol)
        const cacheKey = `predictions:5percent_all`
        
        // Use cache with request deduplication for ultra-fast response
        const quotes = await quoteCache.withDedup(
          cacheKey,
          () => fetchMultipleQuotes(allSymbols),
          45000 // Cache for 45 seconds
        )

        const mockPredictions = quotes.map((stock: any) => ({
          symbol: stock.symbol || "UNKNOWN",
          name: stock.shortName || stock.symbol || "Stock",
          price: isNaN(stock.regularMarketPrice) ? 0 : stock.regularMarketPrice || 0,
          change: isNaN(stock.regularMarketChange) ? 0 : stock.regularMarketChange || 0,
          changePercent: isNaN(stock.regularMarketChangePercent) ? 0 : stock.regularMarketChangePercent || 0,
          predictedGrowth: 8 + Math.random() * 7,
          confidence: 90 + Math.random() * 5,
          timeframe: "48h",
          signal: "Strong Buy",
          sector: "Various",
        }))

        // Keep only stocks with >=5% change and limit to 100 results
        const strongProfitablePredictions = mockPredictions.filter(stock => 
          stock.changePercent >= 5
        ).slice(0, 100) // Show up to 100 strong gainers as predictions

        const sortedPredictions = strongProfitablePredictions.sort((a, b) => {
          return b.changePercent - a.changePercent
        })

        setPredictions(sortedPredictions)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching predictions:", error)
        setLoading(false)
      }
    }

    if (user) {
      fetchPredictions()
      // Refresh every 3 minutes
      const interval = setInterval(fetchPredictions, 180000)
      return () => clearInterval(interval)
    }
  }, [user])

  // Poll quotes periodically to keep 'current price' up-to-date
  useEffect(() => {
    if (!user || predictions.length === 0) return

    let mounted = true

    const fetchLatestPrices = async () => {
      try {
        const symbols = predictions.map((p) => p.symbol).join(",")
        const res = await fetch(`/api/stock/quotes?symbols=${encodeURIComponent(symbols)}`)
        const data = await res.json()
        const quotesArray = Array.isArray(data) ? data : Object.values(data)

        if (!mounted) return

        setPredictions((prev) =>
          prev.map((p) => {
            const q: any = quotesArray.find((s: any) => s.symbol === p.symbol || s.symbol === p.symbol.replace('.NS', ''))
            if (!q) return p
            const updated = {
              ...p,
              price: isNaN(q.regularMarketPrice) ? p.price : q.regularMarketPrice ?? p.price,
              change: isNaN(q.regularMarketChange) ? p.change : q.regularMarketChange ?? p.change,
              changePercent: isNaN(q.regularMarketChangePercent) ? p.changePercent : q.regularMarketChangePercent ?? p.changePercent,
            }
            return updated
            }).filter((p) => p.changePercent >= 5) // Remove stocks that fell below 5%
        )

        // update selected stock price if visible
        setSelectedStock((prev) => {
          if (!prev) return prev
          const q: any = quotesArray.find((s: any) => s.symbol === prev.symbol || s.symbol === prev.symbol.replace('.NS', ''))
          if (!q) return prev
          return {
            ...prev,
            price: q.regularMarketPrice ?? prev.price,
            change: q.regularMarketChange ?? prev.change,
            changePercent: q.regularMarketChangePercent ?? prev.changePercent,
          }
        })
      } catch (err) {
        console.error('Error polling latest prices', err)
      }
    }

    // fetch immediately, then poll
    fetchLatestPrices()
    const id = setInterval(fetchLatestPrices, 15000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [user, predictions.length, setPredictions, setSelectedStock])

  // show a transient popup when a trade completes (buy/sell)
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const d = e?.detail
        if (!d) return
        const sym = d.symbol ? d.symbol.replace('.NS', '') : ''
        const msg = d.type === 'buy' ? `Bought ${d.quantity} ${sym}` : `Sold ${d.quantity} ${sym}`
        setTradePopup({ visible: true, message: msg })
        setTimeout(() => setTradePopup({ visible: false }), 3000)
      } catch (err) {
        // ignore
      }
    }
    window.addEventListener('tradeCompleted', handler)
    return () => window.removeEventListener('tradeCompleted', handler)
  }, [])

  

  const chartData = useMemo(() => {
    if (!selectedStock) return []
    return generateStockChartData(selectedStock.price, chartRange)
  }, [selectedStock, chartRange])

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    if (chartRange === "1D") {
      return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    }
    if (chartRange === "1W" || chartRange === "1M") {
      return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    }
    return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
  }


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Analyzing market signals...</p>
      </div>
    )
  }

  // CRITICAL: Block any stock display if user has NOT explicitly paid
  if (!user || user.isPredictionPaid !== true) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">🔒</div>
          <h2 className="text-3xl font-bold">Premium Access Required</h2>
          <p className="text-lg text-muted-foreground">
            All 1000+ stock predictions are locked behind a payment wall.
          </p>
          <p className="text-base text-muted-foreground font-semibold">
            ✓ Just ₹100 lifetime access
          </p>
        </div>
      </div>
    )
  }

  // Quick buy/sell helpers (used when clicking Buy/Sell on prediction cards)

  const quickBuy = async (stock: StockPrediction, qty = 1) => {
    if (!user) {
      toast({ title: 'Login required', description: 'Please sign in to place trades', variant: 'destructive' })
      return
    }
    if (qty < 1) {
      toast({ title: 'Enter Quantity', description: 'Please enter a valid quantity to buy', variant: 'destructive' })
      return
    }
    const totalCost = qty * (isNaN(stock.price) ? 0 : stock.price || 0)
    if (totalCost > user.balance) {
      // insufficient balance — show toast and dispatch event for UI
      toast({ title: 'Insufficient Balance', description: `You need ${ (totalCost - user.balance).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) } more to buy.`, variant: 'destructive' })
      try {
        window.dispatchEvent(new CustomEvent("tradeCompleted", { detail: { symbol: stock.symbol, type: "buy", quantity: 0 } }))
      } catch {}
      return
    }

    try {
      const storageKey = user ? `holdings_${user.email}` : "holdings_guest"
      const raw = localStorage.getItem(storageKey) || "[]"
      const holdings: any[] = JSON.parse(raw)
      const idx = holdings.findIndex((h) => h.symbol === stock.symbol)
      if (idx >= 0) {
        const existing = holdings[idx]
        const newQuantity = existing.quantity + qty
        const newAvgPrice = (existing.avgPrice * existing.quantity + (stock.price || 0) * qty) / newQuantity
        holdings[idx] = { ...existing, quantity: newQuantity, avgPrice: newAvgPrice }
      } else {
        holdings.push({ symbol: stock.symbol, name: stock.name, quantity: qty, avgPrice: stock.price })
      }
      localStorage.setItem(storageKey, JSON.stringify(holdings))
      
      // Deduct balance using API
      const balanceResult = await deductBalance(totalCost, "BUY", stock.symbol, qty, stock.price)
      if (!balanceResult.success) {
        toast({ title: 'Transaction Failed', description: balanceResult.error, variant: 'destructive' })
        return
      }
      
      // notify UI
      try {
        window.dispatchEvent(new CustomEvent("tradeCompleted", { detail: { symbol: stock.symbol, type: "buy", quantity: qty } }))
      } catch {}
      toast({ title: 'Bought', description: `Bought ${qty} ${stock.symbol.split('.')[0]} for ${formatCurrency(totalCost)}` })
    } catch (e) {
      console.error("quickBuy error", e)
    }
  }

  const quickSell = async (stock: StockPrediction, qty = 1) => {
    if (!user) {
      toast({ title: 'Login required', description: 'Please sign in to sell holdings', variant: 'destructive' })
      return
    }
    if (qty < 1) {
      toast({ title: 'Enter Quantity', description: 'Please enter a valid quantity to sell', variant: 'destructive' })
      return
    }
    try {
      const storageKey = user ? `holdings_${user.email}` : "holdings_guest"
      const raw = localStorage.getItem(storageKey) || "[]"
      const holdings: any[] = JSON.parse(raw)
      const idx = holdings.findIndex((h) => h.symbol === stock.symbol)
      const current = idx >= 0 ? holdings[idx] : null
      if (!current || current.quantity < qty) {
        // can't sell
        toast({ title: 'Insufficient Shares', description: `You only have ${current?.quantity || 0} shares to sell.`, variant: 'destructive' })
        try {
          window.dispatchEvent(new CustomEvent("tradeCompleted", { detail: { symbol: stock.symbol, type: "sell", quantity: 0 } }))
        } catch {}
        return
      }
      const newQuantity = current.quantity - qty
      if (newQuantity <= 0) holdings.splice(idx, 1)
      else holdings[idx].quantity = newQuantity
      localStorage.setItem(storageKey, JSON.stringify(holdings))
      const totalValue = qty * (isNaN(stock.price) ? 0 : stock.price || 0)
      
      // Add balance using API
      const balanceResult = await addBalance(totalValue, "SELL", stock.symbol, qty, stock.price)
      if (!balanceResult.success) {
        toast({ title: 'Transaction Failed', description: balanceResult.error, variant: 'destructive' })
        return
      }
      
      try {
        window.dispatchEvent(new CustomEvent("tradeCompleted", { detail: { symbol: stock.symbol, type: "sell", quantity: qty } }))
      } catch {}
      toast({ title: 'Sold', description: `Sold ${qty} ${stock.symbol.split('.')[0]} for ${formatCurrency(totalValue)}` })
    } catch (e) {
      console.error("quickSell error", e)
    }
  }

  // Use shared CandlestickChart used by the stock page for consistent visuals

  return (
    <div className="space-y-6">
      {tradePopup.visible && (
        <div className="fixed top-20 right-6 z-50">
          <div className="bg-card border border-border px-4 py-3 rounded-lg shadow-lg">
            <div className="font-medium">{tradePopup.message}</div>
          </div>
        </div>
      )}

      {/* Quantity Dialog */}
      {quantityDialog.visible && quantityDialog.stock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {quantityDialog.type === 'buy' ? 'Buy' : 'Sell'} {quantityDialog.stock.symbol.split('.')[0]}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <input
                  type="text"
                  value={quantityDialog.quantity}
                  onChange={(e) => setQuantityDialog(prev => ({ ...prev, quantity: e.target.value.replace(/\D/g, '') }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                />

              </div>

              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per share</span>
                  <span className="font-mono">{formatCurrency(quantityDialog.stock.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total {quantityDialog.type === 'buy' ? 'Cost' : 'Value'}</span>
                  <span className="font-mono font-bold">{formatCurrency(quantityDialog.stock.price * (parseInt(quantityDialog.quantity || '0') || 0))}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    if (quantityDialog.type === 'buy') {
                      quickBuy(quantityDialog.stock!, parseInt(quantityDialog.quantity || '0') || 0)
                    } else {
                      quickSell(quantityDialog.stock!, parseInt(quantityDialog.quantity || '0') || 0)
                    }
                    setQuantityDialog({ visible: false, stock: null, type: null, quantity: '1' })
                  }}
                  className="flex-1"
                >
                  {quantityDialog.type === 'buy' ? 'Buy' : 'Sell'} {parseInt(quantityDialog.quantity || '0') || 0} Shares
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setQuantityDialog({ visible: false, stock: null, type: null, quantity: 1 })}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 items-stretch">
        {predictions.map((stock) => {
          const miniChart = generateStockChartData(stock.price, "1W").map((d) => ({
            time: d.timestamp,
            close: d.close,
          }))

          return (
            <div
              key={stock.symbol}
              className="p-3 md:p-4 lg:p-4 rounded-lg bg-card transition-colors cursor-pointer hover:shadow-lg overflow-hidden relative border border-primary/20"
              onClick={() => {
                    setSelectedStock(stock)
                    setChartRange("1M")
                    try { window.dispatchEvent(new CustomEvent('predictionSelected', { detail: { selected: true } })) } catch {}
                  }}
            >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="font-bold text-base md:text-lg lg:text-lg">{stock.symbol.split(".")[0]}</h3>
                  <p className="text-sm md:text-sm text-muted-foreground">{stock.name}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-lg md:text-xl lg:text-2xl">₹{stock.price ? stock.price.toLocaleString("en-IN") : "0"}</div>
                <div className={`text-sm md:text-sm lg:text-sm font-bold ${stock.change >= 0 ? "text-green-600 md:text-green-700" : "text-red-700 md:text-red-800"}`}>
                  {stock.change >= 0 ? "+" : ""}
                  {(stock.changePercent || 0).toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="mt-1">
              <div className="w-full h-10 md:h-12 lg:h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={miniChart}>
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={["dataMin", "dataMax"]} />
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.06} />
                      <Area type="monotone" dataKey="close" stroke="#06b6d4" strokeWidth={1.5} fill="#06b6d4" fillOpacity={0.08} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

              <div className="pt-2 md:pt-3 border-t border-border/50 flex items-center justify-between">
              <div className="px-2 py-1 md:px-3 md:py-1 rounded-full bg-emerald-900/10 text-emerald-800 text-xs md:text-xs lg:text-sm font-black uppercase tracking-wider">
                Target: +{stock.predictedGrowth.toFixed(1)}%
              </div>
              <div className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest">
                Signal: {stock.signal}
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <Button
                size="sm"
                className="flex-1 text-sm md:text-sm md:h-9"
                onClick={(e) => {
                  e.stopPropagation()
                  setQuantityDialog({ visible: true, stock, type: 'buy', quantity: 1 })
                }}
              >
                Buy
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 text-sm md:text-sm md:h-9"
                onClick={(e) => {
                  e.stopPropagation()
                  setQuantityDialog({ visible: true, stock, type: 'sell', quantity: 1 })
                }}
              >
                Sell
              </Button>
            </div>
          </div>
          )
        })}
      </div>

      {/* Fullscreen chart modal for selected stock */}
      {selectedStock && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-6xl bg-card border border-border rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h2 className="text-xl font-bold">{selectedStock.symbol.split(".")[0]} — {selectedStock.name}</h2>
                <p className="text-sm text-muted-foreground">Predicted: +{selectedStock.predictedGrowth.toFixed(1)}% • Confidence: {selectedStock.confidence.toFixed(0)}%</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => { setSelectedStock(null); try { window.dispatchEvent(new CustomEvent('predictionSelected', { detail: { selected: false } })) } catch {} }}>✕</Button>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="border-border rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <Tabs value={chartType} onValueChange={(value) => setChartType(value as "line" | "candlestick")} className="w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <TabsList className="bg-secondary/50">
                        <TabsTrigger
                          value="line"
                          className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <Activity className="h-4 w-4" />
                          Line
                        </TabsTrigger>
                        <TabsTrigger
                          value="candlestick"
                          className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Candlestick
                        </TabsTrigger>
                      </TabsList>

                      <div className="flex gap-1 flex-wrap">
                        {["1D", "1W", "1M", "5Y"].map((range) => (
                          <Button
                            key={range}
                            variant="ghost"
                            size="sm"
                            onClick={() => setChartRange(range)}
                            className={cn(
                              "text-xs font-medium px-3 rounded-full transition-all",
                              chartRange === range
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "hover:bg-secondary",
                            )}
                          >
                            {range}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <TabsContent value="line" className="mt-0">
                      <StockChart
                        data={chartData}
                        onRangeChange={() => {}}
                        currentRange={chartRange}
                        isPositive={selectedStock ? selectedStock.change >= 0 : true}
                        hideControls
                      />
                    </TabsContent>

                    <TabsContent value="candlestick" className="mt-0">
                      <CandlestickChart data={chartData} currentRange={chartRange} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <div className="w-full">
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Latest price</div>
                      <div className="text-lg font-mono font-bold">₹{selectedStock.price.toLocaleString("en-IN")}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Change: <span className={selectedStock.change >= 0 ? "text-green-800 font-bold" : "text-red-600 font-bold"}>
                          {selectedStock.change >= 0 ? "+" : ""}₹{selectedStock.change.toFixed(2)} ({selectedStock.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                            setQuantityDialog({ visible: true, stock: selectedStock, type: 'buy', quantity: 1 })
                            setSelectedStock(null)
                            try { window.dispatchEvent(new CustomEvent('predictionSelected', { detail: { selected: false } })) } catch {}
                          }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Buy
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setQuantityDialog({ visible: true, stock: selectedStock, type: 'sell', quantity: 1 })
                          setSelectedStock(null)
                          try { window.dispatchEvent(new CustomEvent('predictionSelected', { detail: { selected: false } })) } catch {}
                        }}
                      >
                        Sell
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen trade panel */}
      {showTradeFullscreen && selectedStock && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-card border border-border rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="absolute top-4 right-4">
              <Button variant="ghost" size="icon" onClick={() => setShowTradeFullscreen(false)}>✕</Button>
            </div>
            <TradePanel
              stock={{ symbol: selectedStock.symbol, regularMarketPrice: selectedStock.price, shortName: selectedStock.name } as any}
              initialTab={tradeInitialTab || 'buy'}
            />
          </div>
        </div>
      )}

      {/* Prediction cards are view-only — dialog removed */}

      {/* Full-screen Trade removed for predictions; use Options/Stock pages for trading */}
    </div>
  )
}

// no helpers needed

// NOTE: these helper functions are hoisted below the component to keep the
// component body readable — they will be bound during module evaluation in dev.
