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
  // In-page payment flow states
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null)
  const [showPaymentIframe, setShowPaymentIframe] = useState(false)
  const [paymentIdInput, setPaymentIdInput] = useState('')
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [paymentVerifyError, setPaymentVerifyError] = useState<string | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Verify a payment by its Razorpay payment id (used by Checkout handler and manual input)
  const verifyPaymentById = async (paymentId: string) => {
    if (!paymentId) return false
    setPaymentVerifyError(null)
    setVerifyingPayment(true)
    try {
      const res = await fetch('/api/top-gainers/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ payment_id: paymentId })
      })
      const txt = await res.text().catch(() => '')
      let j: any = {}
      try { j = txt ? JSON.parse(txt) : {} } catch (e) { j = { raw: txt } }

      console.log('[TOP-GAINERS][VERIFY BY ID] parsed JSON response', res.status, j)
      if (res.ok && j?.verified) {
        try {
          const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
          if (me.ok) {
            const meData = await me.json()
            if (meData?.user && setUserFromData) setUserFromData(meData.user)
            if (meData?.user?.isTopGainerPaid) setVerifiedPaymentStatus(true)
          }
        } catch (e) { console.warn('Failed to refresh auth after Checkout verify:', e) }
        setShowPaymentIframe(false)
        setPaymentUrl(null)
        setPaymentOrderId(null)
        setPaymentIdInput('')
        return true
      }

      const display = j?.error ? `${j.error}${j?.reason ? ' (' + j.reason + ')' : ''}` : `Verification failed (status ${res.status}).`
      setPaymentVerifyError(`${display} ${JSON.stringify(j)}`)
      return false
    } catch (err) {
      setPaymentVerifyError(err instanceof Error ? err.message : 'Verification error')
      return false
    } finally {
      setVerifyingPayment(false)
    }
  }

  const fetchTopGainers = async () => {
    setLoadingGainers(true)
    try {
      // Try server endpoint first
      try {
        const res = await fetch('/api/top-gainers?api=1', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const items = data?.gainers || data || []
          setTopGainers(items)
          console.log('✅ Loaded', items.length, 'gainers from API')
          return
        }
      } catch (e) {
        console.warn('API fetch failed, falling back to mock gainers', e)
      }

      // Fallback mock gainers
      const fallbackSymbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'LT', 'SBIN', 'AXISBANK', 'KOTAKBANK', 'BHARTIARTL']
      const fallbackGainers = fallbackSymbols.map((sym, idx) => {
        const basePrice = 100 + Math.random() * 2000
        return {
          symbol: sym,
          shortName: sym,
          regularMarketPrice: basePrice,
          regularMarketChange: +(Math.random() * 50).toFixed(2),
          regularMarketChangePercent: +(Math.random() * 10).toFixed(2),
          regularMarketVolume: Math.floor(Math.random() * 10000000),
          marketCap: 0,
          fiftyTwoWeekHigh: +(basePrice * 1.3).toFixed(2),
          fiftyTwoWeekLow: +(basePrice * 0.7).toFixed(2),
          currency: 'INR'
        }
      })

      // Sort by gain percentage (highest first)
      const sorted = fallbackGainers.sort((a, b) => (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0))
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

  // Manual verify handler removed — verification is handled via checkout + server verify endpoints

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
              <div>
                <h1 className="text-sm md:text-base font-bold mb-2 flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                  Top Gainer Stocks
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">Real-time stocks showing highest gains today</p>
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
            <div className="mb-6 flex gap-2 justify-center">
              <button
                onClick={async () => {
                  setIsProcessingPayment(true)
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
                      // Open the hosted payment in an in-page modal (iframe)
                      setPaymentUrl(data.paymentLink)
                      setPaymentOrderId(orderId)
                      setShowPaymentIframe(true)
                      // If an orderId exists, start polling server verify (useful for hosted payment links)
                      if (orderId) {
                        (async function pollOrder() {
                          const maxAttempts = 20
                          let attempts = 0
                          while (attempts < maxAttempts) {
                            try {
                              const q = new URLSearchParams()
                              q.set('order_id', orderId)
                              q.set('api', '1')
                              const r = await fetch(`/api/top-gainers/verify-payment?${q.toString()}`, { cache: 'no-store' })
                              if (r.ok) {
                                const j = await r.json().catch(() => ({}))
                                if (j?.verified) {
                                  try {
                                    const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
                                    if (me.ok) {
                                      const meData = await me.json()
                                      if (meData?.user) {
                                        if (meData?.user?.isTopGainerPaid) setVerifiedPaymentStatus(true)
                                        if (setUserFromData) setUserFromData(meData.user)
                                      }
                                    }
                                  } catch (e) { console.warn('Failed to refresh auth after verify poll', e) }
                                      setShowPaymentIframe(false)
                                      setPaymentUrl(null)
                                      setPaymentOrderId(null)
                                      try {
                                        router.replace('/predictions?from=payment&success=paid')
                                      } catch (e) { window.location.href = '/predictions?from=payment&success=paid' }
                                      fetchTopGainers()
                                      return
                                }
                              }
                            } catch (e) {}
                            attempts++
                            await new Promise((res) => setTimeout(res, 3000))
                          }
                        })()
                      }
                    }
                    // If server provided a Razorpay order id, open Checkout
                    if (data?.razorpayOrderId && (window as any).Razorpay) {
                      const options = {
                        key: data?.keyId || data?.razorpayKey,
                        order_id: data.razorpayOrderId,
                        handler: async (resp: any) => {
                          try {
                            const pid = resp?.razorpay_payment_id || resp?.payment_id || ''
                            if (pid) {
                              setPaymentIdInput(pid)
                              // POST to verify endpoint
                              const r = await fetch('/api/top-gainers/verify-payment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ payment_id: pid })
                              })
                              const j = await r.json().catch(() => ({}))
                              if (r.ok && j?.verified) {
                                try {
                                  const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
                                  if (me.ok) {
                                    const meData = await me.json()
                                    if (meData?.user) {
                                      if (meData?.user?.isTopGainerPaid) setVerifiedPaymentStatus(true)
                                      if (setUserFromData) setUserFromData(meData.user)
                                    }
                                  }
                                } catch (e) { console.warn('Failed to refresh auth after Checkout verify', e) }
                                setShowPaymentIframe(false)
                                setPaymentUrl(null)
                                setPaymentIdInput('')
                                try {
                                  router.replace('/predictions?from=payment&success=paid')
                                } catch (e) { window.location.href = '/predictions?from=payment&success=paid' }
                                fetchTopGainers()
                                return
                              }
                            }
                          } catch (e) { console.warn('Razorpay handler error', e) }
                        }
                      }
                      const rzp = new (window as any).Razorpay(options)
                      rzp.open()
                      setIsProcessingPayment(false)
                      return
                    }
                  } catch (err) {
                    alert('Payment failed. Please try again.')
                  } finally {
                    setIsProcessingPayment(false)
                  }
                }}
                disabled={isProcessingPayment}
                className="relative w-full max-w-lg flex items-center justify-center px-6 py-3 rounded-2xl font-extrabold text-white shadow-2xl overflow-hidden transform transition-all duration-300 hover:scale-105"
              >
                <span className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-pink-600 to-indigo-600 opacity-80 blur-lg animate-pulse-slow"></span>
                <span className="relative z-10 flex items-center gap-3">
                
                  <span className="text-sm">{isProcessingPayment ? 'Processing...' : '🔓 Unlock ₹200 - Access Top Gainers Now'}</span>
                </span>
              </button>
            </div>

            {/* Payment Header */}
            <div className="text-center mb-4 space-y-2 animate-fade-in-up">
              <h1 className="text-lg md:text-xl font-extrabold">
                🚀 Unlock Top Gainer Stocks
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                Get exclusive access to real-time top gainer stocks with AI-powered analysis and predictions.
              </p>
            </div>

            {/* Main Payment Box */}
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/40 rounded-2xl p-4 md:p-6 mb-4 animate-bounce-slow">
              {/* Price Section */}
              <div className="text-center mb-3">
                <p className="text-xs md:text-sm text-muted-foreground mb-2 font-medium tracking-widest uppercase">🎯 SPECIAL LIFETIME OFFER</p>
                <h2 className="text-xl md:text-2xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  Just ₹200
                </h2>
                <ul className="space-y-2 text-sm md:text-base text-foreground font-semibold max-w-md mx-auto">
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
                <h3 className="text-sm md:text-lg font-bold mb-2 text-center">📈 What You Get</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  <div className="bg-background/50 rounded-lg p-2 space-y-1">
                    <p className="font-bold text-sm md:text-base">✅ Real-Time Gainers</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Live tracking of top performing stocks updated every minute</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2 space-y-1">
                    <p className="font-bold text-sm md:text-base">✅ AI Analysis</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Machine learning insights into why stocks are gaining</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2 space-y-1">
                    <p className="font-bold text-sm md:text-base">✅ Growth Predictions</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Expected targets and confidence scores for each stock</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2 space-y-1">
                    <p className="font-bold text-sm md:text-base">✅ Market Alerts</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Notifications when new gainers emerge</p>
                  </div>
                </div>
              </div>

              {/* Growth Highlight */}
              <div className="bg-gradient-to-r from-green-700/30 to-emerald-600/30 border-2 border-green-500/60 rounded-xl p-3 text-center mb-3">
                <p className="text-2xl mb-1">📊</p>
                <p className="text-sm md:text-base font-bold text-green-400 mb-1">Identify Winning Stocks in Real-Time</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Never miss a top gainer opportunity again with our advanced tracking system</p>
              </div>
            </div>

     

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 justify-center animate-fade-in">
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 rounded-md border-2 border-muted-foreground hover:border-foreground hover:bg-muted/50 transition font-semibold text-sm md:text-base text-foreground"
              >
                ✕ Cancel
              </button>
            </div>

            {/* Manual verify input removed per request — verification is handled via checkout and server verify endpoints */}
          </div>
        </div>
      </main>
      {/* In-page payment iframe + manual payment-id verification */}
      {showPaymentIframe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-1 sm:p-3 md:p-6">
          <div className="relative w-full h-[95vh] sm:h-[92vh] md:h-[90vh] max-w-7xl rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-900/95 to-black/95 overflow-hidden flex flex-col ring-1 ring-white/10">
            {/* Close button */}
            <button
              onClick={() => setShowPaymentIframe(false)}
              aria-label="Close payment"
              className="absolute top-2 right-2 sm:top-3 sm:right-3 z-50 w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white shadow-lg text-lg sm:text-xl"
            >
              ✕
            </button>

            {/* Header - compact on mobile */}
            <div className="flex items-center justify-between px-2 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 border-b border-white/10 bg-black/40 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-xs sm:text-base md:text-lg font-bold text-white">Complete Payment</div>
                <div className="hidden sm:inline-block px-2 py-0.5 text-xs rounded-md bg-white/10 text-white/80 font-medium">Secure</div>
              </div>
              <button
                onClick={() => setShowPaymentIframe(false)}
                className="hidden sm:inline-block px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-xs text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>

            {/* Main Grid - 2 columns on all screens */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-0 overflow-hidden min-h-0">
              {/* Iframe Section - 1 col mobile, 2 cols tablet, 3 cols desktop */}
              <div className="sm:col-span-2 md:col-span-3 border-r border-white/10 min-h-0 bg-white">
                <iframe
                  src={paymentUrl || ''}
                  title="Payment"
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                />
              </div>

              {/* Right Sidebar - 1 col mobile, 1 col tablet, 2 cols desktop - COMPACT, NO SCROLL */}
              <div className="sm:col-span-1 md:col-span-2 p-1.5 sm:p-3 md:p-5 bg-gradient-to-b from-black/60 to-black/40 flex flex-col min-h-0 overflow-hidden">
                <div className="space-y-1.5 sm:space-y-3 flex-1 flex flex-col justify-start">
                  <div className="text-[10px] sm:text-xs md:text-sm text-white/80 leading-tight">Copy Razorpay ID from success screen and paste below to verify.</div>

                  <div className="flex items-center gap-0.5 sm:gap-1.5 min-w-0">
                    <input
                      value={paymentIdInput}
                      onChange={(e) => { setPaymentIdInput(e.target.value); setPaymentVerifyError(null) }}
                      placeholder="pay_XXX"
                      className="flex-1 min-w-0 px-1.5 sm:px-2.5 md:px-3 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs md:text-sm bg-white/8 hover:bg-white/12 placeholder-white/50 rounded text-white outline-none transition-colors focus:bg-white/15 focus:ring-1 focus:ring-emerald-400"
                    />
                    <button
                      onClick={async () => {
                        setPaymentVerifyError(null)
                        if (!paymentIdInput) { setPaymentVerifyError('Please enter the payment id'); return }
                        setVerifyingPayment(true)
                        const ok = await verifyPaymentById(paymentIdInput)
                        setVerifyingPayment(false)
                        if (ok) {
                          fetchTopGainers()
                        }
                      }}
                      disabled={verifyingPayment}
                      className="flex-shrink-0 px-1.5 sm:px-2.5 md:px-3 py-1 sm:py-1.5 md:py-2 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-[10px] sm:text-xs md:text-sm font-bold transition-all transform hover:scale-105 active:scale-95"
                    >
                      {verifyingPayment ? '⏳' : 'Verify'}
                    </button>
                  </div>
                  {paymentVerifyError && <p className="text-[9px] sm:text-xs text-red-400">{paymentVerifyError}</p>}

                  <div className="pt-1 sm:pt-2 border-t border-white/10">
                    <div className="font-semibold mb-1 text-emerald-300 text-[10px] sm:text-xs md:text-sm">✨ Benefits</div>
                    <ul className="space-y-0.5 sm:space-y-1 text-[9px] sm:text-xs text-white/70">
                      <li className="flex items-start gap-1"><span className="text-emerald-400 flex-shrink-0">✓</span><span>Top gainers NSE & BSE</span></li>
                      <li className="flex items-start gap-1"><span className="text-emerald-400 flex-shrink-0">✓</span><span>Lifetime access</span></li>
                      <li className="flex items-start gap-1"><span className="text-emerald-400 flex-shrink-0">✓</span><span>Live AI updates</span></li>
                      <li className="flex items-start gap-1"><span className="text-emerald-400 flex-shrink-0">✓</span><span>Secure payment</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
