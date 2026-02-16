"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { IndicesTicker } from "@/components/indices-ticker"
import { PredictionsList } from "@/components/predictions-list"
import PredictionsHero from "@/components/predictions-hero"
import { NewsSection } from "@/components/news-section"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sparkles, Lock } from "lucide-react"

export default function PredictionsPage() {
  const { user, isLoading, markPredictionsAsPaid, setUserFromData } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authReady, setAuthReady] = useState(false)
  const [verifiedPaymentStatus, setVerifiedPaymentStatus] = useState<boolean | null>(null)
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false)
  const [showNews, setShowNews] = useState(true)
  const shownPaymentModalRef = useRef(false)

  // Function to verify payment status (can be called manually or automatically)
  const verifyPaymentStatus = async () => {
    if (!user) return
    
    try {
      console.log('🔄 Verifying payment status...')
      const res = await fetch('/api/auth/me?t=' + Date.now(), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

      if (res.ok) {
        const data = await res.json()
        const paid = data?.user?.isPredictionPaid === true
        console.log('✅ Payment status verified:', paid)
        setVerifiedPaymentStatus(paid)
        
        if (paid) {
          if (!shownPaymentModalRef.current) {
            shownPaymentModalRef.current = true
            setShowPaymentSuccessModal(true)
          }
        }
      } else {
        console.error('⚠️ Verification failed with status:', res.status)
      }
    } catch (err) {
      console.error('❌ Payment verification error:', err)
    }
  }

  // CRITICAL: Block rendering until payment status is verified from server
  useEffect(() => {
    const verifyPaymentStatus = async () => {
      if (isLoading) return // Wait for auth context to load first

      if (!user) {
        setVerifiedPaymentStatus(null) // Not logged in
        setAuthReady(true)
        return
      }

      try {
        console.log('🔍 Verifying payment status from server...')
        // Use a longer timeout to allow for webhook processing
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)

        // Force fresh data - no cache
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
          // Check if user has paid for predictions
          const paid = data?.user?.isPredictionPaid === true
          console.log('✅ Payment verified from server:', paid, 'User:', data?.user?.email, 'Full user:', data?.user)
          setVerifiedPaymentStatus(paid)
          
          // CRITICAL: Update user in context so components see updated isPredictionPaid
          if (paid && data?.user && setUserFromData) {
            console.log('🔄 Updating user in auth context with payment status...')
            setUserFromData(data.user)
            console.log('✅ User context updated with isPredictionPaid:', data.user.isPredictionPaid)
          }

          // If user came from payment success, log it
          if (searchParams.get('from') === 'payment' || searchParams.get('success') === 'paid') {
            console.log('✅ User redirected from payment page, payment status:', paid)
            // If payment is verified and user came from payment flow, show the success modal (only once)
            if (paid && (searchParams.get('from') === 'payment' || searchParams.get('success') === 'paid')) {
              if (!shownPaymentModalRef.current) {
                shownPaymentModalRef.current = true
                setShowPaymentSuccessModal(true)
              }
            }
          }
        } else {
          console.error('⚠️ Auth check failed with status:', res.status)
          console.log('⚠️ Assuming unpaid user due to fetch error')
          setVerifiedPaymentStatus(false)
        }
      } catch (err) {
        console.error('❌ Payment verification error or timeout:', err)

        // Dev/local fallback: if running on localhost or local flag present, show predictions immediately
        try {
          const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
          const localFlag = typeof window !== 'undefined' ? window.localStorage.getItem('predictions_access') : null
          if (hostname === 'localhost' || hostname === '127.0.0.1' || searchParams.get('local') === 'true' || localFlag === 'true') {
            console.log('🛠️ Local dev fallback: granting prediction access on localhost')
            setVerifiedPaymentStatus(true)
            setAuthReady(true)
            return
          }
        } catch (e) {
          // ignore
        }

        setVerifiedPaymentStatus(false)
      } finally {
        setAuthReady(true)
      }
    }

    verifyPaymentStatus()

    // Listen for prediction selection events to hide/show NewsSection
    const handler = (e: any) => {
      try {
        const selected = e?.detail?.selected
        if (typeof selected === 'boolean') setShowNews(!selected)
      } catch (err) {}
    }
    window.addEventListener('predictionSelected', handler)
    return () => window.removeEventListener('predictionSelected', handler)
  }, [user, isLoading, searchParams])

  // Block rendering while checking payment
  if (isLoading || !authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Verifying payment status...</p>
          {searchParams.get('from') === 'payment' && (
            <p className="text-primary text-sm font-semibold">Processing your payment...</p>
          )}
        </div>
      </div>
    )
  }

  // Not logged in - show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="hidden md:block">
          <IndicesTicker />
        </div>

        <main className="container mx-auto px-4 py-12 text-center">
          <div className="max-w-xl mx-auto">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Stock Predictions</h1>
            <p className="text-muted-foreground mb-6">Please sign in to view AI-powered predictions.</p>
            <div className="flex justify-center gap-4">
              <Button asChild className="rounded-xl">
                <Link href="/login?callbackUrl=/predictions">Sign In</Link>
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

  // MAIN RENDERING LOGIC - PAYMENT GATE
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="hidden md:block">
        <IndicesTicker />
      </div>

      <main className="max-w-full md:max-w-7xl lg:max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-8">
        {/* ABSOLUTE GATE: Show stocks ONLY if verifiedPaymentStatus === true */}
        {verifiedPaymentStatus === true ? (
          // ✅ PAID USER - Show success modal first (if set) then predictions
          <>
            {showPaymentSuccessModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="w-full max-w-xl mx-4 bg-white dark:bg-card rounded-2xl p-8 shadow-2xl text-center">
                  <h2 className="text-2xl md:text-3xl font-extrabold mb-4">🎉 Welcome to Stock Predictions Module!</h2>
                  <p className="text-base text-muted-foreground mb-3">Your payment was successful.</p>
                  <p className="text-base font-semibold mb-4">Enjoy exclusive access to all stock predictions for lifetime. Thank you for choosing Stocks AI 🙏</p>
                  <p className="text-sm text-muted-foreground mb-6">📈 Happy Investing!</p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        try {
                          setShowPaymentSuccessModal(false)
                          // Remove query params so modal doesn't reappear on refresh
                          router.replace('/predictions')
                        } catch (e) {
                          setShowPaymentSuccessModal(false)
                        }
                      }}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-bold"
                    >
                      View Predictions
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Are you sure you want to cancel your payment access? You will need to pay again to access predictions.')) return
                        try {
                          const res = await fetch('/api/predictions/revert-payment', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({})
                          })
                          if (res.ok) {
                            setVerifiedPaymentStatus(false)
                            setShowPaymentSuccessModal(false)
                            router.replace('/predictions')
                          }
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
            
            <div className="flex items-center justify-between mb-4">
              <div />
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (!confirm('Are you sure you want to revert payment access for Predictions and Top Gainers?')) return
                    try {
                      const res = await fetch('/api/predictions/revert-payment', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                      })
                      const data = await res.json()
                      if (res.ok) {
                        // Update local state and auth context if available
                        setVerifiedPaymentStatus(false)
                        setShowPaymentSuccessModal(false)
                        if (data?.user && setUserFromData) setUserFromData(data.user)
                        router.replace('/predictions')
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

            <PredictionsHero />

            <div className="flex flex-col lg:flex-row gap-4 md:gap-8">
              <div className="flex-1">
                <PredictionsList key={`predictions-${verifiedPaymentStatus}`} />
              </div>
              {/* NewsSection removed as per user request */}
            </div>
          </>
        ) : (
          // 🔒 UNPAID USER - FULL PAGE PAYMENT SECTION
          <div className="min-h-screen flex items-center justify-center py-4">
            <div className="w-full max-w-md px-2">
              {/* Unlock Button at TOP */}
              <div className="mb-4 flex gap-2 justify-center animate-fade-in">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/predictions/create-payment', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                      })
                      const data = await response.json()
                      if (response.ok && data.paymentLink) {
                        const orderId = data.orderId || data.order_id || data.order || null
                        const paymentWindow = window.open(
                          data.paymentLink,
                          '_blank',
                          'width=500,height=700'
                        )
                        const checkPayment = setInterval(() => {
                          if (paymentWindow && paymentWindow.closed) {
                            clearInterval(checkPayment);
                            const redirectUrl = `/verify-payment${orderId ? `?order_id=${encodeURIComponent(orderId)}&product=predictions` : '?product=predictions'}`
                            window.location.href = redirectUrl
                          }
                        }, 500)
                      } else {
                        alert('Failed to initiate payment. ' + (data.error || ''))
                      }
                    } catch (error) {
                      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'))
                    }
                  }}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 premium-prediction-button unlock-animated text-[14px] px-6 py-2 rounded-md font-bold text-white shadow-lg"
                >
                  🔓 Unlock 200 - Access Predictions Now
                </button>
              </div>

              {/* Payment Header */}
              <div className="text-center mb-4 space-y-2 animate-fade-in-up">
                    <h1 className="text-[18px] font-extrabold">
                        🔮 Access Premium Stock Predictions
                      </h1>
                      <p className="text-[13px] text-muted-foreground max-w-2xl mx-auto">
                        Get access to high-quality stock predictions backed by strong fundamentals and real market strength — at a price that's almost unbelievable.
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
                      <span>No monthly fees</span>
                    </li>
                    <li className="flex items-center justify-center gap-3">
                      <span className="text-2xl">✓</span>
                      <span>No hidden charges</span>
                    </li>
                    <li className="flex items-center justify-center gap-3">
                      <span className="text-2xl">✓</span>
                      <span>Lifetime access forever</span>
                    </li>
                  </ul>
                </div>

                {/* Features Section */}
                <div className="border-t border-primary/30 pt-3 mb-4">
                  <h3 className="text-[15px] font-bold mb-2 text-center">🚀 What You Get</h3>
                  <div className="grid md:grid-cols-2 gap-2">
                    <div className="bg-background/50 rounded-lg p-2 space-y-1">
                      <p className="font-bold text-[12px]">✅ Strong Fundamental Stocks</p>
                      <p className="text-[10px] text-muted-foreground">Only fundamentally strong, high-quality companies with solid business strength.</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-2 space-y-1">
                      <p className="font-bold text-[12px]">✅ High-Potential Focus</p>
                      <p className="text-[10px] text-muted-foreground">Stocks with strong momentum and real profit potential. Weak stocks automatically removed.</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-2 space-y-1">
                      <p className="font-bold text-[12px]">✅ Live Market Updates</p>
                      <p className="text-[10px] text-muted-foreground">Predictions update dynamically according to current market conditions.</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-2 space-y-1">
                      <p className="font-bold text-[12px]">✅ 5-20% Stock Growth</p>
                      <p className="text-[10px] text-muted-foreground">Carefully curated stocks with real potential for 5-20% growth.</p>
                    </div>
                  </div>
                </div>

                {/* Stock Growth Highlight */}
                <div className="bg-gradient-to-r from-emerald-700/30 to-emerald-600/30 border-2 border-emerald-500/60 rounded-xl p-3 text-center mb-3">
                  <p className="text-2xl mb-1">📈</p>
                  <p className="text-[14px] font-bold text-emerald-400 mb-1">You Get 5% to 20% Stock Growth</p>
                  <p className="text-[11px] text-muted-foreground">Predictions focus on stocks with real potential based on fundamental strength and market momentum.</p>
                </div>

                {/* Coverage */}
                <div className="text-center">
                  <p className="font-semibold text-[12px] mb-1">✓ Covers Top NSE & BSE Stocks</p>
                  <p className="text-[10px] text-muted-foreground">Handpicked stocks from major sectors across NSE and BSE.</p>
                </div>
              </div>

              {/* Action Buttons - Bottom */}
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
        )}
      </main>
    </div>
  )
}
