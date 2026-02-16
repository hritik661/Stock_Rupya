// ETF holdings database with constituent allocations
export interface ETFConstituent {
  symbol: string
  name: string
  allocation: number // percentage
  sector?: string
}

export interface ETFData {
  symbol: string
  name: string
  sector: string
  constituents: ETFConstituent[]
}

// Database of Indian ETFs and their holdings
export const ETF_DATABASE: Record<string, ETFData> = {
  "GOLDBEES": {
    symbol: "GOLDBEES",
    name: "Gold BeES",
    sector: "Commodities",
    constituents: [
      { symbol: "GOLD", name: "Gold (Spot)", allocation: 100, sector: "Commodities" }
    ]
  },
  "SILVERBEES": {
    symbol: "SILVERBEES",
    name: "Silver BeES",
    sector: "Commodities",
    constituents: [
      { symbol: "SILVER", name: "Silver (Spot)", allocation: 100, sector: "Commodities" }
    ]
  },
  "NIFTYBEES": {
    symbol: "NIFTYBEES",
    name: "Nifty BeES",
    sector: "Index Tracker",
    constituents: [
      { symbol: "RELIANCE", name: "Reliance Industries", allocation: 12.5, sector: "Energy" },
      { symbol: "TCS", name: "Tata Consultancy Services", allocation: 11.2, sector: "IT" },
      { symbol: "HDFC", name: "HDFC Bank", allocation: 10.8, sector: "Banking" },
      { symbol: "INFY", name: "Infosys", allocation: 8.5, sector: "IT" },
      { symbol: "WIPRO", name: "Wipro", allocation: 6.3, sector: "IT" },
      { symbol: "BAJAJFINSV", name: "Bajaj Finserv", allocation: 5.2, sector: "Finance" },
      { symbol: "MARUTI", name: "Maruti Suzuki", allocation: 4.8, sector: "Auto" },
      { symbol: "ASIAPAINT", name: "Asian Paints", allocation: 4.1, sector: "Paints" },
      { symbol: "JSWSTEEL", name: "JSW Steel", allocation: 3.5, sector: "Steel" },
      { symbol: "LT", name: "Larsen & Toubro", allocation: 3.2, sector: "Engineering" },
      { symbol: "KOTAKBANK", name: "Kotak Bank", allocation: 7.9, sector: "Banking" },
      { symbol: "HINDUNILVR", name: "Hindustan Unilever", allocation: 6.2, sector: "FMCG" },
      { symbol: "SBIN", name: "State Bank of India", allocation: 5.5, sector: "Banking" },
      { symbol: "BHARTIARTL", name: "Bharti Airtel", allocation: 4.3, sector: "Telecom" },
      { symbol: "OTHERS", name: "Other Holdings", allocation: 6.2, sector: "Mixed" }
    ]
  },
  "BANKBEES": {
    symbol: "BANKBEES",
    name: "Bank BeES",
    sector: "Banking Index",
    constituents: [
      { symbol: "HDFC", name: "HDFC Bank", allocation: 28.5, sector: "Banking" },
      { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", allocation: 22.1, sector: "Banking" },
      { symbol: "SBIN", name: "State Bank of India", allocation: 19.8, sector: "Banking" },
      { symbol: "AXISBANK", name: "Axis Bank", allocation: 15.2, sector: "Banking" },
      { symbol: "IDFCBANK", name: "IDFC Bank", allocation: 9.4, sector: "Banking" },
      { symbol: "INDUSIND", name: "IndusInd Bank", allocation: 5.0, sector: "Banking" }
    ]
  },
  "ITBEES": {
    symbol: "ITBEES",
    name: "IT BeES",
    sector: "IT Index",
    constituents: [
      { symbol: "TCS", name: "Tata Consultancy Services", allocation: 32.5, sector: "IT" },
      { symbol: "INFY", name: "Infosys", allocation: 28.1, sector: "IT" },
      { symbol: "WIPRO", name: "Wipro", allocation: 18.4, sector: "IT" },
      { symbol: "TECHM", name: "Tech Mahindra", allocation: 12.2, sector: "IT" },
      { symbol: "LTTS", name: "L&T Technology Services", allocation: 5.8, sector: "IT" },
      { symbol: "MPHASIS", name: "MphasiS", allocation: 3.0, sector: "IT" }
    ]
  },
  "FMCGBEES": {
    symbol: "FMCGBEES",
    name: "FMCG BeES",
    sector: "FMCG Index",
    constituents: [
      { symbol: "HINDUNILVR", name: "Hindustan Unilever", allocation: 35.2, sector: "FMCG" },
      { symbol: "BRITANNIA", name: "Britannia Industries", allocation: 22.8, sector: "FMCG" },
      { symbol: "NESTLEIND", name: "Nestle India", allocation: 18.5, sector: "FMCG" },
      { symbol: "COLPAL", name: "Colgate-Palmolive", allocation: 12.1, sector: "FMCG" },
      { symbol: "MARICO", name: "Marico", allocation: 7.2, sector: "FMCG" },
      { symbol: "GODREJ", name: "Godrej Consumer Products", allocation: 4.2, sector: "FMCG" }
    ]
  },
  "ENERBEES": {
    symbol: "ENERBEES",
    name: "Energy BeES",
    sector: "Energy Index",
    constituents: [
      { symbol: "RELIANCE", name: "Reliance Industries", allocation: 45.0, sector: "Energy" },
      { symbol: "GAIL", name: "GAIL (India)", allocation: 18.5, sector: "Energy" },
      { symbol: "BPCL", name: "Bharat Petroleum", allocation: 15.2, sector: "Energy" },
      { symbol: "IOC", name: "Indian Oil Corporation", allocation: 12.8, sector: "Energy" },
      { symbol: "ADANIPOWER", name: "Adani Power", allocation: 5.5, sector: "Energy" },
      { symbol: "POWERGRID", name: "Power Grid Corporation", allocation: 3.0, sector: "Energy" }
    ]
  }
}

// Check if a symbol is an ETF
export function isETF(symbol: string): boolean {
  return symbol in ETF_DATABASE
}

// Get ETF data
export function getETFData(symbol: string): ETFData | null {
  return ETF_DATABASE[symbol] || null
}

// Get ETF constituents
export function getETFConstituents(symbol: string): ETFConstituent[] {
  const etf = getETFData(symbol)
  return etf?.constituents || []
}

// Calculate total allocation (should be ~100%)
export function getTotalAllocation(symbol: string): number {
  const constituents = getETFConstituents(symbol)
  return constituents.reduce((sum, c) => sum + c.allocation, 0)
}

// Search ETFs by name or symbol
export function searchETFs(query: string): ETFData[] {
  const q = query.toUpperCase()
  return Object.values(ETF_DATABASE).filter(
    etf => etf.symbol.includes(q) || etf.name.toUpperCase().includes(q)
  )
}

// Get all available ETFs
export function getAllETFs(): ETFData[] {
  return Object.values(ETF_DATABASE)
}
