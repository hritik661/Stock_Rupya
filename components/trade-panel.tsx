"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useBalance } from "@/hooks/use-balance"
import type { StockQuote } from "@/lib/yahoo-finance"
import { formatCurrency } from "@/lib/market-utils"
import { storeLastTradingPrice } from "@/lib/pnl-calculator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { TrendingUp, TrendingDown, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface TradePanelProps {
  stock: StockQuote
  preselectedOption?: { action: "BUY" | "SELL"; type: "CE" | "PE"; strike: number; price: number } | null
  initialTab?: "buy" | "sell"
}

interface Holding {
  symbol: string
  name: string
  quantity: number
  avgPrice: number
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

export function TradePanel({ stock, preselectedOption, initialTab }: TradePanelProps) {
  const { user, updateBalance } = useAuth()
  const { deductBalance, addBalance } = useBalance()
  const { toast } = useToast()
  // Allow empty input while typing by using string state; convert to number when performing actions
  const [quantity, setQuantity] = useState<string>('1')
  const [tradeType, setTradeType] = useState<"equity" | "options">("equity")
  const [optionType, setOptionType] = useState<"CE" | "PE">("CE")
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"buy" | "sell">(initialTab || "buy")

  const numQuantity = Math.max(0, parseInt(quantity || '0') || 0)
  const totalCost = numQuantity * stock.regularMarketPrice

  // generate a small synthetic chart so trade panel shows same candlestick visuals
  const generateMiniChart = (base: number, points = 60) => {
    const data: any[] = []
    let last = base
    const now = Math.floor(Date.now() / 1000)
    for (let i = points - 1; i >= 0; i--) {
      const t = now - i * 3600
      const vol = Math.max(1, base * 0.01)
      const open = Math.max(0.01, last + (Math.random() - 0.5) * vol)
      const close = Math.max(0.01, open + (Math.random() - 0.5) * vol * 0.6)
      const high = Math.max(open, close) + Math.random() * vol * 0.5
      const low = Math.min(open, close) - Math.random() * vol * 0.5
      const volume = Math.floor(Math.random() * 100000) + 1000
      data.push({ timestamp: t, open, high, low, close, volume })
      last = close
    }
    return data
  }

  // Ensure unique email based key for data persistence
  const storageKey = user ? `holdings_${user.email}` : "holdings_guest"
  const transactionsKey = user ? `transactions_${user.email}` : "transactions_guest"
  const holdings: Holding[] = JSON.parse(localStorage.getItem(storageKey) || "[]")
  const transactions: Transaction[] = JSON.parse(localStorage.getItem(transactionsKey) || "[]")
  const currentHolding = holdings.find((h: Holding) => h.symbol === stock.symbol)

  const handleBuy = async () => {
    if (!user) return
    const qty = Math.max(0, parseInt(quantity || '0') || 0)
    if (qty < 1) {
      toast({ title: 'Enter Quantity', description: 'Please enter a valid quantity to buy', variant: 'destructive' })
      return
    }
    const localTotal = qty * stock.regularMarketPrice
    if (localTotal > user.balance) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${formatCurrency(localTotal - user.balance)} more to complete this purchase.`,
        variant: "destructive",
      })
      return
    }

    // Update holdings
    const existingIndex = holdings.findIndex((h: Holding) => h.symbol === stock.symbol)
    if (existingIndex >= 0) {
      const existing = holdings[existingIndex]
      const newQuantity = existing.quantity + qty
      const newAvgPrice = (existing.avgPrice * existing.quantity + stock.regularMarketPrice * qty) / newQuantity
      holdings[existingIndex] = { ...existing, quantity: newQuantity, avgPrice: newAvgPrice }
    } else {
      holdings.push({
        symbol: stock.symbol,
        name: stock.shortName,
        quantity: qty,
        avgPrice: stock.regularMarketPrice,
      })
    }

    localStorage.setItem(storageKey, JSON.stringify(holdings))

    // Save holdings to database
    try {
      await fetch("/api/holdings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, holdings }),
      })
    } catch (error) {
      console.warn("Failed to save holdings to database:", error)
    }

    // Deduct balance using API
    const balanceResult = await deductBalance(localTotal, "BUY", stock.symbol, qty, stock.regularMarketPrice)
    if (!balanceResult.success) {
      toast({
        title: "Transaction Failed",
        description: balanceResult.error,
        variant: "destructive",
      })
      return
    }

    // Record transaction
    const transaction: Transaction = {
      id: Date.now().toString(),
      symbol: stock.symbol,
      name: stock.shortName,
      type: "buy",
      quantity: qty,
      price: stock.regularMarketPrice,
      total: localTotal,
      timestamp: Date.now(),
    }
    transactions.push(transaction)
    localStorage.setItem(transactionsKey, JSON.stringify(transactions))

    // Store the last trading price for persistent P&L after market closes
    try {
      storeLastTradingPrice(user.email, stock.symbol, stock.regularMarketPrice)
    } catch (error) {
      console.warn("Failed to store last trading price:", error)
    }

    toast({
      title: "Order Placed Successfully",
      description: `Bought ${qty} shares of ${stock.symbol.replace(".NS", "")} at ${formatCurrency(stock.regularMarketPrice)}`,
    })

    setQuantity('1')

    // notify other UI listeners that a trade completed (used by Predictions popup)
    try {
      window.dispatchEvent(
        new CustomEvent("tradeCompleted", { detail: { symbol: stock.symbol, type: "buy", quantity: qty } }),
      )
    } catch (e) {}
  }

  const handleSell = async () => {
    if (!user) return
    const qty = Math.max(0, parseInt(quantity || '0') || 0)
    if (qty < 1) {
      toast({ title: 'Enter Quantity', description: 'Please enter a valid quantity to sell', variant: 'destructive' })
      return
    }

    if (!currentHolding || currentHolding.quantity < qty) {
      toast({
        title: "Insufficient Shares",
        description: `You only have ${currentHolding?.quantity || 0} shares to sell.`,
        variant: "destructive",
      })
      return
    }

    // Update holdings
    const existingIndex = holdings.findIndex((h: Holding) => h.symbol === stock.symbol)
    if (existingIndex >= 0) {
      const newQuantity = holdings[existingIndex].quantity - qty
      const isSellingAll = newQuantity <= 0

      if (isSellingAll) {
        holdings.splice(existingIndex, 1)

        // Also sell all options positions for this stock when selling all shares
        const baseSymbol = stock.symbol.replace(".NS", "")
        const optionsToSell = holdings.filter(
          (h: Holding) => h.symbol.includes(baseSymbol) && h.symbol !== stock.symbol,
        )

        let totalOptionsValue = 0
        optionsToSell.forEach((option: Holding) => {
          // Calculate approximate value (this is simplified - in reality options have different pricing)
          const optionValue = option.quantity * option.avgPrice * 0.1 // Rough estimate
          totalOptionsValue += optionValue

          // Remove the option holding
          const optionIndex = holdings.findIndex((h: Holding) => h.symbol === option.symbol)
          if (optionIndex >= 0) {
            holdings.splice(optionIndex, 1)
          }
        })

        if (optionsToSell.length > 0) {
          // Add back the option value to balance using API
          const optionResult = await addBalance(totalOptionsValue, "SELL", stock.symbol, qty, stock.regularMarketPrice)
          if (!optionResult.success) {
            toast({
              title: "Transaction Failed",
              description: optionResult.error,
              variant: "destructive",
            })
            return
          }
        }
      } else {
        holdings[existingIndex].quantity = newQuantity
      }
    }

    localStorage.setItem(storageKey, JSON.stringify(holdings))

    // Save holdings to database
    try {
      await fetch("/api/holdings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, holdings }),
      })
    } catch (error) {
      console.warn("Failed to save holdings to database:", error)
    }

    // Add balance using API
    const balanceResult = await addBalance(totalCost, "SELL", stock.symbol, qty, stock.regularMarketPrice)
    if (!balanceResult.success) {
      toast({
        title: "Transaction Failed",
        description: balanceResult.error,
        variant: "destructive",
      })
      return
    }

    // Record transaction
    const transaction: Transaction = {
      id: Date.now().toString(),
      symbol: stock.symbol,
      name: stock.shortName,
      type: "sell",
      quantity: qty,
      price: stock.regularMarketPrice,
      total: totalCost,
      timestamp: Date.now(),
    }
    transactions.push(transaction)
    localStorage.setItem(transactionsKey, JSON.stringify(transactions))

    // Store the last trading price for persistent P&L after market closes
    try {
      storeLastTradingPrice(user.email, stock.symbol, stock.regularMarketPrice)
    } catch (error) {
      console.warn("Failed to store last trading price:", error)
    }

    toast({
      title: "Order Placed Successfully",
      description: `Sold ${qty} shares of ${stock.symbol.replace(".NS", "")} at ${formatCurrency(stock.regularMarketPrice)}`,
    })

    setQuantity('1')

    // notify other UI listeners that a trade completed (used by Predictions popup)
    try {
      window.dispatchEvent(
        new CustomEvent("tradeCompleted", { detail: { symbol: stock.symbol, type: "sell", quantity: qty } }),
      )
    } catch (e) {}
  }

  const isLoggedIn = !!user

  // React to externally preselected option (from OptionChain)
  // Set trade view to options and preselect strike/type when it changes
  useEffect(() => {
    if (!preselectedOption) return
    setTradeType("options")
    setOptionType(preselectedOption.type)
    setSelectedStrike(preselectedOption.strike)
    setActiveTab(preselectedOption.action === "BUY" ? "buy" : "sell")
    toast({
      title: "Option Selected",
      description: `${preselectedOption.action} ${preselectedOption.type} ${stock.symbol.replace(".NS", "")} @ ${preselectedOption.strike}`,
    })
  }, [preselectedOption, stock.symbol, toast])

  // Respect `initialTab` when it changes (e.g., opened from Predictions)
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab)
  }, [initialTab])

  if (!isLoggedIn) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Trade {stock.symbol.replace(".NS", "")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Please login to buy or sell stocks.</p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => window.dispatchEvent(new Event('open-login'))}>Login</Button>
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card id="trade-panel" className="border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2 md:pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg">Trade {stock.symbol.replace(".NS", "")}</CardTitle>
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
            <Button
              variant={tradeType === "equity" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 md:h-7 text-xs px-2"
              onClick={() => setTradeType("equity")}
            >
              Equity
            </Button>
            <Button
              variant={tradeType === "options" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 md:h-7 text-xs px-2"
              onClick={() => setTradeType("options")}
            >
              Options
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tradeType === "options" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={optionType === "CE" ? "default" : "outline"}
                className={cn("h-12 gap-2", optionType === "CE" && "bg-primary text-primary-foreground")}
                onClick={() => setOptionType("CE")}
              >
                <TrendingUp className="h-4 w-4" />
                Call (CE)
              </Button>
              <Button
                variant={optionType === "PE" ? "default" : "outline"}
                className={cn("h-12 gap-2", optionType === "PE" && "bg-destructive text-destructive-foreground")}
                onClick={() => setOptionType("PE")}
              >
                <TrendingDown className="h-4 w-4" />
                Put (PE)
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Strike Price</Label>
              <div className="grid grid-cols-3 gap-2">
                {[-1, 0, 1].map((offset) => {
                  const strike = Math.round(stock.regularMarketPrice / 50) * 50 + offset * 50
                  const isSelected = selectedStrike === strike
                  return (
                    <Button
                      key={offset}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={cn("font-mono text-xs", isSelected ? "" : "bg-transparent")}
                      onClick={() => setSelectedStrike(strike)}
                    >
                      {strike}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lot Size</Label>
              <Input type="number" defaultValue={50} disabled className="bg-secondary/50 font-mono" />
            </div>

            <Button
              className="w-full gap-2 bg-gradient-to-r from-primary to-accent border-none h-11"
              onClick={async () => {
                try {
                  const strike = selectedStrike ?? Math.round(stock.regularMarketPrice / 50) * 50
                  const lotSize = 50 // fixed lot size used in UI

                  // determine premium: prefer preselectedOption.price if provided
                  const premium = preselectedOption?.price ?? Math.max(1, +(stock.regularMarketPrice * 0.02).toFixed(2))
                  const totalCost = premium * lotSize

                  if (totalCost > (user?.balance || 0)) {
                    toast({
                      title: "Insufficient Balance",
                      description: `You need ${formatCurrency(totalCost - (user?.balance || 0))} more to buy this option lot.`,
                      variant: "destructive",
                    })
                    return
                  }

                  // persist option holding as a special symbol so portfolio picks it up
                  const optSymbol = `${stock.symbol}-OPT-${optionType}-${strike}`
                  const storageKey = user ? `holdings_${user.email}` : "holdings_guest"
                  const raw = localStorage.getItem(storageKey) || "[]"
                  const holdings: any[] = JSON.parse(raw)
                  const idx = holdings.findIndex((h) => h.symbol === optSymbol)

                  if (idx >= 0) {
                    const existing = holdings[idx]
                    const newQuantity = existing.quantity + 1 // number of lots
                    const newAvg = (existing.avgPrice * existing.quantity + premium) / newQuantity
                    holdings[idx] = { ...existing, quantity: newQuantity, avgPrice: newAvg }
                  } else {
                    holdings.push({
                      symbol: optSymbol,
                      name: `${stock.shortName} ${optionType} ${strike} (lot)`,
                      quantity: 1,
                      avgPrice: premium,
                      lotSize,
                    })
                  }

                  localStorage.setItem(storageKey, JSON.stringify(holdings))
                  // Use API-backed deduction for consistency
                  try {
                    const res = await deductBalance(totalCost, "BUY", stock.symbol, 1, premium)
                    if (!res.success) {
                      // rollback local change
                      const rawRollback = localStorage.getItem(storageKey) || "[]"
                      const holdingsRollback: any[] = JSON.parse(rawRollback).filter((h) => h.symbol !== optSymbol)
                      localStorage.setItem(storageKey, JSON.stringify(holdingsRollback))
                      toast({ title: "Transaction Failed", description: res.error, variant: "destructive" })
                      return
                    }
                  } catch (err) {
                    console.error("option order balance error", err)
                  }

                  toast({
                    title: "Option Order Placed",
                    description: `${optionType} Option for ${stock.symbol.replace(".NS", "")} @ ${strike} — ${lotSize} qty at ${formatCurrency(premium)} premium`,
                  })
                } catch (err) {
                  console.error("place option order error", err)
                  toast({ title: "Error", description: "Unable to place option order" })
                }
              }}
            >
              <Zap className="h-4 w-4" />
              Place Option Order
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "buy" | "sell")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="buy"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                Buy
              </TabsTrigger>
              <TabsTrigger
                value="sell"
                className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
              >
                Sell
              </TabsTrigger>
            </TabsList>

            <TabsContent value="buy" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Input
                  id="buy-quantity"
                  type="text"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per share</span>
                  <span className="font-mono">{formatCurrency(stock.regularMarketPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Cost</span>
                  <span className="font-mono font-bold">{formatCurrency(totalCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Balance</span>
                  <span className="font-mono">{formatCurrency(user.balance)}</span>
                </div>
              </div>

              <Button className="btn-buy w-full gap-2" onClick={handleBuy} disabled={numQuantity < 1 || totalCost > user.balance}>
                <TrendingUp className="h-5 w-5" />
                Buy {numQuantity} {numQuantity === 1 ? "Share" : "Shares"}
              </Button>
            </TabsContent>

            <TabsContent value="sell" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Input
                  id="sell-quantity"
                  type="text"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
                  className="bg-secondary"
                />

              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Holdings</span>
                  <span className="font-mono">{currentHolding?.quantity || 0} shares</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per share</span>
                  <span className="font-mono">{formatCurrency(stock.regularMarketPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="font-mono font-bold">{formatCurrency(totalCost)}</span>
                </div>
              </div>

              <Button
                className="btn-sell w-full gap-2"
                onClick={handleSell}
                disabled={!currentHolding || currentHolding.quantity < numQuantity || numQuantity < 1}
              >
                <TrendingDown className="h-5 w-5" />
                Sell {numQuantity} {numQuantity === 1 ? "Share" : "Shares"}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
