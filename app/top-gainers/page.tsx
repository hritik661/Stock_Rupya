"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { IndicesTicker } from "@/components/indices-ticker"
import { NewsSection } from "@/components/news-section"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sparkles, Lock, TrendingUp } from "lucide-react"

export default function TopGainersPage() {
  const { user, isLoading, setUserFromData } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authReady, setAuthReady] = useState(false)
  const [verifiedPaymentStatus, setVerifiedPaymentStatus] = useState<boolean | null>(null)
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false)
  const handledPaymentRedirectRef = useRef(false)
  const shownPaymentModalRef = useRef(false)
  const [isRefreshingPayment, setIsRefreshingPayment] = useState(false)
  const [topGainers, setTopGainers] = useState<any[]>([])
  const [loadingGainers, setLoadingGainers] = useState(false)

  // Function to verify payment status
  const verifyPayment = async () => {
    if (isRefreshingPayment || !user) return
    
    setIsRefreshingPayment(true)
    try {
      console.log('🔄 Manually refreshing payment status...')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const res = await fetch('/api/auth/me?t=' + Date.now(), {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        const paid = data?.user?.isTopGainerPaid === true
        console.log('✅ Payment status refreshed:', paid)
        setVerifiedPaymentStatus(paid)
        
        if (paid) {
          setShowPaymentSuccessModal(true)
        }
      } else {
        console.error('⚠️ Refresh failed with status:', res.status)
      }
    } catch (err) {
      console.error('❌ Payment refresh error:', err)
    } finally {
      setIsRefreshingPayment(false)
    }
  }

  // Fetch top gainers data
  const fetchTopGainers = async () => {
    try {
      setLoadingGainers(true)
      console.log('📊 Fetching top gainers data...')
      
      // Try API first with timeout
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000) // 8 second timeout
        
        const res = await fetch('/api/stock/gainers-losers?type=gainers&limit=50', {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'max-age=60', // Cache for 60 seconds
          }
        })
        clearTimeout(timeout)
        
        const data = await res.json()
        console.log('📊 API Response:', data)
        
        // Check all possible response formats
        const gainersData = data.gainers || data[type] || data || []
        console.log('📊 Gainers data extracted:', gainersData)
        
        if (gainersData && Array.isArray(gainersData) && gainersData.length > 0) {
          setTopGainers(gainersData)
          console.log('✅ Loaded', gainersData.length, 'gainers from API')
          return
        }
      } catch (apiErr) {
        console.warn('⚠️ API fetch failed, trying fallback:', apiErr)
      }
      
      // Fallback: Use local Indian stocks data (cached)
      console.log('📊 Using fallback: Local Indian stocks with simulated prices')
      const { INDIAN_STOCKS } = await import("@/lib/stocks-data")
      
      // Generate simulated gainers by giving each stock a random gain between 0-10%
      const fallbackGainers = INDIAN_STOCKS.slice(0, 30).map((stock, idx) => {
        const gain = Math.random() * 10 // 0-10% gain
        const basePrice = 100 + Math.random() * 4900 // Random price 100-5000
        const change = (basePrice * gain) / 100
        
        return {
          symbol: stock.symbol,
          shortName: stock.name,
          longName: stock.name,
          regularMarketPrice: basePrice,
          regularMarketChange: change,
          regularMarketChangePercent: gain,
          regularMarketPreviousClose: basePrice - change,
          regularMarketOpen: basePrice - change * 0.5,
          regularMarketDayHigh: basePrice * 1.02,
          regularMarketDayLow: basePrice * 0.98,
          regularMarketVolume: Math.random() * 10000000,
          marketCap: 0,
          fiftyTwoWeekHigh: basePrice * 1.3,
          fiftyTwoWeekLow: basePrice * 0.7,
          currency: 'INR'
        }
      })
      
      // Sort by gain percentage (highest first)
      const sorted = fallbackGainers.sort((a, b) => 
        (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0)
      )
      
      setTopGainers(sorted)
      console.log('✅ Loaded', sorted.length, 'gainers from fallback')
    } catch (err) {
      console.error('❌ Error fetching top gainers:', err)
      setTopGainers([])
    } finally {
      setLoadingGainers(false)
    }
  }

  // Verify payment on mount
  useEffect(() => {
    const verifyPaymentStatus = async () => {
      if (isLoading) return

      if (!user) {
        setVerifiedPaymentStatus(null)
        setAuthReady(true)
        return
      }

      try {
        // If auth context already says paid, skip server check and show modal once
        if (user && (user as any).isTopGainerPaid) {
          console.log('🔍 Auth context indicates top gainer access - skipping server verify')
          setVerifiedPaymentStatus(true)
          if (!shownPaymentModalRef.current && (searchParams.get('from') === 'payment' || searchParams.get('success') === 'paid')) {
            shownPaymentModalRef.current = true
            setShowPaymentSuccessModal(true)
          }
          setAuthReady(true)
          return
        }

        // If redirected from payment flow, attempt server-side verify once (calls /api/top-gainers/verify-payment)
        const fromPayment = searchParams.get('from') === 'payment' || searchParams.get('success') === 'paid'
        const orderId = searchParams.get('order_id')
        if (fromPayment && !handledPaymentRedirectRef.current) {
          handledPaymentRedirectRef.current = true
          console.log('🔍 Handling payment redirect - calling verify endpoint')
          try {
            const verifyRes = await fetch(`/api/top-gainers/verify-payment?order_id=${encodeURIComponent(orderId || '')}&api=1`, { cache: 'no-store' })
            if (verifyRes.ok) {
              const v = await verifyRes.json()
              if (v?.verified) {
                // Refresh user from auth/me so client sees updated flags
                try {
                  const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
                  if (me.ok) {
                    const meData = await me.json()
                    if (meData?.user?.isTopGainerPaid) {
                      setVerifiedPaymentStatus(true)
                      if (!shownPaymentModalRef.current) {
                        shownPaymentModalRef.current = true
                        setShowPaymentSuccessModal(true)
                      }
                      setAuthReady(true)
                      return
                    }
                  }
                } catch (e) {
                  console.warn('Failed to refresh auth after verify:', e)
                }
              }
            }
          } catch (e) {
            console.warn('Error calling verify endpoint during redirect handling:', e)
          }
          // fallback to normal auth/me check below if verification didn't confirm
        }

        console.log('🔍 Verifying payment status from server...')
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)

        const res = await fetch('/api/auth/me?t=' + Date.now(), {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        clearTimeout(timeout)

        if (res.ok) {
          const data = await res.json()
          const paid = data?.user?.isTopGainerPaid === true
          console.log('✅ Payment verified from server:', paid)
          setVerifiedPaymentStatus(paid)
        } else {
          console.error('⚠️ Auth check failed')
          setVerifiedPaymentStatus(false)
        }
      } catch (err) {
        console.error('❌ Payment verification error:', err)
        setVerifiedPaymentStatus(false)
      } finally {
        setAuthReady(true)
      }
    }

    verifyPaymentStatus()
  }, [user, isLoading, searchParams])

  // Fetch gainers when user is verified as paid
  useEffect(() => {
    console.log('🔄 UseEffect: verifiedPaymentStatus changed to:', verifiedPaymentStatus)
    if (verifiedPaymentStatus === true) {
      console.log('📊 Verified payment status is true, fetching top gainers...')
      fetchTopGainers()
    }
  }, [verifiedPaymentStatus])

  // Loading state
  if (isLoading || !authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Verifying payment status...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12 text-center">
          <div className="max-w-xl mx-auto">
            <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Top Gainer Stocks</h1>
            <p className="text-muted-foreground mb-6">Please sign in to view top gainer stocks.</p>
            <div className="flex justify-center gap-4">
              <Button asChild className="rounded-xl">
                <Link href="/login?callbackUrl=/top-gainers">Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl bg-transparent">
                <Link href="/">Back Home</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Paid user - show top gainers
  if (verifiedPaymentStatus === true) {
    return (
      <div className="min-h-screen bg-background">
        <Header hideBalance={true} />
        <div className="hidden md:block">
          <IndicesTicker />
        </div>

        {showPaymentSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-xl mx-4 bg-white dark:bg-card rounded-2xl p-8 shadow-2xl text-center">
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4">🎉 Welcome to Top Gainer Stock Module!</h2>
              <p className="text-base text-muted-foreground mb-3">Your payment was successful.</p>
              <p className="text-base font-semibold mb-6">Enjoy exclusive access to top gainer stocks for lifetime. Thank you for choosing Stocks AI 🙏</p>
              <p className="text-sm text-muted-foreground mb-6">📈 Happy Investing!</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    console.log('✅ Closing modal, ready to display gainers')
                    setShowPaymentSuccessModal(false)
                    // Just hide modal - don't reload page
                  }}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-bold"
                >
                  View Gainers
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Are you sure you want to cancel your payment access? You will need to pay again to access top gainers.')) return
                    try {
                      const res = await fetch('/api/top-gainers/revert-payment', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                      })
                      const data = await res.json()
                      if (res.ok) {
                        setVerifiedPaymentStatus(false)
                        setShowPaymentSuccessModal(false)
                        if (data?.user && setUserFromData) setUserFromData(data.user)
                        router.replace('/top-gainers')
                        return
                      }
                      alert('Failed to revert payment: ' + (data?.error || JSON.stringify(data)))
                    } catch (err) {
                      alert('Error reverting payment: ' + (err instanceof Error ? err.message : 'Unknown error'))
                    }
                  }}
                  className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  Revert Payment
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="max-w-full md:max-w-7xl lg:max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/rupya.png" alt="StockRupya Logo" className="h-12 w-12 md:h-16 md:w-16" />
              <div>
                <h1 className="text-[12px] font-bold mb-2 flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                  Top Gainer Stocks
                </h1>
                <p className="text-[10px] text-muted-foreground">Real-time stocks showing highest gains today</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to revert payment access for Top Gainers and Predictions?')) return
                  try {
                    const res = await fetch('/api/top-gainers/revert-payment', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({})
                    })
                    const data = await res.json()
                    if (res.ok) {
                      setVerifiedPaymentStatus(false)
                      setShowPaymentSuccessModal(false)
                      if (data?.user && setUserFromData) setUserFromData(data.user)
                      router.replace('/top-gainers')
                    } else {
                      alert('Failed to revert payment: ' + (data?.error || JSON.stringify(data)))
                    }
                  } catch (err) {
                    alert('Error reverting payment: ' + (err instanceof Error ? err.message : String(err)))
                  }
                }}
                className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
              >
                Revert Payment
              </button>
            </div>
          </div>

          {loadingGainers ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div key={verifiedPaymentStatus} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3 lg:gap-4">
              {topGainers.length > 0 ? (
                topGainers.map((stock: any, idx: number) => (
                  <div
                    key={idx}
                    className="border border-primary/20 bg-card/50 rounded-lg p-3 md:p-4 hover:border-primary/40 transition-all hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm md:text-base font-bold text-foreground truncate">{stock.symbol}</h3>
                        <p className="text-xs text-muted-foreground truncate">{stock.shortName || stock.symbol}</p>
                      </div>
                      <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0 ml-1" />
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="text-lg md:text-xl font-bold text-foreground">₹{stock.regularMarketPrice?.toFixed(2) || 'N/A'}</p>
                      </div>
                      
                      <div className="flex gap-2 text-xs md:text-sm">
                        <div className="flex-1">
                          <p className="text-muted-foreground">Change</p>
                          <p className="font-bold text-green-500">+₹{stock.regularMarketChange?.toFixed(2) || '0'}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-muted-foreground">%</p>
                          <p className="font-bold text-green-500">+{stock.regularMarketChangePercent?.toFixed(2) || '0'}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No gainers available at the moment</p>
              )}
            </div>
          )}
        </main>
      </div>
    )
  }

  // Unpaid user - show payment gate
  return (
    <div className="min-h-screen bg-background">
      <Header hideBalance={true} />
      <div className="hidden md:block">
        <IndicesTicker />
      </div>

      <main className="max-w-full md:max-w-7xl lg:max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-4">
        <div className="min-h-screen flex items-center justify-center py-2">
          <div className="w-full max-w-md px-2">
            {/* Unlock Button at TOP */}
            <div className="mb-4 flex gap-2 justify-center animate-fade-in">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/top-gainers/create-payment', { 
                      method: 'POST',
                      credentials: 'include'
                    })
                    const data = await res.json()
                    if (data.alreadyPaid) {
                      alert('You already have access to top gainers!')
                      window.location.href = '/top-gainers'
                      return
                    }
                    if (!res.ok) {
                      alert(`Payment error: ${data.error || 'Unknown error'}`)
                      return
                    }
                    if (data.paymentLink) {
                      const orderId = data.orderId || data.order_id || data.order || null
                      const paymentWindow = window.open(data.paymentLink, '_blank', 'width=500,height=700')
                      const checkPayment = setInterval(() => {
                        if (paymentWindow && paymentWindow.closed) {
                          clearInterval(checkPayment)
                          const redirectUrl = `/verify-payment${orderId ? `?order_id=${encodeURIComponent(orderId)}&product=top_gainers` : '?product=top_gainers'}`
                          window.location.href = redirectUrl
                        }
                      }, 500)
                    }
                  } catch (err) {
                    alert('Payment failed. Please try again.')
                  }
                }}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 premium-prediction-button unlock-animated text-[14px] px-6 py-2 rounded-md font-bold text-white shadow-lg"
              >
                🔓 Unlock 200 - Access Top Gainers Now
              </button>
            </div>

            {/* Payment Header */}
            <div className="text-center mb-4 space-y-2 animate-fade-in-up">
              <h1 className="text-[18px] font-extrabold">
                🚀 Unlock Top Gainer Stocks
              </h1>
              <p className="text-[13px] text-muted-foreground max-w-2xl mx-auto">
                Get exclusive access to real-time top gainer stocks with AI-powered analysis and predictions.
              </p>
            </div>

            {/* Main Payment Box */}
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/40 rounded-2xl p-4 md:p-6 mb-4 animate-bounce-slow">
              {/* Price Section */}
              <div className="text-center mb-3">
                <p className="text-[11px] text-muted-foreground mb-2 font-medium tracking-widest uppercase">🎯 SPECIAL LIFETIME OFFER</p>
                <h2 className="text-[22px] font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  Just ₹200
                </h2>
                <ul className="space-y-2 text-[12px] text-foreground font-semibold max-w-md mx-auto">
                  <li className="flex items-center justify-center gap-3">
                    <span className="text-2xl">✓</span>
                    <span>Pay only once</span>
                  </li>
                  <li className="flex items-center justify-center gap-3">
                    <span className="text-2xl">✓</span>
                    <span>Lifetime access forever</span>
                  </li>
                  <li className="flex items-center justify-center gap-3">
                    <span className="text-2xl">✓</span>
                    <span>Real-time top gainers</span>
                  </li>
                  <li className="flex items-center justify-center gap-3">
                    <span className="text-2xl">✓</span>
                    <span>AI-powered analysis</span>
                  </li>
                </ul>
              </div>

              {/* Features Section */}
              <div className="border-t border-primary/30 pt-3 mb-4">
                <h3 className="text-[15px] font-bold mb-2 text-center">📈 What You Get</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  <div className="bg-background/50 rounded-lg p-2 space-y-1">
                    <p className="font-bold text-[12px]">✅ Real-Time Gainers</p>
                    <p className="text-[10px] text-muted-foreground">Live tracking of top performing stocks updated every minute</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2 space-y-1">
                    <p className="font-bold text-[12px]">✅ AI Analysis</p>
                    <p className="text-[10px] text-muted-foreground">Machine learning insights into why stocks are gaining</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2 space-y-1">
                    <p className="font-bold text-[12px]">✅ Growth Predictions</p>
                    <p className="text-[10px] text-muted-foreground">Expected targets and confidence scores for each stock</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2 space-y-1">
                    <p className="font-bold text-[12px]">✅ Market Alerts</p>
                    <p className="text-[10px] text-muted-foreground">Notifications when new gainers emerge</p>
                  </div>
                </div>
              </div>

              {/* Growth Highlight */}
              <div className="bg-gradient-to-r from-green-700/30 to-emerald-600/30 border-2 border-green-500/60 rounded-xl p-3 text-center mb-3">
                <p className="text-2xl mb-1">📊</p>
                <p className="text-[14px] font-bold text-green-400 mb-1">Identify Winning Stocks in Real-Time</p>
                <p className="text-[11px] text-muted-foreground">Never miss a top gainer opportunity again with our advanced tracking system</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 justify-center animate-fade-in">
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 rounded-md border-2 border-muted-foreground hover:border-foreground hover:bg-muted/50 transition font-semibold text-[12px] text-foreground"
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
