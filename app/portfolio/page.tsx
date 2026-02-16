"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { IndicesTicker } from "@/components/indices-ticker"
import { useAuth } from "@/contexts/auth-context"
import { useBalance } from "@/hooks/use-balance"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { fetchMultipleQuotes, type StockQuote } from "@/lib/yahoo-finance"
import { formatCurrency, formatPercentage, isMarketOpen } from "@/lib/market-utils"
import { 
  calculatePnL, 
  calculatePnLPercent, 
  getEffectivePrice,
  storeLastTradingPrice,
  getLastTradingPrice,
  calculatePortfolioMetrics,
  loadPricesFromDatabase 
} from "@/lib/pnl-calculator"
import { calculateOptionsPnL, calculateOptionsPnLPercent } from "@/lib/options-calculator"
import { 
  calculateBuyTransaction, 
  calculateSellTransaction,
  calculateCloseAllPositions 
} from "@/lib/trading-calculator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { TrendingUp, TrendingDown, Wallet, PieChart, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface Holding {
  symbol: string
  name: string
  quantity: number
  avgPrice: number
  lotSize?: number
}

interface HoldingWithQuote extends Holding {
  quote?: StockQuote
  currentValue: number
  pnl: number
  pnlPercent: number
}

interface Transaction {
  id: string
  symbol: string
  name: string
  type: "buy" | "sell"
  quantity: number
  price: number
  total: number
  timestamp: number
}

