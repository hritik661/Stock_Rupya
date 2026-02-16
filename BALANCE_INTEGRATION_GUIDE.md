# How to Integrate Persistent Balance in Your Components

## Quick Start

### 1. In Your Buy Stock Component

\`\`\`tsx
"use client"

import { useBalance } from "@/hooks/use-balance"
import { useState } from "react"

export function BuyStockForm() {
  const { currentBalance, deductBalance } = useBalance()
  const [loading, setLoading] = useState(false)

  const handleBuyStock = async () => {
    setLoading(true)

    const result = await deductBalance(
      10000,        // amount to deduct
      "BUY",        // type
      "RELIANCE",   // stock symbol
      5,            // quantity
      2000          // price per share
    )

    setLoading(false)

    if (result.success) {
      alert(`✓ Bought! Balance: ₹${result.newBalance}`)
    } else {
      alert(`✗ Error: ${result.error}`)
    }
  }

  return (
    <div>
      <p>Current Balance: ₹{currentBalance}</p>
      <button onClick={handleBuyStock} disabled={loading}>
        {loading ? "Processing..." : "Buy ₹10,000"}
      </button>
    </div>
  )
}
\`\`\`

### 2. In Your Portfolio Component

\`\`\`tsx
"use client"

import { useBalance } from "@/hooks/use-balance"
import { useAuth } from "@/contexts/auth-context"

export function PortfolioView() {
  const { user } = useAuth()
  const { currentBalance } = useBalance()

  return (
    <div className="portfolio">
      <h2>Portfolio</h2>
      <div className="balance">
        <label>Account Balance</label>
        <p className="amount">₹{currentBalance.toLocaleString()}</p>
      </div>

      <div className="info">
        <p>User: {user?.email}</p>
        <p>Created: {new Date(user?.createdAt || Date.now()).toLocaleDateString()}</p>
      </div>
    </div>
  )
}
\`\`\`

### 3. In Your Sell Stock Component

\`\`\`tsx
"use client"

import { useBalance } from "@/hooks/use-balance"

export function SellStockForm() {
  const { addBalance } = useBalance()

  const handleSellStock = async (symbol: string, amount: number) => {
    const result = await addBalance(
      amount,
      "SELL",
      symbol
    )

    if (result.success) {
      console.log(`Sold! New balance: ₹${result.newBalance}`)
    }
  }

  return (
    <button onClick={() => handleSellStock("TCS", 5000)}>
      Sell ₹5,000
    </button>
  )
}
\`\`\`

## Complete Example: Stock Trading Page

\`\`\`tsx
"use client"

import { useBalance } from "@/hooks/use-balance"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"

export function StockTradingPage() {
  const { user } = useAuth()
  const { currentBalance, deductBalance, addBalance } = useBalance()
  const [loading, setLoading] = useState(false)

  const stocks = [
    { symbol: "RELIANCE", price: 2500, quantity: 0 },
    { symbol: "TCS", price: 3500, quantity: 0 },
    { symbol: "INFY", price: 1800, quantity: 0 },
  ]

  const handleBuy = async (symbol: string, price: number) => {
    const amount = price * 10 // Buy 10 shares

    if (currentBalance < amount) {
      alert("Insufficient balance!")
      return
    }

    setLoading(true)
    const result = await deductBalance(amount, "BUY", symbol, 10, price)
    setLoading(false)

    if (result.success) {
      alert(`✓ Bought 10 ${symbol} shares for ₹${amount}`)
    } else {
      alert(`✗ Error: ${result.error}`)
    }
  }

  const handleSell = async (symbol: string) => {
    const amount = 10000 // Sell for ₹10,000

    setLoading(true)
    const result = await addBalance(amount, "SELL", symbol)
    setLoading(false)

    if (result.success) {
      alert(`✓ Sold ${symbol} for ₹${amount}`)
    } else {
      alert(`✗ Error: ${result.error}`)
    }
  }

  return (
    <div className="trading-page">
      <div className="header">
        <h1>Stock Trading</h1>
        <div className="balance-display">
          <p>Your Balance</p>
          <p className="amount">₹{currentBalance.toLocaleString()}</p>
          <p className="email">{user?.email}</p>
        </div>
      </div>

      <div className="stocks-grid">
        {stocks.map((stock) => (
          <div key={stock.symbol} className="stock-card">
            <h3>{stock.symbol}</h3>
            <p>Price: ₹{stock.price}</p>
            <button
              onClick={() => handleBuy(stock.symbol, stock.price)}
              disabled={loading || currentBalance < stock.price * 10}
            >
              {loading ? "Processing..." : "Buy"}
            </button>
            <button
              onClick={() => handleSell(stock.symbol)}
              disabled={loading}
            >
              {loading ? "Processing..." : "Sell"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
\`\`\`

## Important Points

### ✓ Do This
\`\`\`tsx
// Correct - Balance always reflects database
const { currentBalance, deductBalance } = useBalance()
\`\`\`

### ✗ Don't Do This
\`\`\`tsx
// Wrong - Reading balance from localStorage directly
const balance = JSON.parse(localStorage.getItem("hrtik_stocks_user")).balance
\`\`\`

### ✓ Always Update After Transaction
\`\`\`tsx
// Correct
const result = await deductBalance(1000)
if (result.success) {
  // currentBalance is automatically updated
  console.log(result.newBalance)
}
\`\`\`

## API Responses

### Successful Buy
\`\`\`json
{
  "success": true,
  "message": "Transaction successful. ₹10000 deducted.",
  "newBalance": 990000
}
\`\`\`

### Successful Sell
\`\`\`json
{
  "success": true,
  "message": "Transaction successful. ₹5000 added.",
  "newBalance": 995000
}
\`\`\`

### Insufficient Balance
\`\`\`json
{
  "success": false,
  "error": "Insufficient balance. Available: ₹950000"
}
\`\`\`

## Checking User Analytics

\`\`\`tsx
"use client"

import { useEffect, useState } from "react"

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    fetch("/api/analytics/users")
      .then(res => res.json())
      .then(data => setAnalytics(data.analytics))
  }, [])

  if (!analytics) return <p>Loading...</p>

  return (
    <div className="analytics">
      <h2>Website Analytics</h2>
      <p>Total Users: {analytics.totalUsers}</p>
      <p>Active Today: {analytics.activeUsers}</p>
      <p>Total Transactions: {analytics.totalTransactions}</p>
      <p>Total Balance: ₹{analytics.totalBalance.toLocaleString()}</p>
    </div>
  )
}
\`\`\`

## Common Scenarios

### Scenario 1: User Buys Stock
\`\`\`
1. User clicks "Buy ₹50,000" button
2. deductBalance(50000, "BUY", "RELIANCE") called
3. POST /api/balance/deduct sent to server
4. Server checks database balance
5. Balance deducted in database
6. Transaction recorded
7. Updated balance returned
8. UI updates with new balance
9. User sees new balance immediately
10. Even after logout/login, balance persists!
\`\`\`

### Scenario 2: User Logs Out & Back In
\`\`\`
1. User logs out (localStorage cleared)
2. User logs in with OTP
3. System fetches from database with /api/balance/get
4. Loads REAL balance from database
5. Updates localStorage for fast UI
6. All previous transactions still exist!
\`\`\`

## Troubleshooting

### Balance Not Updating in UI?
\`\`\`tsx
// Make sure you're using the hook
const { currentBalance } = useBalance()

// And not reading from localStorage
// const balance = localStorage.getItem(...)  ← Wrong!
\`\`\`

### Balance Resets After Logout?
\`\`\`tsx
// This shouldn't happen if database is connected
// Check: /api/analytics/users endpoint works
// If not, database might not be configured
\`\`\`

### Transaction Failed But Balance Changed?
\`\`\`tsx
// Check response.success before updating UI
const result = await deductBalance(1000)
if (result.success) {  // Check this!
  // Only then update UI
}
\`\`\`

## Performance Tips

✓ Balance is cached in localStorage for speed
✓ Only fetches from database on login
✓ Transactions update both database and localStorage
✓ Multiple components can use useBalance hook safely

## Security Notes

✓ Balance deduction happens on SERVER
✓ Cannot be hacked from browser console
✓ All amounts validated on server
✓ User email required for authentication

---

**Your stock market app now has real persistent balance!** 🎯
