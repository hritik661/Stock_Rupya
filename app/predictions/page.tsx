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
  const { user, isLoading, setUserFromData } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [authReady, setAuthReady] = useState(false)
  const [verifiedPaymentStatus, setVerifiedPaymentStatus] = useState<boolean | null>(null)
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false)
  const handledPaymentRedirectRef = useRef(false)
  const shownPaymentModalRef = useRef(false)
  // Payment-related client state
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null)
  const [showPaymentIframe, setShowPaymentIframe] = useState(false)
  const [paymentIdInput, setPaymentIdInput] = useState('')
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [paymentVerifyError, setPaymentVerifyError] = useState<string | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Function to start payment flow (create payment and open link/checkout)
  const startPayment = async () => {
    setIsProcessingPayment(true)
    try {
      const res = await fetch('/api/predictions/create-payment', {
        method: 'POST',
        credentials: 'include'
      })
      const data = await res.json().catch(() => ({}))
      const paymentLink = data?.paymentLink || data?.payment_link || data?.payment_link_url
      const orderId = data?.orderId || data?.order_id || data?.paymentLinkId || data?.id

      if (paymentLink) {
        setPaymentUrl(paymentLink)
        setPaymentOrderId(orderId || null)
        setShowPaymentIframe(true)

        // Start polling for server-side verification (useful for payment links/webhook flow)
        if (orderId) {
          (async function pollOrder() {
            const maxAttempts = 20
            let attempts = 0
            while (attempts < maxAttempts) {
              try {
                const q = new URLSearchParams()
                q.set('order_id', orderId)
                q.set('api', '1')
                const r = await fetch(`/api/predictions/verify-payment?${q.toString()}`, { cache: 'no-store' })
                if (r.ok) {
                  const j = await r.json().catch(() => ({}))
                  if (j?.verified) {
                    try {
                      const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
                      if (me.ok) {
                        const meData = await me.json()
                        if (meData?.user && setUserFromData) setUserFromData(meData.user)
                        if (meData?.user?.isPredictionPaid) setVerifiedPaymentStatus(true)
                      }
                    } catch (e) { console.warn('Failed to refresh auth after verify poll', e) }
                    setShowPaymentIframe(false)
                    setPaymentUrl(null)
                    setPaymentOrderId(null)
                    return
                  }
                }
              } catch (e) { /* ignore and retry */ }
              attempts++
              await new Promise((res) => setTimeout(res, 3000))
            }
          })()
        }

        return
      }

      // Fallback: if server returned razorpay order details and client can open checkout
      if (data?.razorpayOrderId && (window as any).Razorpay) {
        const options = {
          key: data?.keyId || data?.razorpayKey,
          order_id: data.razorpayOrderId,
          handler: async (resp: any) => {
            try {
              const pid = resp?.razorpay_payment_id || resp?.payment_id || ''
              if (pid) {
                setPaymentIdInput(pid)
                const ok = await verifyPaymentById(pid)
                if (ok) {
                  setShowPaymentSuccessModal(true)
                }
              } else {
                setPaymentVerifyError('Payment completed but no payment id returned by Razorpay.')
              }
            } catch (e) {
              console.warn('Error in Razorpay handler', e)
            }
          }
        }
        const rzp = new (window as any).Razorpay(options)
        rzp.open()
        return
      }

      // Last resort: open returned url or show error
      if (data?.url) {
        window.open(data.url, '_blank')
        return
      }

      alert('Unable to start payment. Please try again.')
    } catch (err) {
      console.error('Start payment error', err)
      alert('Failed to start payment. Try again.')
    } finally {
      setIsProcessingPayment(false)
    }
  }
  const handleManualVerify = async () => {
    setPaymentVerifyError(null)
    if (!paymentIdInput && !paymentOrderId) { setPaymentVerifyError('Please enter the payment id or use the shown Order id'); return }
    setVerifyingPayment(true)

    try {
      // If user provided a payment id, prefer POST verification by payment id (stronger check)
      if (paymentIdInput) {
        const body: any = { payment_id: paymentIdInput }
        const res = await fetch('/api/predictions/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body)
        })
        const txt = await res.text().catch(() => '')
          console.log('[PREDICTIONS][VERIFY POST] raw response text:', txt)
          let j: any = {}
          try { j = txt ? JSON.parse(txt) : {} } catch (e) { j = { raw: txt } }

          console.log('[PREDICTIONS][VERIFY POST] parsed JSON response', res.status, j)
        if (res.ok && j?.verified) {
          try {
            const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
            if (me.ok) {
              const meData = await me.json()
              if (meData?.user && setUserFromData) setUserFromData(meData.user)
              if (meData?.user?.isPredictionPaid) setVerifiedPaymentStatus(true)
            }
          } catch (e) { console.warn('Failed to refresh auth after manual POST verify:', e) }
          setShowPaymentIframe(false)
          setPaymentUrl(null)
          setPaymentIdInput('')
          setVerifyingPayment(false)
          return
        }

        if (res.ok && (!txt || Object.keys(j).length === 0)) {
          try {
            const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
            if (me.ok) {
              const meData = await me.json()
              if (meData?.user?.isPredictionPaid) {
                if (meData?.user && setUserFromData) setUserFromData(meData.user)
                setVerifiedPaymentStatus(true)
                setShowPaymentIframe(false)
                setPaymentUrl(null)
                setPaymentIdInput('')
                setVerifyingPayment(false)
                return
              }
            }
          } catch (e) { console.warn('Auth refresh failed after ambiguous manual POST verify', e) }
        }

        // show full debug object to help troubleshooting
        const display = j?.error ? `${j.error}${j?.reason ? ' (' + j.reason + ')' : ''}` : `Verification failed (status ${res.status}).`
        setPaymentVerifyError(`${display} ${JSON.stringify(j)}`)
        setVerifyingPayment(false)
        return
      }

      // If we have orderId and no payment id provided, use GET
      if (paymentOrderId) {
        const q = new URLSearchParams()
        q.set('order_id', paymentOrderId)
        q.set('api', '1')
        const res = await fetch(`/api/predictions/verify-payment?${q.toString()}`, { cache: 'no-store' })
        const txt = await res.text().catch(() => '')
        let j: any = {}
        try { j = txt ? JSON.parse(txt) : {} } catch (e) { j = {} }
        console.log('[PREDICTIONS][VERIFY GET] response', res.status, j)
        if (res.ok && j?.verified) {
          try {
            const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
            if (me.ok) {
              const meData = await me.json()
              if (meData?.user && setUserFromData) setUserFromData(meData.user)
              if (meData?.user?.isPredictionPaid) setVerifiedPaymentStatus(true)
            }
          } catch (e) { console.warn('Failed to refresh auth after verify GET', e) }
          setShowPaymentIframe(false)
          setPaymentUrl(null)
          setPaymentIdInput('')
          setVerifyingPayment(false)
          return
        }

        if (res.ok && (!txt || Object.keys(j).length === 0)) {
          try {
            const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
            if (me.ok) {
              const meData = await me.json()
              if (meData?.user?.isPredictionPaid) {
                if (meData?.user && setUserFromData) setUserFromData(meData.user)
                setVerifiedPaymentStatus(true)
                setShowPaymentIframe(false)
                setPaymentUrl(null)
                setPaymentIdInput('')
                setVerifyingPayment(false)
                return
              }
            }
          } catch (e) { console.warn('Auth refresh failed after ambiguous verify GET', e) }
        }

        // Provide richer error messaging for debugging
        const debugInfo = j?.razorpay ? ` Razorpay: ${JSON.stringify(j.razorpay)}` : ''
        setPaymentVerifyError(j?.error ? `${j.error}.${debugInfo}` : `Verification failed (status ${res.status}). Please check order id and try again.${debugInfo}`)
        setVerifyingPayment(false)
        return
      }

      // Fallback: POST with payment_id
      if (!paymentIdInput) { setPaymentVerifyError('Please enter the payment id'); setVerifyingPayment(false); return }
      const body: any = { payment_id: paymentIdInput }
      const res = await fetch('/api/predictions/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const txt = await res.text().catch(() => '')
      let j: any = {}
      try { j = txt ? JSON.parse(txt) : {} } catch (e) { j = {} }

      console.log('[PREDICTIONS][VERIFY POST] response', res.status, j)
      if (res.ok && j?.verified) {
        try {
          const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
          if (me.ok) {
            const meData = await me.json()
            if (meData?.user && setUserFromData) setUserFromData(meData.user)
            if (meData?.user?.isPredictionPaid) setVerifiedPaymentStatus(true)
          }
        } catch (e) { console.warn('Failed to refresh auth after manual POST verify:', e) }
        setShowPaymentIframe(false)
        setPaymentUrl(null)
        setPaymentIdInput('')
        setVerifyingPayment(false)
        return
      }

      if (res.ok && (!txt || Object.keys(j).length === 0)) {
        try {
          const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
          if (me.ok) {
            const meData = await me.json()
            if (meData?.user?.isPredictionPaid) {
              if (meData?.user && setUserFromData) setUserFromData(meData.user)
              setVerifiedPaymentStatus(true)
              setShowPaymentIframe(false)
              setPaymentUrl(null)
              setPaymentIdInput('')
              setVerifyingPayment(false)
              return
            }
          }
        } catch (e) { console.warn('Auth refresh failed after ambiguous manual POST verify', e) }
      }

      const debugInfo = j?.razorpay ? ` Razorpay: ${JSON.stringify(j.razorpay)}` : ''
      setPaymentVerifyError(j?.error ? `${j.error}.${debugInfo}` : `Verification failed (status ${res.status}). Please check payment id and try again.${debugInfo}`)
    } catch (err) {
      setPaymentVerifyError(err instanceof Error ? err.message : 'Verification error')
    } finally {
      setVerifyingPayment(false)
    }
  }

  // Verify a payment by its Razorpay payment id (used by Checkout handler)
  const verifyPaymentById = async (paymentId: string) => {
    if (!paymentId) return
    setPaymentVerifyError(null)
    setVerifyingPayment(true)
    try {
      const res = await fetch('/api/predictions/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ payment_id: paymentId })
      })
      const txt = await res.text().catch(() => '')
      console.log('[PREDICTIONS][VERIFY BY ID] raw response text:', txt)
      let j: any = {}
      try { j = txt ? JSON.parse(txt) : {} } catch (e) { j = { raw: txt } }

      console.log('[PREDICTIONS][VERIFY BY ID] parsed JSON response', res.status, j)
      if (res.ok && j?.verified) {
        try {
          const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
          if (me.ok) {
            const meData = await me.json()
            if (meData?.user && setUserFromData) setUserFromData(meData.user)
            if (meData?.user?.isPredictionPaid) setVerifiedPaymentStatus(true)
          }
        } catch (e) { console.warn('Failed to refresh auth after Checkout verify:', e) }
        setShowPaymentIframe(false)
        setPaymentUrl(null)
        setPaymentOrderId(null)
        setPaymentIdInput('')
        return true
      }

      if (res.ok && (!txt || Object.keys(j).length === 0)) {
        try {
          const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
          if (me.ok) {
            const meData = await me.json()
            if (meData?.user?.isPredictionPaid) {
              if (meData?.user && setUserFromData) setUserFromData(meData.user)
              setVerifiedPaymentStatus(true)
              setShowPaymentIframe(false)
              setPaymentUrl(null)
              setPaymentOrderId(null)
              setPaymentIdInput('')
              return true
            }
          }
        } catch (e) { console.warn('Auth refresh failed after ambiguous Checkout verify', e) }
      }

      const display = j?.error ? `${j.error}${j?.reason ? ' (' + j.reason + ')' : ''}` : `Verification failed (status ${res.status}).`
      setPaymentVerifyError(`${display} ${JSON.stringify(j)}`)
      console.warn('[PREDICTIONS][VERIFY BY ID] failure debug:', j)
      return false
    } catch (err) {
      setPaymentVerifyError(err instanceof Error ? err.message : 'Verification error')
      return false
    } finally {
      setVerifyingPayment(false)
    }
  }

    // Verify payment on mount (sets authReady and checks server for paid flag)
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
          if (user && (user as any).isPredictionPaid) {
            console.log('🔍 Auth context indicates prediction access - skipping server verify')
            setVerifiedPaymentStatus(true)
            if (!shownPaymentModalRef.current && (searchParams.get('from') === 'payment' || searchParams.get('success') === 'paid')) {
              shownPaymentModalRef.current = true
              setShowPaymentSuccessModal(true)
            }
            setAuthReady(true)
            return
          }

          const fromPayment = searchParams.get('from') === 'payment' || searchParams.get('success') === 'paid'
          const orderId = searchParams.get('order_id')
          if (fromPayment && !handledPaymentRedirectRef.current) {
            handledPaymentRedirectRef.current = true
            console.log('🔍 Handling payment redirect - calling verify endpoint for predictions')
            try {
              const verifyRes = await fetch(`/api/predictions/verify-payment?order_id=${encodeURIComponent(orderId || '')}&api=1`, { cache: 'no-store' })
              if (verifyRes.ok) {
                const v = await verifyRes.json()
                if (v?.verified) {
                  try {
                    const me = await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
                    if (me.ok) {
                      const meData = await me.json()
                      if (meData?.user?.isPredictionPaid) {
                        setVerifiedPaymentStatus(true)
                        if (!shownPaymentModalRef.current) {
                          shownPaymentModalRef.current = true
                          setShowPaymentSuccessModal(true)
                        }
                        setAuthReady(true)
                        return
                      }
                    }
                  } catch (e) { console.warn('Failed to refresh auth after verify:', e) }
                }
              }
            } catch (e) { console.warn('Error calling verify endpoint during redirect handling:', e) }
          }

          console.log('🔍 Verifying prediction payment status from server...')
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
            const paid = data?.user?.isPredictionPaid === true
            console.log('✅ Prediction payment verified from server:', paid)
            setVerifiedPaymentStatus(paid)
          } else {
            console.error('⚠️ Auth check failed')
            setVerifiedPaymentStatus(false)
          }
        } catch (err) {
          console.error('❌ Prediction payment verification error:', err)
          setVerifiedPaymentStatus(false)
        } finally {
          setAuthReady(true)
        }
      }

      verifyPaymentStatus()
    }, [user, isLoading, searchParams])

  // Render loading state while verifying
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="hidden md:block">
        <IndicesTicker />
      </div>

      <main className="max-w-full md:max-w-7xl lg:max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-8">
        {verifiedPaymentStatus === true ? (
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
            </div>
          </>
        ) : (
          <div className="min-h-screen flex items-center justify-center py-4">
            <div className="w-full max-w-md px-2">
              <div className="mb-6 flex gap-2 justify-center">
                <button
                  onClick={() => startPayment()}
                  disabled={isProcessingPayment}
                  className="relative w-full max-w-xl flex items-center justify-center px-6 py-3 rounded-2xl font-extrabold text-white shadow-2xl overflow-hidden transform transition-all duration-300 hover:scale-105"
                >
                  <span className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-600 to-indigo-600 opacity-80 blur-lg animate-pulse-slow"></span>
                  <span className="relative z-10 flex items-center gap-3">
                   
                    <span>{isProcessingPayment ? 'Processing...' : '🔓 Unlock ₹200 - Access Predictions Now'}</span>
                  </span>
                </button>
              </div>

              <div className="text-center mb-4 space-y-2 animate-fade-in-up">
                <h1 className="text-[18px] font-extrabold">🔮 Access Premium Stock Predictions</h1>
                <p className="text-[13px] text-muted-foreground max-w-2xl mx-auto">Get access to high-quality stock predictions backed by strong fundamentals and real market strength — at a price that's almost unbelievable.</p>
              </div>

              <div className="bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/40 rounded-2xl p-4 md:p-6 mb-4 animate-bounce-slow">
                <div className="text-center mb-3">
                  <p className="text-[11px] text-muted-foreground mb-2 font-medium tracking-widest uppercase">🎯 SPECIAL LIFETIME OFFER</p>
                  <h2 className="text-[22px] font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Just ₹200</h2>
                  <ul className="space-y-2 text-[12px] text-foreground font-semibold max-w-md mx-auto">
                    <li className="flex items-center gap-3"><span className="text-2xl">✓</span><span>Pay only once</span></li>
                    <li className="flex items-center gap-3"><span className="text-2xl">✓</span><span>No monthly fees</span></li>
                    <li className="flex items-center gap-3"><span className="text-2xl">✓</span><span>No hidden charges</span></li>
                    <li className="flex items-center gap-3"><span className="text-2xl">✓</span><span>Lifetime access forever</span></li>
                    <li className="flex items-center gap-3"><span className="text-2xl">✓</span><span>AI-curated prediction picks</span></li>
                    <li className="flex items-center gap-3"><span className="text-2xl">✓</span><span>Live market updates & alerts</span></li>
                    <li className="flex items-center gap-3"><span className="text-2xl">✓</span><span>Risk-aware suggestions</span></li>
                    <li className="flex items-center gap-3"><span className="text-2xl">✓</span><span>Regular model & data updates</span></li>
                    <li className="flex items-center gap-3"><span className="text-2xl">✓</span><span>Email support & onboarding</span></li>
                    <li className="flex items-center gap-3"><span className="text-2xl">✓</span><span>Secure Razorpay payments</span></li>
                  </ul>
                </div>
              </div>

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

      {/* In-page payment iframe + manual payment-id verification */}
      {showPaymentIframe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
          <div className="relative w-full max-w-4xl sm:rounded-xl sm:shadow-2xl h-screen sm:h-[96vh] md:h-[96vh] bg-gradient-to-br from-gray-900/90 to-black/90 sm:overflow-hidden overflow-auto flex flex-col ring-1 ring-white/5">
            {/* Mobile close button (fixed inside modal) */}
            <button
              onClick={() => setShowPaymentIframe(false)}
              aria-label="Close payment"
              className="sm:hidden absolute top-3 right-3 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shadow-md"
            >
              ✕
            </button>

            <div className="flex items-center justify-between p-3 md:p-4 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="text-lg font-bold text-white">Complete Payment</div>
                <div className="hidden md:inline-block px-3 py-1 text-xs rounded bg-white/5 text-white/90">Secure</div>
              </div>
              <div>
                <button
                  onClick={() => setShowPaymentIframe(false)}
                  className="hidden sm:inline-block px-3 py-1 rounded bg-white/6 hover:bg-white/10 text-sm text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 bg-black">
              <div className="col-span-1 md:col-span-8 border-b md:border-b-0 md:border-r border-white/5 min-h-0">
                <iframe
                  src={paymentUrl || ''}
                  title="Payment"
                  className="w-full border-0 bg-white"
                  allowFullScreen
                  loading="lazy"
                  style={{ height: 'calc(100vh - 56px)' }}
                />
              </div>
              <div className="col-span-1 md:col-span-4 p-6 space-y-4 bg-gradient-to-t from-black/60 to-transparent">
                <div className="text-sm text-white/80 animate-fade-in-up">After completing payment, copy the Razorpay payment id (for example <span className="font-mono">pay_...</span>) from the success screen and paste it below to verify and unlock Predictions.</div>

                <div className="flex items-center gap-2 min-w-0 animate-pulse-soft">
                  <input
                    value={paymentIdInput}
                    onChange={(e) => { setPaymentIdInput(e.target.value); setPaymentVerifyError(null) }}
                    placeholder="Payment id (e.g., pay_XXX)"
                    className="flex-1 min-w-0 px-3 py-2 bg-white/5 hover:bg-white/10 placeholder-white/60 rounded-md text-white outline-none transition-colors focus:bg-white/15 focus:ring-2 focus:ring-emerald-400"
                  />
                  <button
                    onClick={handleManualVerify}
                    disabled={verifyingPayment}
                    className="flex-shrink-0 px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    {verifyingPayment ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
                {paymentVerifyError && <p className="text-sm text-red-500 animate-shake">{paymentVerifyError}</p>}

                <div className="pt-4 border-t border-white/5 text-sm text-white/70 animate-fade-in">
                  <div className="font-semibold mb-2 text-emerald-300">Why this unlock is awesome</div>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3 hover:translate-x-1 transition-transform"><span className="text-emerald-400 mt-1">✓</span><span>AI-curated predictions with strong fundamentals.</span></li>
                    <li className="flex items-start gap-3 hover:translate-x-1 transition-transform"><span className="text-emerald-400 mt-1">✓</span><span>Lifetime access — pay once, use forever.</span></li>
                    <li className="flex items-start gap-3 hover:translate-x-1 transition-transform"><span className="text-emerald-400 mt-1">✓</span><span>Regular updates and actionable insights.</span></li>
                    <li className="flex items-start gap-3 hover:translate-x-1 transition-transform"><span className="text-emerald-400 mt-1">✓</span><span>Secure Razorpay payment integration.</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
