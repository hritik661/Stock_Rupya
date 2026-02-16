"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { IndicesTicker } from "@/components/indices-ticker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrency } from "@/lib/market-utils"
import { 
  calculateOptionsPnL, 
  calculateOptionsPnLPercent,
  calculateAveragePrice,
  storeLastTradingPrice, 
  getLastTradingPrice,
  getEffectivePrice,
  loadPricesFromDatabase 
} from "@/lib/options-calculator"
import { useBalance } from "@/hooks/use-balance"
import { TrendingUp, TrendingDown, Activity, Volume2, Zap, ShoppingCart, CircleDollarSign, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { isMarketOpen } from "@/lib/market-utils"

interface OptionStrike {
  strike: number
  cePrice: number
  pePrice: number
  ceChange: number
  peChange: number
  ceOI: number
  peOI: number
  ceVolume: number
  peVolume: number
  ceIV: string
  peIV: string
  isATM: boolean
  isITM: boolean
}

interface Position {
  id: string
  type: "CE" | "PE"
  action: "BUY" | "SELL"
  index: string
  strike: number
  price: number
  quantity: number
  lotSize: number
  totalValue: number
  timestamp: number
}

const INDIAN_INDICES = [
  { symbol: "NIFTY", name: "NIFTY 50", price: 26329, lotSize: 50, strikeGap: 50 },
  { symbol: "BANKNIFTY", name: "BANK NIFTY", price: 60151, lotSize: 50, strikeGap: 100 },
  { symbol: "SENSEX", name: "BSE SENSEX", price: 85762, lotSize: 50, strikeGap: 100 },
]

export default function OptionsPage() {
  const { user, updateBalance } = useAuth()
  const { toast } = useToast()
  const [selectedIndex, setSelectedIndex] = useState(INDIAN_INDICES[0])
  const [expiry, setExpiry] = useState("Current Week")
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [selectedOption, setSelectedOption] = useState<{
    type: "CE" | "PE"
    strike: number
    price: number
  } | null>(null)
  const [tradeAction, setTradeAction] = useState<"BUY" | "SELL">("BUY")
  const [quantity, setQuantity] = useState(1)
  const [positions, setPositions] = useState<Position[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingChain, setLoadingChain] = useState(false)
  const [pricesLoading, setPricesLoading] = useState(true)
  const [strikesByIndex, setStrikesByIndex] = useState<Record<string, OptionStrike[]>>({})

  // Fetch indices prices from API
  useEffect(() => {
    const fetchIndicesPrices = async () => {
      try {
        const response = await fetch("/api/indices?all=true")
        if (response.ok) {
          const data = await response.json()
          if (data.indices && Array.isArray(data.indices)) {
            // Update selectedIndex with real price
            const niftyData = data.indices.find((i: any) => i.symbol === "NIFTY")
            if (niftyData) {
              setSelectedIndex((prev) => ({
                ...prev,
                price: niftyData.price,
              }))
            }

            // Update all INDIAN_INDICES prices
            INDIAN_INDICES.forEach((idx) => {
              const matchedIndex = data.indices.find((i: any) => i.symbol === idx.symbol)
              if (matchedIndex) {
                idx.price = matchedIndex.price
              }
            })
          }
        }
        setPricesLoading(false)
      } catch (error) {
        console.error("Error fetching indices prices:", error)
        setPricesLoading(false)
      }
    }

    fetchIndicesPrices()
    const interval = setInterval(fetchIndicesPrices, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Balance helpers (use API-backed add/deduct functions)
  const { deductBalance, addBalance } = useBalance()

  // Load positions from localStorage
  useEffect(() => {
    try {
      if (user) {
        const savedPositions = localStorage.getItem(`options_positions_${user.email}`)
        if (savedPositions) {
          const parsed = JSON.parse(savedPositions)
          if (Array.isArray(parsed)) {
            setPositions(parsed)
            
            // Initialize last trading prices for existing positions (use options-calculator storage)
            parsed.forEach((pos: Position) => {
              const key = `${pos.index}-${pos.strike}-${pos.type}`
              const existing = getLastTradingPrice(user.email, key)
              if (typeof existing !== 'number') {
                try { storeLastTradingPrice(user.email, key, pos.price) } catch {}
              }
            })
          }
        }
        
        // Load prices from database for P&L persistence
        loadPricesFromDatabase(user.email).catch(err => 
          console.warn('Failed to load prices from database:', err)
        )
      }
    } catch (err) {
      console.error("Error loading positions:", err)
      // Don't set error state for non-critical load failure
    }
  }, [user])

  // Fetch option chain from API
  const [strikes, setStrikes] = useState<OptionStrike[]>([])
  const [marketOpen, setMarketOpen] = useState(false)

  useEffect(() => {
    const fetchOptionChain = async () => {
      try {
        setLoadingChain(true)
        const response = await fetch(
          `/api/options/chain?symbol=${selectedIndex.symbol}&strikeGap=${selectedIndex.strikeGap}`
        )
        if (response.ok) {
          const data = await response.json()
          if (data.strikes && Array.isArray(data.strikes)) {
            setStrikes(data.strikes)
            // Update market open state from API
            if (typeof data.marketOpen === 'boolean') {
              setMarketOpen(data.marketOpen)
            }
            
            // IMPORTANT: Store current prices for all strikes to ensure P&L calculations work
            // Store prices regardless of market status so P&L always shows real prices
            if (user) {
              data.strikes.forEach((strike: OptionStrike) => {
                // Store CE price
                if (strike.cePrice > 0) {
                  try {
                    storeLastTradingPrice(user.email, `${selectedIndex.symbol}-${strike.strike}-CE`, strike.cePrice)
                  } catch {}
                }
                // Store PE price
                if (strike.pePrice > 0) {
                  try {
                    storeLastTradingPrice(user.email, `${selectedIndex.symbol}-${strike.strike}-PE`, strike.pePrice)
                  } catch {}
                }
              })
            }
          }
        } else {
          console.error("Failed to fetch option chain")
        }
        setLoadingChain(false)
      } catch (error) {
        console.error("Error fetching option chain:", error)
        setLoadingChain(false)
      }
    }

    fetchOptionChain()
    // Only update every 10 seconds if market is open, otherwise every 60 seconds
    const interval = setInterval(fetchOptionChain, marketOpen ? 10000 : 60000)
    return () => clearInterval(interval)
  }, [selectedIndex.symbol, selectedIndex.strikeGap, marketOpen, user])

  // Fetch option chains for all indices with open positions - refresh periodically
  useEffect(() => {
    if (positions.length === 0) return

    const uniqueIndices = Array.from(new Set(positions.map((p) => p.index)))

    const fetchAllChainsForPositions = () => {
      uniqueIndices.forEach((index) => {
        const indexConfig = INDIAN_INDICES.find((i) => i.symbol === index)
        if (!indexConfig) return

        const fetchChainForIndex = async () => {
          try {
            const response = await fetch(
              `/api/options/chain?symbol=${index}&strikeGap=${indexConfig.strikeGap}`
            )
            if (response.ok) {
              const data = await response.json()
              if (data.strikes && Array.isArray(data.strikes)) {
                setStrikesByIndex((prev) => ({
                  ...prev,
                  [index]: data.strikes,
                }))
                
                // IMPORTANT: Store current prices for all strikes to ensure P&L calculations work
                // Store prices regardless of market status so P&L always shows real prices
                if (user) {
                  data.strikes.forEach((strike: OptionStrike) => {
                    // Store CE price
                    if (strike.cePrice > 0) {
                      try {
                        storeLastTradingPrice(user.email, `${index}-${strike.strike}-CE`, strike.cePrice)
                      } catch {}
                    }
                    // Store PE price
                    if (strike.pePrice > 0) {
                      try {
                        storeLastTradingPrice(user.email, `${index}-${strike.strike}-PE`, strike.pePrice)
                      } catch {}
                    }
                  })
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching chain for ${index}:`, error)
          }
        }

        fetchChainForIndex()
      })
    }

    // Fetch immediately and then refresh periodically
    fetchAllChainsForPositions()
    const interval = setInterval(fetchAllChainsForPositions, marketOpen ? 10000 : 60000)
    return () => clearInterval(interval)
  }, [positions, marketOpen, user])

  const handleOptionClick = (type: "CE" | "PE", strike: number, price: number) => {
    try {
      setSelectedOption({ type, strike, price })
      setShowTradeModal(true)
    } catch (err) {
      console.error("Error clicking option:", err)
      setError("Failed to open trade dialog")
    }
  }

  const handleTrade = async () => {
    try {
      if (!user || !selectedOption) return

      const totalValue = selectedOption.price * quantity * selectedIndex.lotSize

      if (tradeAction === "BUY" && totalValue > user.balance) {
        toast({
          title: "Insufficient Balance",
          description: `You need ₹${(totalValue - user.balance).toLocaleString("en-IN")} more.`,
          variant: "destructive",
        })
        return
      }

      const newPosition: Position = {
        id: Math.random().toString(36).substring(7),
        type: selectedOption.type,
        action: tradeAction,
        index: selectedIndex.symbol,
        strike: selectedOption.strike,
        price: selectedOption.price,
        quantity,
        lotSize: selectedIndex.lotSize,
        totalValue,
        timestamp: Date.now(),
      }

      const updatedPositions = [...positions, newPosition]
      setPositions(updatedPositions)
      localStorage.setItem(`options_positions_${user.email}`, JSON.stringify(updatedPositions))

      // Update balance via API-backed helpers
      if (tradeAction === "BUY") {
        const res = await deductBalance(totalValue, "BUY", selectedIndex.symbol, quantity, selectedOption.price)
        if (!res.success) {
          // rollback position if balance update failed
          const rolled = positions.filter((p) => p.id !== newPosition.id)
          setPositions(rolled)
          localStorage.setItem(`options_positions_${user.email}`, JSON.stringify(rolled))
          toast({ title: "Transaction Failed", description: res.error, variant: "destructive" })
          return
        }
      } else {
        const res = await addBalance(totalValue, "SELL", selectedIndex.symbol, quantity, selectedOption.price)
        if (!res.success) {
          const rolled = positions.filter((p) => p.id !== newPosition.id)
          setPositions(rolled)
          localStorage.setItem(`options_positions_${user.email}`, JSON.stringify(rolled))
          toast({ title: "Transaction Failed", description: res.error, variant: "destructive" })
          return
        }
      }

      toast({
        title: `${tradeAction} Order Executed`,
        description: `${tradeAction === "BUY" ? "Bought" : "Sold"} ${quantity} lot(s) of ${selectedIndex.symbol} ${selectedOption.strike} ${selectedOption.type} @ ₹${selectedOption.price}`,
      })

      setShowTradeModal(false)
      setQuantity(1)
      // persist last-known price for this position and index so P/L is deterministic
      try {
        const strikeKey = `${newPosition.index}-${newPosition.strike}-${newPosition.type}`
        storeLastTradingPrice(user.email, strikeKey, newPosition.price)
      } catch {}
    } catch (err) {
      console.error("Error executing trade:", err)
      setError("Failed to execute trade")
    }
  }

  const closePosition = async (position: Position) => {
    try {
      if (!user) return

      // Determine effective price for closing: prefer live strike price, otherwise last-trading price, otherwise entry price
      const marketStatus = isMarketOpen()
      let livePrice: number | undefined = undefined
      if (marketStatus.isOpen) {
        const positionStrikes = strikesByIndex[position.index] || []
        let strike = positionStrikes.find((s) => s.strike === position.strike)
        if (!strike && position.index === selectedIndex.symbol) {
          strike = strikes.find((s) => s.strike === position.strike)
        }
        if (strike) {
          livePrice = position.type === "CE" ? strike.cePrice : strike.pePrice
        }
      }

      const key = `${position.index}-${position.strike}-${position.type}`
      const lastPrice = getLastTradingPrice(user.email, key)
      const effectivePrice = getEffectivePrice(livePrice, lastPrice, position.price)

      // Calculate P&L using proper options calculator
      const pnl = calculateOptionsPnL(position.price, effectivePrice, position.action, position.quantity, position.lotSize)

      // Credit the full sell value to the user (sell price * qty * lotSize) via API
      const sellValue = effectivePrice * position.quantity * position.lotSize
      const res = await addBalance(sellValue, "SELL", position.index, position.quantity, effectivePrice)
      if (!res.success) {
        toast({ title: "Transaction Failed", description: res.error, variant: "destructive" })
        return
      }

      const updatedPositions = positions.filter((p) => p.id !== position.id)
      setPositions(updatedPositions)
      localStorage.setItem(`options_positions_${user.email}`, JSON.stringify(updatedPositions))

      // Store closing price
      try { storeLastTradingPrice(user.email, key, effectivePrice) } catch {}

      toast({
        title: "Position Closed",
        description: `Closed ${position.index} ${position.strike} ${position.type} with ${pnl >= 0 ? "profit" : "loss"} of \u20b9${Number(Math.abs(pnl).toFixed(2)).toLocaleString("en-IN")}`,
        variant: pnl >= 0 ? "default" : "destructive",
      })
    } catch (err) {
      console.error("Error closing position:", err)
      setError("Failed to close position")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="hidden md:block">
        <IndicesTicker />
      </div>

      <main className="container mx-auto px-3 py-3 md:px-4 md:py-6">
        {error && (
          <Card className="mb-4 md:mb-6 border-destructive/50 bg-destructive/10">
            <CardContent className="p-3 md:p-4">
              <p className="text-destructive text-sm">{error}</p>
              <Button size="sm" variant="outline" onClick={() => setError(null)} className="mt-2 text-xs">
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-1.5 md:gap-3 mb-3 md:mb-6">
          <img src="/rupya.png" alt="StockRupya Logo" className="h-10 w-10 md:h-14 md:w-14" style={{ filter: 'brightness(0) saturate(100%)' }} />
          <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Zap className="h-3 w-3 md:h-4 md:w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-bold">Options Trading</h1>
            <p className="text-muted-foreground text-xs md:text-sm">Trade NIFTY, BANKNIFTY & SENSEX Options</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPricesLoading(true)
              const fetchPrices = async () => {
                try {
                  const response = await fetch("/api/indices?all=true")
                  if (response.ok) {
                    const data = await response.json()
                    if (data.indices && Array.isArray(data.indices)) {
                      const niftyData = data.indices.find((i: any) => i.symbol === "NIFTY")
                      if (niftyData) {
                        setSelectedIndex((prev) => ({
                          ...prev,
                          price: niftyData.price,
                        }))
                      }
                      INDIAN_INDICES.forEach((idx) => {
                        const matchedIndex = data.indices.find((i: any) => i.symbol === idx.symbol)
                        if (matchedIndex) {
                          idx.price = matchedIndex.price
                        }
                      })
                    }
                  }
                  setPricesLoading(false)
                } catch (error) {
                  console.error("Error refreshing prices:", error)
                  setPricesLoading(false)
                }
              }
              fetchPrices()
            }}
            className="gap-2"
            disabled={pricesLoading}
          >
            <RefreshCw className={cn("h-4 w-4", pricesLoading && "animate-spin")} />
            <span className="hidden sm:inline text-xs">Refresh</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 lg:gap-4 mb-3 md:mb-6">
          {INDIAN_INDICES.map((index) => (
            <Card
              key={index.symbol}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "cursor-pointer transition-all",
                selectedIndex.symbol === index.symbol ? "border-primary bg-primary/5" : "hover:border-primary/50",
              )}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">{index.name}</p>
                    <p className="text-lg md:text-2xl font-bold font-mono">₹{index.price.toLocaleString("en-IN")}</p>
                  </div>
                  <Badge variant={selectedIndex.symbol === index.symbol ? "default" : "secondary"} className="text-xs">
                    Lot: {index.lotSize}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* My Positions */}
        {positions.length > 0 && (
          <Card className="mb-4 md:mb-6">
            <CardHeader className="pb-2 md:pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                  My Positions ({positions.length})
                </CardTitle>
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs md:text-sm"
                  onClick={async () => {
                    try {
                      if (!user) return

                      // Check if market is open
                      const marketStatus = isMarketOpen()

                      let totalCredit = 0
                      let totalProfit = 0
                      let totalLoss = 0

                      positions.forEach((pos) => {
                        // Get current price with improved fallback logic
                        let currentPrice = pos.price
                        
                        // First try lastTradingPrice
                        if (user) {
                          const strikeKey = `${pos.index}-${pos.strike}-${pos.type}`
                          const lastTradingPrice = getLastTradingPrice(user.email, strikeKey)
                          if (lastTradingPrice && lastTradingPrice > 0) {
                            currentPrice = lastTradingPrice
                          }
                        }
                        
                        // If not found, try live prices from API
                        if (currentPrice === pos.price) {
                          const positionStrikes = strikesByIndex[pos.index] || []
                          let strike = positionStrikes.find((s) => s.strike === pos.strike)
                          
                          // If not found, check the main strikes if it's for the selected index
                          if (!strike && pos.index === selectedIndex.symbol) {
                            strike = strikes.find((s) => s.strike === pos.strike)
                          }
                          
                          if (strike) {
                            const apiPrice = pos.type === "CE" ? strike.cePrice : strike.pePrice
                            if (apiPrice > 0) {
                              currentPrice = apiPrice
                            }
                          }
                        }

                        // Calculate P&L using proper options calculator
                        const pnl = calculateOptionsPnL(pos.price, currentPrice, pos.action, pos.quantity, pos.lotSize)

                        totalCredit += currentPrice * pos.quantity * pos.lotSize
                        if (pnl >= 0) {
                          totalProfit += pnl
                        } else {
                          totalLoss += Math.abs(pnl)
                        }
                      })

                      const netPnL = totalProfit - totalLoss
                      const message = `SELL ALL POSITIONS?\n\n📊 Summary:\nPositions: ${positions.length}\nTotal Sale Value: ₹${Number(totalCredit.toFixed(2)).toLocaleString("en-IN")}\nProfit: ₹${Number(totalProfit.toFixed(2)).toLocaleString("en-IN")}\nLoss: ₹${Number(totalLoss.toFixed(2)).toLocaleString("en-IN")}\nNet P&L: ₹${Number(netPnL.toFixed(2)).toLocaleString("en-IN")}\n\nProceed?`

                      if (!window.confirm(message)) return

                      // Update balance with total credit from selling all positions via API
                      const r = await addBalance(totalCredit, "SELL", "OPTIONS", positions.length, undefined)
                      if (!r.success) {
                        toast({ title: "Transaction Failed", description: r.error, variant: "destructive" })
                        return
                      }

                      // Clear all positions
                      setPositions([])
                      localStorage.setItem(`options_positions_${user.email}`, JSON.stringify([]))

                      toast({
                        title: "All Positions Sold ✓",
                        description: `Sold ${positions.length} position(s). Total Sale Value: ₹${Number(totalCredit.toFixed(2)).toLocaleString("en-IN")}. Profit: ₹${Number(totalProfit.toFixed(2)).toLocaleString("en-IN")}, Loss: ₹${Number(totalLoss.toFixed(2)).toLocaleString("en-IN")}, Net: ₹${Number((totalProfit - totalLoss).toFixed(2)).toLocaleString("en-IN")}`,
                        variant: totalProfit >= totalLoss ? "default" : "destructive",
                      })
                    } catch (err) {
                      console.error("Error selling all positions:", err)
                      setError("Failed to sell all positions")
                    }
                  }}
                >
                  Sell All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs md:text-sm">Index</TableHead>
                      <TableHead className="text-xs md:text-sm">Strike</TableHead>
                      <TableHead className="text-xs md:text-sm">Type</TableHead>
                      <TableHead className="text-xs md:text-sm">Action</TableHead>
                      <TableHead className="text-xs md:text-sm">Qty</TableHead>
                      <TableHead className="text-xs md:text-sm">Entry Price</TableHead>
                      <TableHead className="text-xs md:text-sm">Current Price</TableHead>
                      <TableHead className="text-xs md:text-sm hidden sm:table-cell">Value</TableHead>
                      <TableHead className="text-xs md:text-sm">P/L</TableHead>
                      <TableHead className="text-xs md:text-sm">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((pos) => {
                      try {
                        // Check if market is open
                        const marketStatus = isMarketOpen()
                        
                        // Get current price for this position with improved fallback logic:
                        // 1. Try live prices from API (strikesByIndex or strikes) 
                        // 2. Try last trading price from localStorage
                        // 3. Fall back to entry price only as absolute last resort
                        let currentPrice = pos.price // Default to entry price as fallback
                        let foundPrice = false
                        
                        // First, try last trading price (localStorage) - most reliable
                        if (!foundPrice && user) {
                          const strikeKey = `${pos.index}-${pos.strike}-${pos.type}`
                          const lastTradingPrice = getLastTradingPrice(user.email, strikeKey)
                          if (lastTradingPrice && !isNaN(lastTradingPrice) && lastTradingPrice > 0) {
                            currentPrice = lastTradingPrice
                            foundPrice = true
                          }
                        }
                        
                        // If not found in localStorage, try live prices from API state
                        if (!foundPrice) {
                          // Check strikesByIndex first (for non-selected indices)
                          const positionStrikes = strikesByIndex[pos.index]
                          if (positionStrikes && Array.isArray(positionStrikes)) {
                            const strike = positionStrikes.find((s) => s.strike === pos.strike)
                            if (strike && typeof strike[pos.type === "CE" ? "cePrice" : "pePrice"] === "number") {
                              const apiPrice = pos.type === "CE" ? strike.cePrice : strike.pePrice
                              if (apiPrice > 0) {
                                currentPrice = apiPrice
                                foundPrice = true
                              }
                            }
                          }
                          
                          // If not found in strikesByIndex, check main strikes array (for selected index)
                          if (!foundPrice && pos.index === selectedIndex.symbol) {
                            const mainStrike = strikes.find((s) => s.strike === pos.strike)
                            if (mainStrike && typeof mainStrike[pos.type === "CE" ? "cePrice" : "pePrice"] === "number") {
                              const apiPrice = pos.type === "CE" ? mainStrike.cePrice : mainStrike.pePrice
                              if (apiPrice > 0) {
                                currentPrice = apiPrice
                                foundPrice = true
                              }
                            }
                          }
                        }
                        
                        // If we found a price from API and haven't stored it yet, store it now
                        if (foundPrice && currentPrice > 0 && currentPrice !== pos.price && user) {
                          try {
                            const strikeKey = `${pos.index}-${pos.strike}-${pos.type}`
                            storeLastTradingPrice(user.email, strikeKey, currentPrice)
                          } catch {}
                        }

                        // Calculate P&L using proper options calculator
                        // P&L = (currentPrice - entryPrice) × quantity × lotSize for BUY
                        // P&L = (entryPrice - currentPrice) × quantity × lotSize for SELL
                        const pnl = calculateOptionsPnL(pos.price, currentPrice, pos.action, pos.quantity, pos.lotSize)
                        const pnlPercent = calculateOptionsPnLPercent(pos.price, currentPrice, pos.action)
                        const pnlSign = pnl >= 0

                        return (
                          <TableRow key={pos.id}>
                            <TableCell className="font-medium text-sm">{pos.index}</TableCell>
                            <TableCell className="font-mono text-sm">{Number(pos.strike).toLocaleString("en-IN")}</TableCell>
                            <TableCell>
                              <Badge variant={pos.type === "CE" ? "default" : "destructive"} className="text-xs px-1.5 py-0.5">
                                {pos.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={pos.action === "BUY" ? "outline" : "secondary"} className="text-xs px-1.5 py-0.5">
                                {pos.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{pos.quantity}</TableCell>
                            <TableCell className="font-mono text-sm">₹{Number(pos.price.toFixed(2)).toLocaleString("en-IN")}</TableCell>
                            <TableCell className="font-mono text-sm">₹{Number(currentPrice.toFixed(2)).toLocaleString("en-IN")}</TableCell>
                            <TableCell className="font-mono text-sm hidden sm:table-cell">₹{(currentPrice * pos.quantity * pos.lotSize).toLocaleString("en-IN")}</TableCell>
                            <TableCell>
                              <div
                                className={
                                  pnlSign
                                    ? "text-primary font-semibold font-mono text-sm"
                                    : "text-destructive font-semibold font-mono text-sm"
                                }
                              >
                                {pnlSign ? "+" : "-"}₹{Number(Math.abs(pnl).toFixed(2)).toLocaleString("en-IN")}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {pnlSign ? "+" : "-"}{Math.abs(pnlPercent).toFixed(2)}%
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  className="text-xs px-2 h-6"
                                  onClick={async () => {
                                    try {
                                      if (!user) return

                                      // Determine effective current price: prefer live strike, otherwise last saved, otherwise entry
                                      let livePrice: number | undefined = undefined
                                      const positionStrikes = strikesByIndex[pos.index] || []
                                      let strike = positionStrikes.find((s) => s.strike === pos.strike)
                                      if (!strike && pos.index === selectedIndex.symbol) {
                                        strike = strikes.find((s) => s.strike === pos.strike)
                                      }
                                      if (strike) {
                                        livePrice = pos.type === "CE" ? strike.cePrice : strike.pePrice
                                      }

                                      const last = getLastTradingPrice(user.email, `${pos.index}-${pos.strike}-${pos.type}`)
                                      const currentPrice = getEffectivePrice(livePrice, last, pos.price)

                                      const qtyStr = window.prompt("How many lots to buy?", "1")
                                      const qtyBuy = Math.max(0, Number.parseInt(qtyStr || "0") || 0)
                                      if (!qtyBuy) return

                                      const totalCost = currentPrice * qtyBuy * pos.lotSize
                                      if (totalCost > (user.balance || 0)) {
                                        toast({
                                          title: "Insufficient Balance",
                                          description: `You need ${formatCurrency(totalCost - (user.balance || 0))} more.`,
                                          variant: "destructive",
                                        })
                                        return
                                      }

                                      // Update the existing position by increasing quantity and averaging price
                                      const updated = positions.map((p) => {
                                        if (p.id === pos.id) {
                                          const newQty = p.quantity + qtyBuy
                                          const newTotalValue = p.totalValue + totalCost
                                          const newAvgPrice = (p.price * p.quantity + currentPrice * qtyBuy) / newQty
                                          return {
                                            ...p,
                                            quantity: newQty,
                                            totalValue: newTotalValue,
                                            price: newAvgPrice,
                                          }
                                        }
                                        return p
                                      })
                                      setPositions(updated)
                                      localStorage.setItem(`options_positions_${user.email}`, JSON.stringify(updated))

                                      // Deduct balance via API
                                      try {
                                        const r = await deductBalance(totalCost, "BUY", pos.index, qtyBuy, currentPrice)
                                        if (!r.success) {
                                          toast({ title: "Transaction Failed", description: r.error, variant: "destructive" })
                                          return
                                        }
                                      } catch (err) {
                                        console.error("deduct balance error", err)
                                      }

                                      try { storeLastTradingPrice(user.email, `${pos.index}-${pos.strike}-${pos.type}`, currentPrice) } catch {}
                                      toast({
                                        title: "Bought",
                                        description: `Bought ${qtyBuy} lot(s) of ${pos.index} ${pos.strike} ${pos.type} @ ${formatCurrency(currentPrice)}`,
                                      })
                                    } catch (err) {
                                      console.error(err)
                                      setError("Failed to buy more of this position")
                                    }
                                  }}
                                >
                                  Buy
                                </Button>

                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs px-2 h-6"
                                  onClick={async () => {
                                    try {
                                      if (!user) return

                                      // Determine effective current price: prefer live strike, otherwise last saved, otherwise entry
                                      let livePrice: number | undefined = undefined
                                      const positionStrikes = strikesByIndex[pos.index] || []
                                      let strike = positionStrikes.find((s) => s.strike === pos.strike)
                                      if (!strike && pos.index === selectedIndex.symbol) {
                                        strike = strikes.find((s) => s.strike === pos.strike)
                                      }
                                      if (strike) {
                                        livePrice = pos.type === "CE" ? strike.cePrice : strike.pePrice
                                      }

                                      const last = getLastTradingPrice(user.email, `${pos.index}-${pos.strike}-${pos.type}`)
                                      const currentPrice = getEffectivePrice(livePrice, last, pos.price)

                                      // Calculate P&L for full position
                                      const totalPnL =
                                        pos.action === "BUY"
                                          ? (currentPrice - pos.price) * pos.quantity * pos.lotSize
                                          : (pos.price - currentPrice) * pos.quantity * pos.lotSize
                                      
                                      const sellValue = currentPrice * pos.quantity * pos.lotSize

                                      // Show confirmation with clear details
                                      const message = `SELL POSITION CONFIRMATION\n\nEntry Price: ₹${pos.price.toFixed(2)}\nCurrent Price: ₹${currentPrice.toFixed(2)}\nProfit/Loss: ₹${totalPnL.toFixed(2)}\nQuantity: ${pos.quantity} lot(s)\nTotal Sale Value: ₹${sellValue.toFixed(2)}\n\nProceed with selling?`
                                      
                                      if (!window.confirm(message)) return

                                      // On sell, credit the full sell value via API
                                      const r = await addBalance(sellValue, "SELL", pos.index, pos.quantity, currentPrice)
                                      if (!r.success) {
                                        toast({ title: "Transaction Failed", description: r.error, variant: "destructive" })
                                        return
                                      }

                                      const updatedPositions = positions.filter((p) => p.id !== pos.id)
                                      setPositions(updatedPositions)
                                      localStorage.setItem(
                                        `options_positions_${user.email}`,
                                        JSON.stringify(updatedPositions),
                                      )
                                      try { storeLastTradingPrice(user.email, `${pos.index}-${pos.strike}-${pos.type}`, currentPrice) } catch {}
                                      
                                      toast({
                                        title: "Position Sold Successfully ✓",
                                        description: `Closed ${pos.quantity} lot(s) of ${pos.index} ${pos.strike} ${pos.type}. Received ₹${Number(sellValue.toFixed(2)).toLocaleString("en-IN")}. ${totalPnL >= 0 ? `Profit: ₹${Number(totalPnL.toFixed(2)).toLocaleString("en-IN")}` : `Loss: ₹${Number(Math.abs(totalPnL).toFixed(2)).toLocaleString("en-IN")}`}`,
                                        variant: totalPnL >= 0 ? undefined : "destructive",
                                      })
                                    } catch (err) {
                                      console.error(err)
                                      setError("Failed to close position")
                                    }
                                  }}
                                >
                                  Sell
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      } catch (err) {
                        console.error("Error rendering position row:", err)
                        return (
                          <TableRow key={pos.id}>
                            <TableCell colSpan={9} className="text-destructive">
                              Error loading position data.
                            </TableCell>
                          </TableRow>
                        )
                      }
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Option Chain */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 md:pb-4">
            <div>
              <CardTitle className="text-lg md:text-xl font-bold mb-1">Option Chain - {selectedIndex.symbol}</CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground">
                Spot Price:{" "}
                <span className="font-mono font-semibold text-foreground">
                  ₹{selectedIndex.price.toLocaleString("en-IN")}
                </span>
              </p>
            </div>
            <div className="flex gap-1 md:gap-2">
              {["Current Week", "Next Week", "Monthly"].map((e) => (
                <Badge
                  key={e}
                  variant={expiry === e ? "default" : "outline"}
                  className="cursor-pointer px-2 md:px-4 py-1 md:py-1.5 text-xs md:text-sm"
                  onClick={() => setExpiry(e)}
                >
                  {e}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingChain || strikes.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Loading option chain...</p>
                </div>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border bg-secondary/50">
                    <TableHead
                      colSpan={5}
                      className="text-center bg-primary/10 text-primary font-bold text-sm md:text-base border-r border-border"
                    >
                      CALLS (CE) - Click to Trade
                    </TableHead>
                    <TableHead className="text-center bg-secondary/50 font-bold text-sm md:text-base border-r border-border">
                      STRIKE
                    </TableHead>
                    <TableHead
                      colSpan={5}
                      className="text-center bg-destructive/10 text-destructive font-bold text-sm md:text-base"
                    >
                      PUTS (PE) - Click to Trade
                    </TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent border-border bg-secondary/30 text-xs">
                    <TableHead className="text-center">OI</TableHead>
                    <TableHead className="text-center">CHNG</TableHead>
                    <TableHead className="text-center">VOL</TableHead>
                    <TableHead className="text-center">IV</TableHead>
                    <TableHead className="text-center border-r border-border">LTP</TableHead>
                    <TableHead className="text-center bg-secondary/30 font-bold border-r border-border">
                      PRICE
                    </TableHead>
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
                      className={cn(
                        "border-border transition-colors",
                        s.isATM ? "bg-accent/10 font-semibold" : s.isITM ? "bg-primary/5" : "hover:bg-secondary/20",
                      )}
                    >
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {(s.ceOI / 1000).toFixed(1)}k
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <div
                          className={cn(
                            "inline-flex items-center gap-0.5",
                            s.ceChange >= 0 ? "text-primary" : "text-destructive",
                          )}
                        >
                          {s.ceChange >= 0 ? <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" /> : <TrendingDown className="h-2.5 w-2.5 md:h-3 md:w-3" />}
                          {Math.abs(s.ceChange).toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {(s.ceVolume / 1000).toFixed(1)}k
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono text-muted-foreground">{s.ceIV}%</TableCell>
                      <TableCell className="text-center border-r border-border">
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary-foreground hover:bg-primary font-mono font-semibold h-6 md:h-8 px-2 md:px-3 text-xs md:text-sm"
                            onClick={() => handleOptionClick("CE", s.strike, s.cePrice)}
                          >
                            ₹{Number(s.cePrice.toFixed(2)).toLocaleString("en-IN")}
                          </Button>
                          <div className="flex gap-0.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-primary text-xs h-5 px-1.5 font-bold"
                              onClick={() => {
                                handleOptionClick("CE", s.strike, s.cePrice)
                                setTradeAction("BUY")
                              }}
                            >
                              B
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive text-xs h-5 px-1.5 font-bold"
                              onClick={() => {
                                handleOptionClick("CE", s.strike, s.cePrice)
                                setTradeAction("SELL")
                              }}
                            >
                              S
                            </Button>
                          </div>
                        </div>
                      </TableCell>

                      {/* Strike Price */}
                      <TableCell
                        className={cn(
                          "text-center font-bold font-mono text-sm md:text-base border-r border-border",
                          s.isATM ? "bg-accent/20 text-accent-foreground" : "bg-secondary/20",
                        )}
                      >
                        {Number(s.strike).toLocaleString("en-IN")}
                        {s.isATM && (
                          <Badge variant="secondary" className="ml-1 md:ml-2 text-[8px] md:text-[9px] px-1 py-0">
                            ATM
                          </Badge>
                        )}
                      </TableCell>

                      {/* PE Data */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive font-mono font-semibold h-6 md:h-8 px-2 md:px-3 text-xs md:text-sm"
                            onClick={() => handleOptionClick("PE", s.strike, s.pePrice)}
                          >
                            ₹{Number(s.pePrice.toFixed(2)).toLocaleString("en-IN")}
                          </Button>
                          <div className="flex gap-0.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-primary text-xs h-5 px-1.5 font-bold"
                              onClick={() => {
                                handleOptionClick("PE", s.strike, s.pePrice)
                                setTradeAction("BUY")
                              }}
                            >
                              B
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive text-xs h-5 px-1.5 font-bold"
                              onClick={() => {
                                handleOptionClick("PE", s.strike, s.pePrice)
                                setTradeAction("SELL")
                              }}
                            >
                              S
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono text-muted-foreground">{s.peIV}%</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {(s.peVolume / 1000).toFixed(1)}k
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <div
                          className={cn(
                            "inline-flex items-center gap-0.5",
                            s.peChange >= 0 ? "text-primary" : "text-destructive",
                          )}
                        >
                          {s.peChange >= 0 ? <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" /> : <TrendingDown className="h-2.5 w-2.5 md:h-3 md:w-3" />}
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
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Trade Modal */}
        <Dialog open={showTradeModal} onOpenChange={setShowTradeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5" />
                Trade {selectedIndex.symbol} {selectedOption?.strike} {selectedOption?.type}
              </DialogTitle>
            </DialogHeader>

            {selectedOption && (
              <div className="space-y-6">
                {/* Buy/Sell Tabs */}
                <Tabs value={tradeAction} onValueChange={(v) => setTradeAction(v as "BUY" | "SELL")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="BUY"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Buy
                    </TabsTrigger>
                    <TabsTrigger
                      value="SELL"
                      className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
                    >
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Sell
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Option Details */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Strike Price</p>
                    <p className="font-mono font-bold">₹{selectedOption.strike}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Option Type</p>
                    <Badge variant={selectedOption.type === "CE" ? "default" : "destructive"}>
                      {selectedOption.type === "CE" ? "CALL" : "PUT"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Premium</p>
                    <p className="font-mono font-bold text-primary">₹{Number(selectedOption.price.toFixed(2)).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lot Size</p>
                    <p className="font-mono font-bold">{selectedIndex.lotSize}</p>
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label>Quantity (Lots)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                    className="font-mono"
                  />
                </div>

                {/* Order Summary */}
                <div className="p-4 rounded-lg bg-card border border-border">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Premium</span>
                    <span className="font-mono">₹{Number(selectedOption.price.toFixed(2)).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-mono">
                      {quantity} × {selectedIndex.lotSize} = {quantity * selectedIndex.lotSize}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-bold">Total Value</span>
                    <span className="font-mono font-bold text-lg">
                      ₹{(selectedOption.price * quantity * selectedIndex.lotSize).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Available Balance */}
                {user && (
                  <div className="text-sm text-muted-foreground">
                    Available Balance:{" "}
                    <span className="font-mono font-semibold text-foreground">
                      ₹{user.balance.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {/* Trade Button */}
                <Button
                  className={cn(
                    "w-full h-12 font-bold text-lg",
                    tradeAction === "BUY" ? "bg-primary hover:bg-primary/90" : "bg-destructive hover:bg-destructive/90",
                  )}
                  onClick={handleTrade}
                >
                  {tradeAction === "BUY" ? "Buy" : "Sell"} {quantity} Lot(s)
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