export default function PortfolioPage() {
  const { user, isLoading: authLoading, updateBalance } = useAuth()
  const { deductBalance, addBalance } = useBalance()
  const { toast } = useToast()
  const router = useRouter()
  const [holdings, setHoldings] = useState<HoldingWithQuote[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [marketOpen, setMarketOpen] = useState(false)

  // Use exported helpers from lib/pnl-calculator for last-trading prices

  // Sync options with database
  const syncOptionsWithDatabase = async (localOptions: any[]) => {
    if (!user) return localOptions
    
    try {
      // Save local options to database
      if (localOptions && localOptions.length > 0) {
        await fetch("/api/options/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: user.email,
            options: localOptions 
          }),
        })
      }

      // Load options from database
      const response = await fetch("/api/options/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      })
      const data = await response.json()
      
      if (data.success && data.options && data.options.length > 0) {
        // Update localStorage with database options
        localStorage.setItem(`options_positions_${user.email}`, JSON.stringify(data.options))
        return data.options
      }
      
      return localOptions
    } catch (error) {
      console.warn("Failed to sync options with database:", error)
      return localOptions
    }
  }

  // Monitor market status and trigger immediate updates when market opens
  useEffect(() => {
    const checkMarketStatus = () => {
      const status = isMarketOpen()
      if (status.isOpen !== marketOpen) {
        setMarketOpen(status.isOpen)
        if (status.isOpen && holdings.length > 0) {
          // Market just opened - fetch fresh data immediately
          const fetchFreshData = async () => {
            const symbols = holdings.map((h) => h.symbol)
            const quotes = await fetchMultipleQuotes(symbols)
            // Update will happen in the next regular fetchHoldings call
          }
          fetchFreshData()
        }
      }
    }

    checkMarketStatus()
    const marketCheckInterval = setInterval(checkMarketStatus, 60000) // Check every minute

    return () => clearInterval(marketCheckInterval)
  }, [marketOpen, holdings.length])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    const fetchHoldings = async () => {
      if (!user) return

      setLoading(true)

      // Try to load holdings from database first
      let storedHoldings: Holding[] = []
      let clientHoldings: Holding[] = []
      
      try {
        // Get client-side holdings from localStorage
        clientHoldings = JSON.parse(localStorage.getItem(`holdings_${user.email}`) || "[]")
      } catch (e) {
        console.warn("Failed to parse localStorage holdings")
      }

      try {
        // Sync with database - this will ensure we get the latest data
        const response = await fetch("/api/holdings/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: user.email,
            holdings: clientHoldings 
          }),
        })
        const data = await response.json()
        if (data.success && data.holdings) {
          storedHoldings = data.holdings
          console.log(`Loaded holdings from ${data.source}:`, storedHoldings)
        }
      } catch (error) {
        console.warn("Failed to sync holdings from database, using localStorage:", error)
        storedHoldings = clientHoldings
      }
      
      // Also refresh balance from database
      try {
        await fetch("/api/balance/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.balance !== undefined) {
              // Balance is updated in auth context via refreshBalanceFromDatabase
            }
          })
      } catch (error) {
        console.warn("Failed to refresh balance:", error)
      }

      // Sync options with database
      try {
        const clientOptions = JSON.parse(localStorage.getItem(`options_positions_${user.email}`) || "[]")
        await syncOptionsWithDatabase(clientOptions)
        console.log("Options synced with database")
      } catch (error) {
        console.warn("Failed to sync options with database:", error)
      }

      // Load last trading prices from database for P&L persistence
      try {
        await loadPricesFromDatabase(user.email)
        console.log("Loaded prices from database")
      } catch (error) {
        console.warn("Failed to load prices from database:", error)
      }

      // Filter out any index holdings (NIFTY, BANKNIFTY, SENSEX) as they shouldn't be in portfolio
      // Only keep actual stock holdings
      const stockHoldings = storedHoldings.filter((holding: Holding) => {
        const symbol = holding.symbol.replace('.NS', '').toUpperCase()
        return !['NIFTY', 'BANKNIFTY', 'SENSEX'].includes(symbol)
      })

      if (stockHoldings.length === 0) {
        setHoldings([])
        setLoading(false)
        return
      }

      const symbols = stockHoldings.map((h) => h.symbol)
      const quotes = await fetchMultipleQuotes(symbols)

      const holdingsWithQuotes = stockHoldings.map((holding: Holding) => {
        const quote = quotes.find((q) => q.symbol === holding.symbol)
        const currentMarketPrice = quote?.regularMarketPrice
        
        // Check market status first
        const marketStatus = isMarketOpen()
        const lastPriceStored = getLastTradingPrice(user.email, holding.symbol)
        
        // Determine effective price for P&L calculation:
        // - If market is OPEN and we have a valid price: use current market price
        // - If market is CLOSED: use LAST TRADING PRICE (stored closing price) for persistent P&L
        // - If neither available: use entry price as fallback
        let effectivePrice = holding.avgPrice
        
        if (marketStatus.isOpen && currentMarketPrice && !isNaN(currentMarketPrice) && currentMarketPrice > 0) {
          // Market is open and we have a valid current price
          effectivePrice = currentMarketPrice
          // Store the current market price for use when market closes
          storeLastTradingPrice(user.email, holding.symbol, currentMarketPrice)
        } else if (!marketStatus.isOpen && typeof lastPriceStored === 'number' && lastPriceStored > 0) {
          // Market is closed: use last trading price stored from yesterday's close
          // This ensures P&L persists even after market closes
          effectivePrice = lastPriceStored
        }
        
        const safeEffectivePrice = isNaN(effectivePrice) || effectivePrice <= 0 ? holding.avgPrice : effectivePrice
        const safeAvgPrice = isNaN(holding.avgPrice) ? 0 : holding.avgPrice
        const safeQuantity = isNaN(holding.quantity) ? 0 : holding.quantity
        
        // Portfolio value: use effective price (respects market status and last trading price)
        const portfolioPrice = safeEffectivePrice
        const currentValue = portfolioPrice * safeQuantity
        
        // P&L = (Effective Price - Avg Price) * Quantity
        // When market is closed: uses last trading price for persistent P&L
        // When market is open: uses live price for real-time P&L
        const pnl = calculatePnL(safeAvgPrice, safeEffectivePrice, safeQuantity)
        const pnlPercent = calculatePnLPercent(safeAvgPrice, safeEffectivePrice)

        return {
          ...holding,
          quote,
          currentValue: isNaN(currentValue) || currentValue < 0 ? 0 : currentValue,
          pnl: isNaN(pnl) ? 0 : pnl,
          pnlPercent: isNaN(pnlPercent) ? 0 : pnlPercent,
        }
      })

      setHoldings(holdingsWithQuotes)
      setLoading(false)
    }

    fetchHoldings()
    
    // Dynamic interval that adjusts based on market status
    let interval: NodeJS.Timeout
    const scheduleNextUpdate = () => {
      const marketStatus = isMarketOpen()
      const updateInterval = marketStatus.isOpen ? 30000 : 300000 // 30s during market, 5min when closed
      interval = setTimeout(() => {
        fetchHoldings()
        scheduleNextUpdate() // Schedule next update
      }, updateInterval)
    }
    scheduleNextUpdate()

    return () => {
      if (interval) clearTimeout(interval)
    }
  }, [user, authLoading, router])

  // Fetch live option prices only when market is open
  useEffect(() => {
    if (!user) return

    // Check if market is open
    const marketStatus = isMarketOpen()
    
    // If market is closed, don't fetch new prices but keep using stored prices
    if (!marketStatus.isOpen) {
      console.log('Market is closed, using stored prices for P&L calculation')
      return
    }

    // Market is open, fetch live prices
    const fetchLiveOptionPrices = async () => {
      try {
        const rawOps = localStorage.getItem(`options_positions_${user.email}`) || '[]'
        const positions = JSON.parse(rawOps) as any[]
        
        if (!positions || positions.length === 0) return

        // Get unique indices
        const uniqueIndices = [...new Set(positions.map((p: any) => p.index))]
        
        // Fetch option chains for each index
        for (const indexSymbol of uniqueIndices) {
          try {
            const response = await fetch(`/api/options/chain?symbol=${indexSymbol}&strikeGap=50`)
            
            if (!response.ok) {
              console.warn(`API error for ${indexSymbol}:`, response.status)
              continue
            }
            
            const data = await response.json()
            
            if (data.success && data.strikes && Array.isArray(data.strikes)) {
              // Update prices for positions of this index using centralized storage
              data.strikes.forEach((strikeData: any) => {
                // Find all positions matching this strike
                positions.forEach((pos: any) => {
                  if (pos.index === indexSymbol && pos.strike === strikeData.strike) {
                    const currentPrice = pos.type === 'CE' ? strikeData.cePrice : strikeData.pePrice
                    const strikeKey = `${pos.index}-${pos.strike}-${pos.type}`
                    try {
                      storeLastTradingPrice(user.email, strikeKey, currentPrice)
                    } catch (e) {
                      // best-effort
                    }
                  }
                })
              })
              console.log(`Updated prices for ${indexSymbol}`)
            }
          } catch (error) {
            console.warn(`Failed to fetch option chain for ${indexSymbol}:`, error)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch live option prices:', error)
      }
    }

    // Fetch immediately on mount if market is open
    fetchLiveOptionPrices()

    // Update every 10 seconds when market is open
    const interval = setInterval(fetchLiveOptionPrices, 10000)

    return () => clearInterval(interval)
  }, [user])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="hidden md:block">
          <IndicesTicker />
        </div>
        <main className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48 mb-6" />
        </main>
      </div>
    )
  }

  // Portfolio summary calculations
  const totalInvested = holdings.reduce((sum, h) => {
    const avgPrice = isNaN(h.avgPrice) ? 0 : h.avgPrice
    const quantity = isNaN(h.quantity) ? 0 : h.quantity
    const investedValue = avgPrice * quantity
    return sum + (isNaN(investedValue) ? 0 : investedValue)
  }, 0)
  
  // Portfolio value = sum of all current values at market prices
  // When market is closed, this uses last trading prices
  const totalCurrentValue = holdings.reduce((sum, h) => {
    const currentValue = isNaN(h.currentValue) ? 0 : h.currentValue
    return sum + currentValue
  }, 0)
  
  // Total P&L = Total Current Value - Total Invested
  // When market is open: Shows live P&L based on current prices
  // When market is closed: Shows P&L based on last trading prices
  const totalPnL = totalCurrentValue - totalInvested
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="hidden md:block">
        <IndicesTicker />
      </div>

      <main className="container mx-auto px-3 py-3 md:px-4 md:py-6">
        <div className="flex items-center gap-3 mb-3 md:mb-6">
          <img src="/rupya.png" alt="StockRupya Logo" className="h-12 w-12 md:h-16 md:w-16" style={{ filter: 'brightness(0) saturate(100%)' }} />
          <h1 className="text-lg md:text-2xl font-bold">Portfolio Dashboard</h1>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 mb-3 md:mb-8">
          <Card className="border-border">
            <CardContent className="p-2 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-base md:text-2xl font-bold font-mono">{formatCurrency(user.balance)}</p>
                </div>
                <div className="h-6 w-6 md:h-10 md:w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Wallet className="h-3 w-3 md:h-5 md:w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-2 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-sm text-muted-foreground">Portfolio Value</p>
                  <p className="text-base md:text-2xl font-bold font-mono">{formatCurrency(totalCurrentValue)}</p>
                </div>
                <div className="h-6 w-6 md:h-10 md:w-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <PieChart className="h-3 w-3 md:h-5 md:w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-2 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-sm text-muted-foreground">Total Invested</p>
                  <p className="text-base md:text-2xl font-bold font-mono">{formatCurrency(totalInvested)}</p>
                </div>
                <div className="h-6 w-6 md:h-10 md:w-10 rounded-full bg-secondary flex items-center justify-center">
                  <ArrowUpRight className="h-3 w-3 md:h-5 md:w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-2 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-sm text-muted-foreground">Total P&L</p>
                  <p className={`text-base md:text-2xl font-bold font-mono ${totalPnL >= 0 ? "text-primary" : "text-destructive"}`}>
                    {totalPnL >= 0 ? "+" : ""}
                    {formatCurrency(totalPnL)}
                  </p>
                  <p className={`text-[10px] md:text-sm ${totalPnL >= 0 ? "text-primary" : "text-destructive"}`}>
                    {formatPercentage(totalPnLPercent)}
                  </p>
                </div>
                <div
                  className={`h-6 w-6 md:h-10 md:w-10 rounded-full flex items-center justify-center ${totalPnL >= 0 ? "bg-primary/20" : "bg-destructive/20"}`}
                >
                  {totalPnL >= 0 ? (
                    <TrendingUp className="h-3 w-3 md:h-5 md:w-5 text-primary" />
                  ) : (
                    <TrendingDown className="h-3 w-3 md:h-5 md:w-5 text-destructive" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holdings List */}
        <Card className="border-border">
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base md:text-lg">Your Holdings</CardTitle>
              {holdings.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs"
                  onClick={async () => {
                    if (!user) return
                    if (!confirm('Are you sure you want to sell all stock holdings? This action cannot be undone.')) return
                    
                    const storageKey = `holdings_${user.email}`
                    
                    // Load current holdings
                    const rawHoldings = localStorage.getItem(storageKey) || '[]'
                    const holdingsArr: any[] = JSON.parse(rawHoldings)
                    
                    // Filter out indices (NIFTY, BANKNIFTY, SENSEX) - they shouldn't be in portfolio
                    const stockHoldings = holdingsArr.filter((holding: any) => {
                      const symbol = holding.symbol.replace('.NS', '').toUpperCase()
                      return !['NIFTY', 'BANKNIFTY', 'SENSEX'].includes(symbol)
                    })
                    
                    let totalCredit = 0
                    
                    // Calculate total credit from stock holdings
                    stockHoldings.forEach((holding: any) => {
                      const quote = holdings.find(h => h.symbol === holding.symbol)?.quote
                      const price = quote?.regularMarketPrice || holding.avgPrice
                      totalCredit += price * holding.quantity
                    })
                    
                    // Clear stock holdings from localStorage
                    localStorage.setItem(storageKey, '[]')
                    
                    // Save empty holdings to database
                    try {
                      await fetch("/api/holdings/save", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: user.email, holdings: [] }),
                      })
                    } catch (error) {
                      console.warn("Failed to save empty holdings to database:", error)
                    }
                    
                    // Record individual transactions for stock holdings
                    for (const holding of stockHoldings) {
                      const quote = holdings.find(h => h.symbol === holding.symbol)?.quote
                      const sellPrice = quote?.regularMarketPrice || holding.avgPrice
                      const sellQuantity = holding.quantity
                      const sellValue = sellPrice * sellQuantity
                      
                      // Record individual transaction
                      try {
                        await addBalance(sellValue, "SELL", holding.symbol, sellQuantity, sellPrice)
                      } catch (error) {
                        console.warn(`Failed to record transaction for ${holding.symbol}:`, error)
                      }
                    }
                    
                    toast({ title: 'Sold All Stock Holdings', description: `Received ${formatCurrency(totalCredit)} from selling all stock holdings.` })
                    setHoldings([])
                  }}
                >
                  Sell All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2 md:space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 md:h-20 rounded-lg" />
                ))}
              </div>
            ) : holdings.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <PieChart className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-medium mb-1 md:mb-2">No holdings yet</h3>
                <p className="text-muted-foreground text-sm mb-3 md:mb-4">Start trading to build your portfolio</p>
                <Link href="/" className="text-primary hover:underline text-sm">
                  Browse stocks
                </Link>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {holdings.map((holding) => {
                  const isOption = typeof holding.symbol === 'string' && holding.symbol.includes('-OPT-')
                  return (
                    <Link key={holding.symbol} href={`/stock/${encodeURIComponent(holding.symbol)}`} className="block">
                      <div className="flex items-center justify-between p-2 md:p-4 rounded-md md:rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                        <div className="flex items-center gap-2 md:gap-4">
                          <div>
                            <h3 className="font-semibold text-sm md:text-base">{holding.symbol.replace('.NS', '')}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground">{holding.quantity} {isOption ? 'lots' : 'shares'}</p>
                          </div>
                        </div>


                        {/* Always show entry and current price in mobile view */}
                        <div className="flex flex-col items-end sm:hidden mr-2">
                          <div className="flex gap-2">
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground">Entry</p>
                              <p className="font-mono text-xs">{formatCurrency(holding.avgPrice)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground">Current</p>
                              <p className="font-mono text-xs">
                                {isOption 
                                  ? formatCurrency(getLastTradingPrice(user.email, holding.symbol.replace('-OPT', '')) ?? holding.avgPrice)
                                  : formatCurrency(holding.quote?.regularMarketPrice || holding.avgPrice)
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Desktop/tablet: show as before */}
                        <div className="text-center hidden sm:block">
                          <p className="text-xs md:text-sm text-muted-foreground">Entry Price</p>
                          <p className="font-mono text-xs md:text-sm">{formatCurrency(holding.avgPrice)}</p>
                        </div>
                        <div className="text-center hidden sm:block">
                          <p className="text-xs md:text-sm text-muted-foreground">Current Price</p>
                          <p className="font-mono text-xs md:text-sm">
                            {isOption 
                              ? formatCurrency(getLastTradingPrice(user.email, holding.symbol.replace('-OPT', '')) ?? holding.avgPrice)
                              : formatCurrency(holding.quote?.regularMarketPrice || holding.avgPrice)
                            }
                          </p>
                        </div>

                        <div className="text-center hidden md:block">
                          <p className="text-xs md:text-sm text-muted-foreground">Portfolio Value</p>
                          <p className="font-mono font-medium text-xs md:text-sm">{formatCurrency(holding.currentValue)}</p>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-1 text-xs md:text-sm">
                            {holding.pnl >= 0 ? (
                              <ArrowUpRight className="h-2 w-2 md:h-3 md:w-3 text-primary" />
                            ) : (
                              <ArrowDownRight className="h-2 w-2 md:h-3 md:w-3 text-destructive" />
                            )}
                            <span className={holding.pnl >= 0 ? "text-primary" : "text-destructive"}>
                              {formatPercentage(holding.pnlPercent)}
                            </span>
                          </div>
                          <p
                            className={`text-xs md:text-sm font-medium mt-0.5 md:mt-1 ${holding.pnl >= 0 ? "text-primary" : "text-destructive"}`}
                          >
                            {holding.pnl >= 0 ? "+" : ""}
                            {formatCurrency(holding.pnl)}
                          </p>
                        </div>
                        <div className="ml-2 md:ml-4 flex items-center gap-1 md:gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 md:px-3 h-6 md:h-8"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                if (!user) return
                                const storageKey = `holdings_${user.email}`
                                const raw = localStorage.getItem(storageKey) || '[]'
                                const arr: any[] = JSON.parse(raw)

                                // find index and update
                                const idx = arr.findIndex((h) => h.symbol === holding.symbol)
                                if (idx >= 0) {
                                  // buying: add one share/lot
                                  const item = arr[idx]
                                  const price = holding.quote?.regularMarketPrice || holding.avgPrice

                                  if (price > user.balance) {
                                    toast({ title: 'Insufficient Balance', description: `You need ${formatCurrency(price - user.balance)} more to buy.`, variant: 'destructive' })
                                    return
                                  }

                                  const qtyStr = window.prompt('How many shares to buy?', '1')
                                  const qtyAdd = Math.max(0, Number.parseInt(qtyStr || '0') || 0)
                                  if (!qtyAdd) return
                                  const existing = arr[idx]
                                  const newQty = existing.quantity + qtyAdd
                                  const newAvg = (existing.avgPrice * existing.quantity + price * qtyAdd) / newQty
                                  arr[idx] = { ...existing, quantity: newQty, avgPrice: newAvg }
                                  localStorage.setItem(storageKey, JSON.stringify(arr))
                                  
                                  // Deduct balance using API
                                  const balanceResult = await deductBalance(price * qtyAdd, "BUY", holding.symbol, qtyAdd, price)
                                  if (!balanceResult.success) {
                                    toast({ title: 'Transaction Failed', description: balanceResult.error, variant: 'destructive' })
                                    return
                                  }

                                  // store last-known price for deterministic P&L
                                  try { storeLastTradingPrice(user.email, holding.symbol, price) } catch {}
                                  toast({ title: 'Bought', description: `Bought ${qtyAdd} shares of ${holding.symbol}` })
                                }
                              } catch (err) {
                                console.error(err)
                              }
                            }}
                          >
                            Buy
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 md:px-3 h-6 md:h-8"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                if (!user) return
                                const storageKey = `holdings_${user.email}`
                                const raw = localStorage.getItem(storageKey) || '[]'
                                const arr: any[] = JSON.parse(raw)
                                const idx = arr.findIndex((h) => h.symbol === holding.symbol)
                                if (idx >= 0) {
                                  const item = arr[idx]
                                  if (item.quantity <= 0) return

                                  const price = holding.quote?.regularMarketPrice || holding.avgPrice

                                  const qtyStr = window.prompt('How many shares to sell?', '1')
                                  const qtySell = Math.max(0, Number.parseInt(qtyStr || '0') || 0)
                                  if (!qtySell) return
                                  const newQty = item.quantity - qtySell
                                  if (newQty <= 0) arr.splice(idx, 1)
                                  else arr[idx] = { ...item, quantity: newQty }
                                  localStorage.setItem(storageKey, JSON.stringify(arr))
                                  
                                  // Add balance using API
                                  // Credit = current market price × quantity
                                  const totalCredit = price * qtySell
                                  const balanceResult = await addBalance(totalCredit, "SELL", holding.symbol, qtySell, price)
                                  if (!balanceResult.success) {
                                    toast({ title: 'Transaction Failed', description: balanceResult.error, variant: 'destructive' })
                                    return
                                  }
                                  
                                  try { storeLastTradingPrice(user.email, holding.symbol, price) } catch {}
                                  toast({ title: 'Sold', description: `Sold ${qtySell} shares of ${holding.symbol} for ${formatCurrency(totalCredit)}` })
                                }
                              } catch (err) {
                                console.error(err)
                              }
                            }}
                          >
                            Sell
                          </Button>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Options History */}
        <Card className="border-border mt-4 md:mt-6">
          <CardHeader className="pb-2 md:pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base md:text-lg">Options History</CardTitle>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs px-2 md:px-3 h-6 md:h-8"
              onClick={async () => {
                if (!user) return
                const confirm = window.confirm('Close all option positions? This action cannot be undone.')
                if (!confirm) return
                
                try {
                  const rawOps = localStorage.getItem(`options_positions_${user.email}`) || '[]'
                  const ops: any[] = JSON.parse(rawOps)
                  if (ops.length === 0) {
                    toast({ title: 'No Positions', description: 'No options positions to close.', variant: 'default' })
                    return
                  }

                  let totalCredit = 0

                  // Calculate total credit from all positions
                  for (const pos of ops) {
                    const strikeKey = `${pos.index}-${pos.strike}-${pos.type}`
                    const current = getLastTradingPrice(user.email, strikeKey) ?? pos.price
                    
                    // Credit = current market price × quantity × lot size
                    const credit = current * pos.quantity * pos.lotSize
                    totalCredit += credit
                  }

                  // Add balance for all closed positions
                  const balanceResult = await addBalance(totalCredit, "SELL_ALL", "ALL_OPTIONS", ops.length, 0)
                  if (!balanceResult.success) {
                    toast({ title: 'Transaction Failed', description: balanceResult.error, variant: 'destructive' })
                    return
                  }

                  // Clear all positions
                  localStorage.setItem(`options_positions_${user.email}`, JSON.stringify([]))
                  
                  // Sync to database
                  await fetch("/api/options/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                      email: user.email,
                      options: []
                    }),
                  }).catch(err => console.warn("Failed to save to database:", err))

                  toast({ 
                    title: 'All Positions Closed', 
                    description: `Closed all ${ops.length} position(s) with total credit ₹${totalCredit.toFixed(2)}`, 
                    variant: 'default' 
                  })
                  
                  setTimeout(() => window.location.reload(), 1000)
                } catch (err) {
                  console.error(err)
                  toast({ title: 'Error', description: 'Failed to close all positions', variant: 'destructive' })
                }
              }}
            >
              Sell All
            </Button>
          </CardHeader>
          <CardContent>
            {
              (() => {
                const raw = localStorage.getItem(`options_positions_${user.email}`) || '[]'
                const positions = JSON.parse(raw) as any[]
                if (!positions || positions.length === 0) {
                  return (
                    <div className="text-xs md:text-sm text-muted-foreground">No options history yet.</div>
                  )
                }

                return (
                  <div className="space-y-2 md:space-y-3">
                    {positions.map((pos) => {
                      const strikeKey = `${pos.index}-${pos.strike}-${pos.type}`
                      
                      // Check if market is open
                      const marketStatus = isMarketOpen()
                      
                      // Determine current price based on market status:
                      // When market is OPEN: Use latest fetched price from API
                      // When market is CLOSED: Use LAST TRADING PRICE for persistent P&L
                      // Fallback: Use entry price if no prices available
                      let currentPrice = pos.price
                      
                      // Use stored last trading price when available, otherwise fallback to entry price
                      const storedLastTradingPrice = getLastTradingPrice(user.email, strikeKey)
                      currentPrice = storedLastTradingPrice ?? pos.price
                      
                      // Calculate P&L using the options calculator with action and lotSize
                      const pnl = calculateOptionsPnL(
                        pos.price,
                        currentPrice,
                        pos.action || "BUY",
                        pos.quantity,
                        pos.lotSize || 50
                      )
                      const pnlPercent = calculateOptionsPnLPercent(
                        pos.price,
                        currentPrice,
                        pos.action || "BUY"
                      )

                      return (
                        <div key={pos.id} className="flex items-center justify-between p-2 md:p-3 rounded-md md:rounded-lg bg-secondary/50">
                          <div>
                            <div className="font-medium text-sm md:text-base">{pos.index} {Number(pos.strike).toLocaleString("en-IN")} {pos.type}</div>
                            <div className="text-[10px] md:text-xs text-muted-foreground">{pos.action} • {pos.quantity} lot(s) @ ₹{Number(pos.price.toFixed(2)).toLocaleString("en-IN")} = ₹{Number((pos.price * pos.quantity * pos.lotSize).toFixed(2)).toLocaleString("en-IN")}</div>
                          </div>
                              <div className="text-right">
                                <div className={`font-mono font-semibold text-sm md:text-base ${pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>{pnl >= 0 ? '+' : '-'}₹{Number(Math.abs(pnl).toFixed(2)).toLocaleString("en-IN")}</div>
                                <div className="text-[10px] md:text-xs text-muted-foreground">Entry: ₹{Number(pos.price.toFixed(2)).toLocaleString("en-IN")} • Now: ₹{Number(currentPrice.toFixed(2)).toLocaleString("en-IN")} • {pnlPercent >= 0 ? '+' : '-'}{Math.abs(pnlPercent).toFixed(2)}%</div>
                              </div>
                              <div className="ml-2 md:ml-4 flex items-center gap-1 md:gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs px-2 md:px-3 h-6 md:h-8"
                                  onClick={async () => {
                                    try {
                                      if (!user) return
                                      // BUY more lots: create a new BUY position at current price
                                      const rawOps = localStorage.getItem(`options_positions_${user.email}`) || '[]'
                                      const ops: any[] = JSON.parse(rawOps)

                                      const qtyStr = window.prompt('How many lots to buy?', '1')
                                      const qtyBuy = Math.max(0, Number.parseInt(qtyStr || '0') || 0)
                                      if (!qtyBuy) return

                                      const strikeKey = `${pos.index}-${pos.strike}-${pos.type}`
                                      const current = getLastTradingPrice(user.email, strikeKey) ?? pos.price

                                      const newPos = {
                                        id: Math.random().toString(36).substring(7),
                                        type: pos.type,
                                        action: 'BUY',
                                        index: pos.index,
                                        strike: pos.strike,
                                        symbol: `${pos.index}-${pos.strike}-${pos.type}`,
                                        price: current,
                                        quantity: qtyBuy,
                                        lotSize: pos.lotSize || 50,
                                        totalValue: current * qtyBuy * (pos.lotSize || 50),
                                        timestamp: Date.now(),
                                      }

                                      const totalCost = newPos.totalValue
                                      if (totalCost > (user.balance || 0)) {
                                        toast({ title: 'Insufficient Balance', description: `You need ${formatCurrency(totalCost - (user.balance || 0))} more.`, variant: 'destructive' })
                                        return
                                      }

                                      ops.push(newPos)
                                      localStorage.setItem(`options_positions_${user.email}`, JSON.stringify(ops))
                                      
                                      // Save to database
                                      await fetch("/api/options/save", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ 
                                          email: user.email,
                                          options: ops 
                                        }),
                                      }).catch(err => console.warn("Failed to save options to database:", err))
                                      
                                      // Deduct balance using API
                                      const balanceResult = await deductBalance(totalCost, "BUY", `${pos.index}-${pos.strike}-${pos.type}`, qtyBuy, current)
                                      if (!balanceResult.success) {
                                        toast({ title: 'Transaction Failed', description: balanceResult.error, variant: 'destructive' })
                                        return
                                      }
                                      
                                      try { storeLastTradingPrice(user.email, `${pos.index}-${pos.strike}-${pos.type}`, newPos.price) } catch {}
                                      toast({ title: 'Order Placed', description: `Bought ${qtyBuy} lot(s) of ${pos.index} ${pos.strike} ${pos.type} @ ${formatCurrency(current)}` })
                                    } catch (err) {
                                      console.error(err)
                                    }
                                  }}
                                >
                                  Buy
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      if (!user) return
                                      const rawOps = localStorage.getItem(`options_positions_${user.email}`) || '[]'
                                      const ops: any[] = JSON.parse(rawOps)
                                      const position = ops.find((p) => p.id === pos.id)
                                      if (!position) return

                                      const qtyStr = window.prompt('How many lots to sell/close?', '1')
                                      const qtySell = Math.max(0, Number.parseInt(qtyStr || '0') || 0)
                                      if (!qtySell) return

                                      if (qtySell > position.quantity) {
                                        toast({ title: 'Invalid Quantity', description: `You only have ${position.quantity} lot(s) in this position.`, variant: 'destructive' })
                                        return
                                      }

                                      const strikeKey = `${position.index}-${position.strike}-${position.type}`
                                      const current = getLastTradingPrice(user.email, strikeKey) ?? position.price

                                      // Calculate P&L for the portion being sold (for display only)
                                      const pnl = calculatePnL(position.price, current, qtySell * position.lotSize)

                                      // Credit = current market price × quantity × lot size
                                      const credit = current * qtySell * position.lotSize

                                      // Add balance using API
                                      const balanceResult = await addBalance(credit, "SELL", `${position.index}-${position.strike}-${position.type}`, qtySell, current)
                                      if (!balanceResult.success) {
                                        toast({ title: 'Transaction Failed', description: balanceResult.error, variant: 'destructive' })
                                        return
                                      }
                                      
                                      storeLastTradingPrice(user.email, strikeKey, current)

                                      // Remove position from portfolio
                                      let updatedOps: any[] = []
                                      if (qtySell >= position.quantity) {
                                        // Remove entire position
                                        updatedOps = ops.filter((p) => p.id !== position.id)
                                      } else {
                                        // Reduce quantity
                                        updatedOps = ops.map((p) => 
                                          p.id === position.id 
                                            ? { ...p, quantity: p.quantity - qtySell, totalValue: p.totalValue - (position.price * qtySell * position.lotSize) } 
                                            : p
                                        )
                                      }
                                      
                                      localStorage.setItem(`options_positions_${user.email}`, JSON.stringify(updatedOps))
                                      
                                      // Sync to database
                                      await fetch("/api/options/save", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ 
                                          email: user.email,
                                          options: updatedOps
                                        }),
                                      }).catch(err => console.warn("Failed to save options to database:", err))

                                      toast({ 
                                        title: qtySell >= position.quantity ? 'Position Closed' : 'Position Partially Closed', 
                                        description: `Closed ${qtySell} lot(s) of ${position.index} ${position.strike} ${position.type} with ₹${Math.abs(pnl).toFixed(2)} ${pnl >= 0 ? 'profit' : 'loss'}`, 
                                        variant: pnl >= 0 ? undefined : 'destructive' 
                                      })
                                      
                                      // Refresh the page to update portfolio
                                      setTimeout(() => window.location.reload(), 1000)
                                    } catch (err) {
                                      console.error(err)
                                      toast({ title: 'Error', description: 'Failed to close position', variant: 'destructive' })
                                    }
                                  }}
                                >
                                  Sell
                                </Button>
                              </div>
                            </div>
                      )
                    })}
                  </div>
                )
              })()
            }
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
