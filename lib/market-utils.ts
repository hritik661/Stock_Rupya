// Check if Indian market is open
export function isMarketOpen(): { isOpen: boolean; message: string; nextOpen?: Date } {
  // Get current time in India Standard Time (IST)
  const now = new Date()
  const istTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  const istTime = new Date(istTimeString)

  const day = istTime.getDay()
  const hours = istTime.getHours()
  const minutes = istTime.getMinutes()
  const currentMinutes = hours * 60 + minutes

  // Market hours: Monday-Friday, 9:15 AM - 3:30 PM IST
  const marketOpen = 9 * 60 + 15 // 9:15 AM
  const marketClose = 15 * 60 + 30 // 3:30 PM

  // Weekend check
  if (day === 0 || day === 6) {
    const daysUntilMonday = day === 0 ? 1 : 2
    const nextOpen = new Date(istTime)
    nextOpen.setDate(nextOpen.getDate() + daysUntilMonday)
    nextOpen.setHours(9, 15, 0, 0)
    return {
      isOpen: false,
      message: `Market closed for weekend. Opens Monday at 9:15 AM IST`,
      nextOpen,
    }
  }

  // Before market opens
  if (currentMinutes < marketOpen) {
    return {
      isOpen: false,
      message: `Market opens at 9:15 AM IST`,
    }
  }

  // After market closes
  if (currentMinutes >= marketClose) {
    const nextOpen = new Date(istTime)
    nextOpen.setDate(nextOpen.getDate() + (day === 5 ? 3 : 1))
    nextOpen.setHours(9, 15, 0, 0)
    return {
      isOpen: false,
      message: `Market closed. Opens ${day === 5 ? "Monday" : "tomorrow"} at 9:15 AM IST`,
      nextOpen,
    }
  }

  return {
    isOpen: true,
    message: "Market is open",
  }
}

export function formatCurrency(value: number, currency = "INR", symbol = ""): string {
  // Handle NaN, undefined, or invalid values
  if (isNaN(value) || value === null || value === undefined) {
    return "₹0.00"
  }

  if (symbol === "BTC-INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (currency === "USD") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value * 88)
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export const BTC_INR_RATE = 8850000 // Updated to reflect current ~100k USD rate

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value)
}

export function formatPercentage(value: number): string {
  // Handle NaN, undefined, or invalid values
  if (isNaN(value) || value === null || value === undefined) {
    return "+0.00%"
  }

  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

export function getTimeRangeParams(range: string): { period1: number; period2: number; interval: string } {
  const now = Math.floor(Date.now() / 1000)
  let period1: number
  let interval: string

  switch (range) {
    case "1D":
      period1 = now - 86400
      interval = "5m"
      break
    case "1W":
      period1 = now - 7 * 86400
      interval = "15m"
      break
    case "1M":
      period1 = now - 30 * 86400
      interval = "1h"
      break
    case "3M":
      period1 = now - 90 * 86400
      interval = "1d"
      break
    case "6M":
      period1 = now - 180 * 86400
      interval = "1d"
      break
    case "1Y":
      period1 = now - 365 * 86400
      interval = "1d"
      break
    case "5Y":
      period1 = now - 5 * 365 * 86400
      interval = "1wk"
      break
    case "MAX":
      period1 = now - 20 * 365 * 86400
      interval = "1mo"
      break
    default:
      period1 = now - 30 * 86400
      interval = "1d"
  }

  return { period1, period2: now, interval }
}
