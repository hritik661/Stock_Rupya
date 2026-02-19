"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { fetchGainersLosers, type StockQuote } from "@/lib/yahoo-finance"
import { formatCurrency, formatPercentage } from "@/lib/market-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Check } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { quoteCache } from "@/lib/cache-utils"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

export function GainersLosers() {
  const { user, setUserFromData } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [gainers, setGainers] = useState<StockQuote[]>([])
  const [losers, setLosers] = useState<StockQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showPaymentGate, setShowPaymentGate] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const TOP_COUNT = 100 // Show top 100 gainers/losers

  // Check if user has paid for Top Gainers access
  const hasTopGainersAccess = user?.isTopGainerPaid === true

  // Check if user came back from successful payment
  useEffect(() => {
    if (searchParams?.get('from') === 'top-gainers-payment' && searchParams?.get('success') === 'true') {
      if (hasTopGainersAccess) {
        setShowSuccessModal(true)
      }
    }
  }, [searchParams, hasTopGainersAccess])

  useEffect(() => {
    const fetchGainersLosersData = async () => {
      try {
        const { INDIAN_STOCKS } = await import("@/lib/stocks-data")
        const { fetchMultipleQuotes } = await import("@/lib/yahoo-finance")
        // Fetch all stocks to show all gainers
        const allSymbols = INDIAN_STOCKS.map(stock => stock.symbol)
        const cacheKey = `gainers_losers:${allSymbols.length}:${allSymbols.slice(0, 10).join(',')}`
        
        // Use cache with deduplication for ultra-fast loading
        const quotes = await quoteCache.withDedup(
          cacheKey,
          () => fetchMultipleQuotes(allSymbols),
          45000 // Cache for 45 seconds
        )
        
        if (!loading) setLoading(true) // Only set if not already loading
        // Show gainers between 5% and 30% (all gainer stocks)
        const gainersSorted = quotes
          .filter(q => typeof q.regularMarketChangePercent === 'number' && (q.regularMarketChangePercent || 0) >= 5)
          .sort((a, b) => (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0))
          .slice(0, TOP_COUNT)
        
        // Show losing stocks - ANY NEGATIVE CHANGE (more flexible for display)
        let losersSorted = quotes
          .filter(q => typeof q.regularMarketChangePercent === 'number' && (q.regularMarketChangePercent || 0) < 0)
          .sort((a, b) => (a.regularMarketChangePercent || 0) - (b.regularMarketChangePercent || 0))
          .slice(0, TOP_COUNT)
        
        setGainers(gainersSorted)
        setLosers(losersSorted)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching gainers/losers:", error)
        setLoading(false)
        setGainers([])
        setLosers([])
      }
    }
    fetchGainersLosersData()
    // Refresh every 3 minutes instead of 5 for fresher data
    const interval = setInterval(fetchGainersLosersData, 180000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Gainers Loading */}
        <Card className="border-2 border-border/50 shadow-lg bg-card">
          <CardHeader className="pb-1 md:pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-primary" />
              Top Gainers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 md:space-y-2">
            {Array.from({ length: TOP_COUNT }).map((_, j) => (
              <Skeleton key={j} className="h-6 md:h-8 w-full" />
            ))}
          </CardContent>
        </Card>

        {/* Losers Loading */}
        <Card className="border-2 border-border/50 shadow-lg bg-card">
          <CardHeader className="pb-1 md:pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
              Top Losers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 md:space-y-2">
            {Array.from({ length: TOP_COUNT }).map((_, j) => (
              <Skeleton key={j} className="h-6 md:h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      {/* Payment Gate Modal - Show if user doesn't have access and tried to view */}
      {showPaymentGate && !hasTopGainersAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border-2 border-primary/40 rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl">
            <h2 className="text-xl md:text-2xl font-bold mb-2 text-foreground">🔒 Top Gainers Premium Access</h2>
            <p className="text-muted-foreground mb-6">Get access to detailed fundamental analysis and advanced top gainers tracking.</p>
            
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 text-center mb-6">
              <p className="text-4xl font-black text-primary mb-2">₹200</p>
              <p className="text-muted-foreground text-sm mb-4">One-time payment for lifetime access</p>
              <ul className="space-y-2 text-sm text-foreground">
                <li className="flex items-center gap-2 justify-center">
                  <Check className="h-4 w-4 text-primary" />
                  Top Gainers Analysis
                </li>
                <li className="flex items-center gap-2 justify-center">
                  <Check className="h-4 w-4 text-primary" />
                  Fundamental Research
                </li>
                <li className="flex items-center gap-2 justify-center">
                  <Check className="h-4 w-4 text-primary" />
                  No monthly fees
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <button
                onClick={() => setShowPaymentGate(false)}
                className="px-3 py-2 md:px-4 md:py-2 rounded-lg border border-muted-foreground hover:border-foreground text-muted-foreground hover:text-foreground transition text-xs md:text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setProcessingPayment(true)
                  try {
                    // Check auth first with cache-busting
                    const authCheck = await fetch('/api/auth/me?t=' + Date.now(), {
                      method: 'GET',
                      cache: 'no-store',
                      credentials: 'include',
                      headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                      }
                    })
                    if (!authCheck.ok) {
                      alert('Please sign in to continue to payment.')
                      setProcessingPayment(false)
                      return
                    }

                    // Create payment link for top gainers
                    const res = await fetch('/api/top-gainers/create-payment', { 
                      method: 'POST',
                      credentials: 'include'
                    })
                    
                    if (!res.ok) {
                      let errorMsg = `Server error: ${res.status}`
                      try {
                        const errData = await res.json()
                        if (errData?.error) errorMsg = errData.error
                        if (errData?.details) errorMsg += ` - ${errData.details}`
                      } catch {}
                      console.error('Payment creation failed:', errorMsg)
                      alert(`Payment error: ${errorMsg}`)
                      setProcessingPayment(false)
                      return
                    }
                    
                    const data = await res.json()
                    
                    // Check if user already has access
                    if (data.alreadyPaid) {
                      alert('You already have access to top gainers!')
                      window.location.href = '/top-gainers'
                      setProcessingPayment(false)
                      return
                    }
                    
                    if (data.paymentLink) {
                      // Open Razorpay payment window
                      const paymentWindow = window.open(data.paymentLink, '_blank', 'width=500,height=700')
                      
                      // For test mode, if user was immediately marked as paid in DB, show success right away
                      if (data.immediatelyPaidInDb) {
                        console.log('✅ User immediately marked as paid in database')
                        await new Promise(resolve => setTimeout(resolve, 1500)) // Wait a bit for user to see payment window
                        if (paymentWindow) {
                          try { paymentWindow.close() } catch {}
                        }
                        // Update context and show success
                        if (setUserFromData) {
                          const updatedUser = { ...(user || {}), isTopGainerPaid: true }
                          setUserFromData(updatedUser)
                        }
                        setShowSuccessModal(true)
                        setTimeout(() => {
                          // Always redirect to top gainers list page to show all stocks
                          window.location.href = '/top-gainers?from=payment&success=true'
                        }, 3000)
                        return
                      }
                      
                      // Poll for payment window closure
                      const checkPayment = setInterval(async () => {
                        if (paymentWindow && paymentWindow.closed) {
                          clearInterval(checkPayment)
                          // Wait for webhook to process on backend
                          await new Promise(resolve => setTimeout(resolve, 2000))
                          
                          try {
                            // Verify payment status on server
                            const verifyRes = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
                            if (verifyRes.ok) {
                              const userData = await verifyRes.json()
                              
                              if (userData?.user?.isTopGainerPaid) {
                                // Payment successful - update auth context
                                if (setUserFromData && userData.user) {
                                  setUserFromData(userData.user)
                                }
                                // Show success modal then redirect
                                setShowSuccessModal(true)
                                setTimeout(() => {
                                  window.location.href = '/top-gainers?from=payment&success=true'
                                }, 3000)
                                return
                              }

                              // For localhost dev, provide fallback
                              const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
                              if (hostname === 'localhost' || hostname === '127.0.0.1') {
                                try {
                                  if (setUserFromData) {
                                    const patchedUser = { ...(user || {}), isTopGainerPaid: true }
                                    setUserFromData(patchedUser)
                                  }
                                  localStorage.setItem('topgainers_access', 'true')
                                  setShowSuccessModal(true)
                                  setTimeout(() => {
                                    window.location.href = '/top-gainers?from=payment&success=true&local=true'
                                  }, 3000)
                                  return
                                } catch (e) {
                                  // fallback
                                }
                              }

                              // Poll /api/auth/me for up to ~15 seconds to allow webhook/db update
                              let paymentConfirmed = false
                              for (let attempt = 0; attempt < 6; attempt++) {
                                await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
                                try {
                                  const pollRes = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
                                  if (pollRes.ok) {
                                    const pollData = await pollRes.json()
                                    if (pollData?.user?.isTopGainerPaid) {
                                      paymentConfirmed = true
                                      if (setUserFromData && pollData.user) setUserFromData(pollData.user)
                                      setShowSuccessModal(true)
                                      setTimeout(() => {
                                        // Always redirect to top gainers list page to display all stocks
                                        window.location.href = '/top-gainers?from=payment&success=true'
                                      }, 2000)
                                      break
                                    }
                                  }
                                } catch (e) {
                                  // ignore transient poll errors
                                }
                              }

                              if (!paymentConfirmed) {
                                // If still not confirmed, redirect to top-gainers page where user can retry/refresh
                                alert('Payment verification delayed. Please refresh the Top Gainers page if access does not appear.')
                                window.location.href = '/top-gainers'
                              }
                            }
                          } catch (err) {
                            console.error('Payment verification error:', err)
                            alert('Payment verification failed. Redirecting...')
                            window.location.href = '/'
                          } finally {
                            setProcessingPayment(false)
                          }
                        }
                      }, 500)
                    } else {
                      console.error('No payment link received:', data)
                      alert(data.error || 'Unable to generate payment link. Please try again.')
                      setProcessingPayment(false)
                    }
                  } catch (err) {
                    console.error('Error starting payment:', err)
                    alert('Error starting payment. Please try again.')
                    setProcessingPayment(false)
                  }
                }}
                disabled={processingPayment}
                className="px-3 py-2 md:px-4 md:py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white transition text-xs md:text-sm font-semibold flex-1"
              >
                {processingPayment ? '⏳ Processing...' : '💳 Pay ₹200'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl p-6 md:p-8 shadow-2xl text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-emerald-700/20 border-2 border-emerald-600 flex items-center justify-center animate-bounce">
                <Check className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-2 text-emerald-400">🎉 Welcome to Top Gainers Service!</h2>
            <p className="text-sm md:text-base text-muted-foreground mb-6">Your payment was successful. You now have lifetime access to top gainer analysis. Let's start trading smart!</p>
            <button
              onClick={() => {
                setShowSuccessModal(false)
                window.location.href = '/top-gainers?from=payment&success=true'
              }}
              className="w-full px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold transition text-sm md:text-base"
            >
              OK, Show Me Top Gainers
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6">
        {/* Top Gainers Card */}
        <div>
          {!hasTopGainersAccess ? (
            <Card className="shadow-lg bg-card/50 border-2 border-primary/20 p-1 md:p-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center">
                <button
                  onClick={() => router.push('/top-gainers')}
                  className="px-4 py-2 md:px-6 md:py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg text-sm md:text-base transition"
                >
                  🔒 Unlock Top Gainers
                </button>
              </div>
              <CardHeader className="pb-0.5 md:pb-2 opacity-50">
                <CardTitle className="text-xs md:text-base flex items-center gap-1 md:gap-2">
                  <TrendingUp className="h-2.5 w-2.5 md:h-4 md:w-4 text-primary" />
                  Top Gainers (5%+)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5 md:space-y-2 opacity-30">
                {gainers.slice(0, 5).map((stock) => (
                  <div key={stock.symbol} className="h-6 md:h-8 bg-secondary/50 rounded animate-pulse" />
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg bg-card hover:border-primary/30 transition-colors p-1 md:p-2">
              <CardHeader className="pb-1 md:pb-3">
                <CardTitle className="text-sm md:text-xl font-bold flex items-center gap-2 md:gap-3">
                  <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                  Top Gainers (5%+)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 md:space-y-3 max-h-48 md:max-h-96 overflow-y-auto">
                {Array.from(new Map(gainers.map(s => [s.symbol, s])).values()).map((stock) => (
                  <Link
                    key={stock.symbol}
                    href={`/stock/${encodeURIComponent(stock.symbol)}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-2 md:p-3 rounded-md md:rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer border-2 border-border/40 hover:border-border/60">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                          <h3 className="font-semibold text-sm md:text-base truncate">
                            {stock.symbol.replace('.NS', '').replace('.BO', '')}
                          </h3>
                          <Badge
                            variant="default"
                            className="text-xs md:text-sm px-2 md:px-2.5 py-0.5 bg-primary/20 text-primary font-semibold"
                          > {formatPercentage(stock.regularMarketChangePercent)}
                          </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground truncate\">
                          {stock.shortName || stock.longName}
                        </p>
                      </div>
                      <div className="text-right ml-2 md:ml-3\">
                        <p className="font-mono font-semibold text-sm md:text-base\">
                          {formatCurrency(stock.regularMarketPrice)}
                        </p>
                        <p className="text-[10px] md:text-xs flex items-center gap-0.5 md:gap-1 text-primary">
                          <ArrowUpRight className="h-2 w-2 md:h-2.5 md:w-2.5" />
                          {formatCurrency(stock.regularMarketChange)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
                {gainers.length === 0 && (
                  <p className="text-[10px] md:text-sm text-muted-foreground text-center py-2 md:py-4">
                    No gainers available
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Top Losers Card */}
        <Card className="shadow-lg bg-card border-2 border-border/50 hover:border-border/70 transition-colors p-1 md:p-2">
          <CardHeader className="pb-1 md:pb-3">
            <CardTitle className="text-sm md:text-xl font-bold flex items-center gap-2 md:gap-3">
              <TrendingDown className="h-4 w-4 md:h-6 md:w-6 text-destructive" />
              Top Losers 
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 md:space-y-3 max-h-48 md:max-h-96 overflow-y-auto">
            {Array.from(new Map(losers.map(s => [s.symbol, s])).values()).map((stock) => (
              <Link
                key={stock.symbol}
                href={`/stock/${encodeURIComponent(stock.symbol)}`}
                className="block"
              >
                <div className="flex items-center justify-between p-1 md:p-2 rounded-md md:rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer border-2 border-border/40 hover:border-border/60">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
                      <h3 className="font-semibold text-sm md:text-base truncate">
                        {stock.symbol.replace('.NS', '').replace('.BO', '')}
                      </h3>
                      <span className="text-xs md:text-sm text-destructive font-semibold">
                        {formatPercentage(stock.regularMarketChangePercent)}%
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                      {stock.shortName || stock.longName}
                    </p>
                  </div>
                  <div className="text-right ml-2 md:ml-3">
                    <p className="font-mono font-semibold text-sm md:text-base">
                      {formatCurrency(stock.regularMarketPrice)}
                    </p>
                    <p className="text-xs md:text-sm flex items-center gap-0.5 md:gap-1 text-destructive">
                      <ArrowDownRight className="h-2 w-2 md:h-2.5 md:w-2.5" />
                      {formatCurrency(stock.regularMarketChange)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            {losers.length === 0 && (
              <p className="text-xs md:text-sm text-muted-foreground text-center py-2 md:py-4">
                No losers available
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
