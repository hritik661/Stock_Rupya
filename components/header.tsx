"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, TrendingUp, User, LogOut, Wallet, Sparkles, Zap, BarChart3, Briefcase, Info } from "lucide-react"
import { formatCurrency } from "@/lib/market-utils"
import { searchStocks } from "@/lib/yahoo-finance"
import { INDIAN_STOCKS } from "@/lib/stocks-data"
import { cn } from "@/lib/utils"

export function Header({ isLandingPage = false, hideBalance = false }: { isLandingPage?: boolean, hideBalance?: boolean }) {
  const { user, logout, updateBalance } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string; exchange: string }>>([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setSearching(true)

    const localResults = INDIAN_STOCKS.filter(
      (s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.symbol.toLowerCase().includes(query.toLowerCase()),
    )
      .slice(0, 5)
      .map((s) => ({ symbol: s.symbol, name: s.name, exchange: s.exchange }))

    setSearchResults(localResults)
    setShowResults(true)

    const apiResults = await searchStocks(query)
    if (apiResults.length > 0) {
      const combined = [
        ...localResults,
        ...apiResults.filter((r) => !localResults.find((l) => l.symbol === r.symbol)),
      ].slice(0, 10)
      setSearchResults(combined)
    }
    setSearching(false)
  }

  const handleSelectStock = (symbol: string) => {
    router.push(`/stock/${encodeURIComponent(symbol)}`)
    setShowResults(false)
    setSearchQuery("")
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full glass-morphism border-b border-border/20 transition-all duration-300 shadow-lg",
      isLandingPage && "border-b border-border/10 shadow-xl",
    )}>
      <div className="container mx-auto px-3 md:px-3 py-2 md:py-2">
        <div className="flex items-center gap-2 md:gap-3 flex-nowrap">
          {/* Brand - show compact logo on landing pages (all screen sizes) */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="relative flex-shrink-0" style={{ display: 'inline-block' }}>
              <div style={{ position: 'absolute', inset: '-8px', borderRadius: 12, background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.14), rgba(34,197,94,0.04) 30%, transparent 60%)', filter: 'blur(12px)', zIndex: 0, pointerEvents: 'none' }} />
              <img src="/rupya.png" alt="StockRupya" className="h-8 md:h-10 w-auto relative z-10 flex-shrink-0 sparkle-anim" />
            </div>
           
          </Link>

          {/* Search Bar - moved right after logo */}
          {!isLandingPage && user && (
            <div className="flex-1 max-w-lg">
              <div className="relative flex items-center gap-2 group">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 md:h-4 md:w-4 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-colors duration-300" />
                  <Input
                    placeholder="Search for Any Stock..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    className="pl-10 pr-4 h-8 md:h-10 bg-gradient-to-r from-secondary/70 to-secondary/50 border-2 border-primary/20 hover:border-primary/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-all duration-300 rounded-xl text-xs md:text-sm font-medium placeholder:text-muted-foreground shadow-lg hover:shadow-primary/20 focus:shadow-primary/30"
                  />
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border-2 border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/20 overflow-hidden z-50 animate-fade-in-up">
                      {searching && (
                        <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Searching...
                        </div>
                      )}
                      {!searching && searchResults.map((result) => (
                        <button
                          key={`${result.symbol}-${result.exchange}`}
                          onClick={() => handleSelectStock(result.symbol)}
                          className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-all duration-200 border-b border-border/10 last:border-b-0 group/item"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm text-primary group-hover/item:text-primary/80 transition-colors">{result.symbol}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-xs">{result.name}</p>
                            </div>
                            <span className="text-xs font-medium text-primary/70 bg-primary/10 px-2.5 py-1 rounded-lg group-hover/item:bg-primary/20 transition-colors">
                              {result.exchange}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Mobile balance - inline with search */}
                {user && !hideBalance && (
                  <div className="md:hidden flex items-center px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary/40 shadow-lg shadow-primary/10">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="text-xs md:text-sm font-semibold font-mono text-primary ml-1.5">{formatCurrency(user.balance)}</span>
                  </div>
                )}
              </div>
              
              {/* Mobile Navigation Buttons - under search (reordered: Options, Predictions, Portfolio, About) */}
              <div className="flex items-center gap-0.5 md:hidden justify-between w-full mt-1">
                {/* Left section - Options and Predictions */}
                <div className="flex gap-0.5 flex-1">
                  <Link href="/options" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full h-9 text-xs md:text-sm border border-cyan-400/50 bg-cyan-500/10 text-cyan-600 font-semibold hover:bg-cyan-500/20 px-1">
                      <div className="flex items-center justify-center gap-0.5">
                        <BarChart3 className="h-3 w-3 text-cyan-500" />
                        <span>Options</span>
                      </div>
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 relative overflow-hidden group h-9 text-xs md:text-sm border bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20 border-purple-400/50 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 rounded-md px-1"
                    onClick={() => router.push('/predictions')}
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <Sparkles className="h-3 w-3 text-purple-500 animate-spin transition-all duration-300" />
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold group-hover:from-purple-500 group-hover:to-pink-500 transition-all duration-300">
                        Predictions
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></div>
                    <div className="absolute top-1 right-1 h-1 w-1 bg-yellow-400 rounded-full animate-ping opacity-60 group-hover:opacity-100"></div>
                  </Button>
                </div>

                {/* Right section - Portfolio and About */}
                <div className="flex gap-0.5 flex-1">
                  <Link href="/portfolio" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full h-9 text-xs md:text-sm border border-blue-400/50 bg-blue-500/10 text-blue-600 font-semibold hover:bg-blue-500/20 px-1">
                      <div className="flex items-center justify-center gap-0.5">
                        <Briefcase className="h-3 w-3 text-blue-500" />
                        <span>Portfolio</span>
                      </div>
                    </Button>
                  </Link>
                  <Link href="/about" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full h-9 text-xs md:text-sm border border-green-400/50 bg-green-500/10 text-green-600 font-semibold hover:bg-green-500/20 rounded-md flex items-center justify-center gap-0.5 px-1">
                      <Info className="h-3 w-3 text-green-500" />
                      <span>About</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Navigation - moved after search */}
          {user && !isLandingPage && (
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/options" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary/50 transition-colors group">
                <BarChart3 className="h-4 w-4 text-cyan-500 group-hover:text-cyan-400 transition-colors" />
                Options
              </Link>
              <Link
                href="/predictions"
                className="premium-prediction-button premium-magnetic-hover group relative px-2 py-1.5 md:px-3 md:py-2 rounded-md md:rounded-lg text-xs md:text-xs font-bold transition-all duration-500 ease-out
                         premium-aurora-effect premium-pulse-glow
                         text-white shadow-lg md:shadow-xl hover:shadow-purple-500/50
                         hover:scale-105 hover:-translate-y-0.5
                         border border-purple-500/30 hover:border-purple-400/50
                         overflow-hidden before:absolute before:inset-0
                         before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
                         before:translate-x-[-100%] hover:before:translate-x-[100%]
                         before:transition-transform before:duration-700 before:ease-out
                         after:absolute after:inset-0 after:rounded-md md:after:rounded-lg
                         after:bg-gradient-to-r after:from-purple-400/0 after:via-purple-400/20 after:to-purple-400/0
                         after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-300
                         animate-pulse hover:animate-none"
              >
                <span className="relative z-10 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 animate-spin animate-ping transition-all duration-300 drop-shadow-lg" />
                  <span className="bg-gradient-to-r from-yellow-200 via-yellow-100 to-white bg-clip-text text-transparent group-hover:from-yellow-100 group-hover:via-yellow-50 group-hover:to-white font-bold drop-shadow-sm">
                    Predictions
                  </span>
                  <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 md:h-2 md:w-2 bg-yellow-400 rounded-full animate-ping opacity-100"></div>
                  <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 md:h-2 md:w-2 bg-yellow-300 rounded-full animate-pulse opacity-50 group-hover:opacity-100"></div>
                  <div className="absolute -top-0.5 -right-0.5 h-1 w-1 md:h-1.5 md:w-1.5 bg-white rounded-full animate-pulse opacity-30 group-hover:opacity-80"></div>
                </span>
                <div className="absolute inset-0 rounded-md md:rounded-lg bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"></div>
                <div className="premium-shimmer-effect absolute inset-0 rounded-md md:rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 rounded-md md:rounded-lg bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
              </Link>
              <Link href="/portfolio" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary/50 transition-colors group">
                <Briefcase className="h-4 w-4 text-blue-500 group-hover:text-blue-400 transition-colors" />
                Portfolio
              </Link>
              <Link href="/about" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary/50 transition-colors group">
                <Info className="h-4 w-4 text-green-500 group-hover:text-green-400 transition-colors" />
                About
              </Link>
              
              {/* Wallet Section - Laptop View Only */}
              {user && !hideBalance && (
                <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold font-mono text-primary">{formatCurrency(user.balance)}</span>
                </div>
              )}
            </nav>
          )}

          {/* User Menu on Right */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 md:h-10 md:w-10 bg-secondary/50 -ml-2">
                  <User className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                    <Wallet className="h-3 w-3 text-primary" />
                    <span className="text-xs font-semibold font-mono">{formatCurrency(user.balance)}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {user.email === "admin@hrtik.com" && (
                  <DropdownMenuItem asChild className="cursor-pointer text-primary">
                    <Link href="/admin">Admin Dashboard</Link>
                  </DropdownMenuItem>
                )}                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/">Dashboard</Link>
                </DropdownMenuItem>                <DropdownMenuItem
                  onClick={() => {
                    try {
                      if (!user) return
                      if (!confirm('Reset your balance to ₹1,000,000?')) return
                      const delta = 1000000 - (user.balance || 0)
                      if (delta !== 0) updateBalance(delta)
                      alert('Your balance has been reset to ₹1,000,000')
                    } catch (e) { console.error(e) }
                  }}
                  className="cursor-pointer"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Reset Balance
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer relative overflow-hidden group md:hidden">
                  <Link href="/predictions" className="flex items-center gap-2 p-2">
                    <Sparkles className="h-3 w-3 text-purple-500 animate-spin transition-all duration-300" />
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold group-hover:from-purple-500 group-hover:to-pink-500 transition-all duration-300 text-sm">
                      Predictions
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></div>
                    <div className="absolute top-1 right-1 h-1.5 w-1.5 bg-yellow-400 rounded-full animate-ping opacity-60 group-hover:opacity-100"></div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/about">About</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* Login Buttons or Mobile Menu */}
          <div className="flex items-center gap-3 ml-auto">
            {!user ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="rounded-xl hidden md:inline-flex"
                  onClick={() => { try { window.dispatchEvent(new CustomEvent('open-login')) } catch(e){} }}
                >
                  Login
                </Button>
                <Button
                  className="rounded-xl gap-2 px-4 py-2 md:px-5 md:py-3 text-sm md:text-base bg-gradient-to-r from-primary to-accent hover:shadow-lg"
                  onClick={() => { try { window.dispatchEvent(new CustomEvent('open-login')) } catch(e){} }}
                >
                  <Sparkles className="h-4 w-4" />
                  Get Started
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
