"use client"

import { Sparkles, TrendingUp, Brain, Zap, X, Check } from "lucide-react"
import React, { useState, useRef } from 'react';
import { useAuth } from "@/contexts/auth-context"
import { formatCurrency } from "@/lib/market-utils"


const handlePredictionClick = async (
  showModal: (value: boolean) => void,
  markPredictionsAsPaid?: () => void,
  setUserFromData?: (user: any) => void,
  currentUser?: any,
  setPaymentWindow?: (w: Window | null) => void
) => {
  // Directly initiate payment without showing modal first
  try {
    // Check session from backend with proper cache-busting
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
      return
    }

    // Proceed with payment directly
    const res = await fetch('/api/predictions/create-payment', { 
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({}) 
    });
    const data = await res.json();
    
    // Check if user already has access
    if (data.alreadyPaid) {
      alert('You already have access to predictions!');
      return;
    }
    if (data.paymentLink) {
      const orderId = data.orderId || data.order_id || data.order || null

      // If backend returned a Razorpay order + keyId, open the Razorpay
      // Checkout modal in-page (provides a visible close button on mobile).
      if (data.razorpayOrderId && data.keyId) {
        try {
          await new Promise<void>((resolve, reject) => {
            if ((window as any).Razorpay) return resolve()
            const s = document.createElement('script')
            s.src = 'https://checkout.razorpay.com/v1/checkout.js'
            s.onload = () => resolve()
            s.onerror = () => reject(new Error('Failed to load Razorpay script'))
            document.body.appendChild(s)
          })

          const options: any = {
            key: data.keyId,
            amount: data.amount || 20000,
            currency: 'INR',
            name: 'StockAI',
            description: 'Unlock Predictions',
            order_id: data.razorpayOrderId,
            handler: async (response: any) => {
              // On success, try server-side verify and refresh user
              try {
                if (orderId) {
                  await fetch(`/api/predictions/verify-payment?order_id=${encodeURIComponent(orderId)}&api=1`)
                }
              } catch (e) {}
              window.location.href = '/predictions?from=payment&success=true'
            },
            modal: {
              ondismiss: () => {
                // User closed the Checkout modal — navigate back to predictions
                window.location.href = '/predictions'
              }
            }
          }

          const rzp = new (window as any).Razorpay(options)
          rzp.open()
          // Show the local close icon so users can explicitly cancel if needed
          if (setPaymentWindow) setPaymentWindow({} as unknown as Window)
          return
        } catch (err) {
          console.warn('Razorpay Checkout open failed, falling back to link:', err)
        }
      }

      const paymentWindow = window.open(
        data.paymentLink,
        '_blank',
        'width=500,height=700'
      );

      // let caller know about the popup so it can show a close button
      // If popup was returned, pass it through. On many mobile browsers
      // window.open opens a new tab and returns `null` (no reference).
      // In that case we still want to show a local "Close" control so
      // the user can cancel the flow — use a small sentinel object to
      // indicate a popup is open but not controllable.
      if (setPaymentWindow) {
        if (paymentWindow) {
          setPaymentWindow(paymentWindow);
        } else {
          try {
            setPaymentWindow({} as unknown as Window);
          } catch (e) {
            setPaymentWindow(null);
          }
        }
      }

      const checkPayment = setInterval(async () => {
        if (paymentWindow && paymentWindow.closed) {
          clearInterval(checkPayment);
          if (setPaymentWindow) setPaymentWindow(null);
          // Try server-side verify by orderId first so webhook or DB is authoritative
          try {
            let verified = false
            if (orderId) {
              try {
                const v = await fetch(`/api/predictions/verify-payment?order_id=${encodeURIComponent(orderId)}&api=1`, { headers: { Accept: 'application/json' } })
                if (v.ok) {
                  const json = await v.json()
                  if (json?.verified) verified = true
                }
              } catch (err) {
                console.warn('[PREDICTION] verify-payment api failed', err)
              }
            }

            // Fallback to /api/auth/me if verify-payment didn't confirm
            if (!verified) {
              // Give webhook a short grace period then check auth/me
              await new Promise(resolve => setTimeout(resolve, 1200))
              const verifyRes = await fetch(`/api/auth/me?t=${Date.now()}`, { cache: 'no-store', credentials: 'include' })
              if (verifyRes.ok) {
                const userData = await verifyRes.json()
                if (userData?.user?.isPredictionPaid) verified = true
                if (userData?.user && setUserFromData) setUserFromData(userData.user)
              }
            }

            if (verified) {
              if (markPredictionsAsPaid) markPredictionsAsPaid()
              // Redirect to predictions so page gating shows full access
              window.location.href = '/predictions?from=payment&success=true'
              return
            }

            // Not verified yet
            alert('Payment verification pending. Please refresh the page in a moment.')
            window.location.href = '/predictions'
          } catch (e) {
            console.error('Payment verification failed:', e)
            alert('Payment verification failed. Redirecting to predictions...');
            window.location.href = '/predictions'
          }
        }
      }, 500);
    } else {
      alert(data.error || 'Failed to create payment.');
    }
  } catch (err) {
    alert('Error initiating payment. Please try again.');
  }
};

export default function PredictionsHero() {
  const [showSuccess, setShowSuccess] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const paymentWindowRef = useRef<Window | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const setPaymentWindow = (w: Window | null) => {
    paymentWindowRef.current = w
    try {
      setPopupOpen(Boolean(w && !w.closed))
    } catch (e) {
      setPopupOpen(Boolean(w))
    }
  }
  const { markPredictionsAsPaid, setUserFromData, user } = useAuth()

  // Auto-redirect after showing success message
  React.useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(async () => {
        try {
          if (markPredictionsAsPaid) await markPredictionsAsPaid()
          } catch (e) {
          // fallback: request /api/auth/me to refresh
          try { await fetch('/api/auth/me', { credentials: 'include' }) } catch (err) {}
        }
        // Refresh the page to show predictions
        window.location.href = '/predictions?from=payment'
      }, 3000) // Show success message for 3 seconds then redirect
      
      return () => clearTimeout(timer)
    }
  }, [showSuccess, markPredictionsAsPaid])
  return (
    <div className="relative bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-2xl border border-primary/20 p-4 sm:p-6 md:p-12 lg:p-16 overflow-hidden mb-8 animate-fade-in-up max-w-4xl ml-0 md:ml-8">
      {/* Smaller background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8 sm:-mr-24 sm:-mt-24 md:-mr-32 md:-mt-32 opacity-30" />
      <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-accent/10 rounded-full blur-2xl -ml-8 -mb-8 sm:-ml-24 sm:-mb-24 md:-ml-32 md:-mb-32 opacity-30" />

      <div className="relative z-10">
        {/* Floating close button for external payment popup */}
        {popupOpen && (
          <button
            aria-label="Close payment"
            title="Close payment"
            onClick={() => {
              try {
                if (paymentWindowRef.current && !paymentWindowRef.current.closed) paymentWindowRef.current.close()
              } catch (e) {}
              setPaymentWindow(null)
            }}
            className="fixed z-50 bg-white rounded-full shadow-lg border border-border p-3 md:p-2
              right-4 top-4 md:left-1/2 md:transform md:-translate-x-1/2 md:top-4"
          >
            <X className="h-6 w-6 md:h-5 md:w-5 text-red-600" />
          </button>
        )}
        {/* Smaller Header - Increased Logo Size */}
          <div className="flex items-center gap-3 sm:gap-5 mb-3 sm:mb-4">
          <div className="h-10 w-10 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center shrink-0">
            <Zap className="h-6 w-6 sm:h-8 sm:w-8 md:h-7 md:w-7 text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-[12px] font-extrabold text-foreground mb-1">AI-Powered Stock Predictions</h2>
            <p className="text-[10px] text-muted-foreground max-w-xs sm:max-w-xl">Advanced machine learning models analyzing real-time market data to predict stock movements with 85%+ accuracy</p>
          </div>
        </div>

        {/* Payment Button + Portfolio Link */}
        <div className="mb-3 sm:mb-4 flex gap-2 sm:gap-3 flex-wrap">
       
          <a href="/portfolio" className="inline-block">
            <button className="bg-secondary text-foreground px-2 py-1 sm:px-3 sm:py-2 rounded-md font-semibold border border-border text-[11px]">
              View Portfolio
            </button>
          </a>
        </div>

        {/* Confirmation Modal showing current balance before proceeding to payment */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-2">Proceed to Payment</h3>
              <p className="text-sm text-muted-foreground mb-4">Your current balance:</p>
              <p className="text-2xl font-extrabold text-foreground mb-4">{formatCurrency(Number(user?.balance || 0))}</p>
              <div className="flex gap-3">
                <button
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-md font-bold"
                  onClick={() => {
                    setShowConfirm(false)
                    // start payment flow
                    handlePredictionClick(setShowModal, markPredictionsAsPaid, setUserFromData, user, setPaymentWindow)
                  }}
                >
                  Proceed to Pay
                </button>
                <a href="/portfolio" className="flex-1">
                  <button className="w-full bg-secondary text-foreground px-4 py-2 rounded-md border border-border">View Portfolio</button>
                </a>
              </div>
              <button className="mt-4 text-xs text-muted-foreground underline" onClick={() => setShowConfirm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in">
            <div className="bg-card border-2 border-emerald-600/60 rounded-lg max-w-xs w-full shadow-xl animate-in zoom-in-95">
              <div className="p-3 sm:p-4 text-center space-y-2 sm:space-y-2.5">
                {/* Success Icon */}
                <div className="flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-700/20 border-2 border-emerald-600 flex items-center justify-center animate-bounce">
                    <Check className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>

                {/* Success Message */}
                <div className="space-y-1 animate-slide-in-up">
                  <h2 className="text-xl sm:text-2xl font-bold text-emerald-400">🎉 Success!</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Payment processed.</p>
                </div>

                {/* Success Details */}
                <div className="bg-emerald-700/15 border border-emerald-600/40 rounded-md p-2 sm:p-2.5 space-y-1 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
                  <p className="text-[10px] font-bold text-foreground">✅ Lifetime Access</p>
                  <p className="text-[10px] text-muted-foreground">Enjoy all predictions forever</p>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowSuccess(false)}
                  className="w-full px-3 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-white font-bold transition text-xs"
                >
                  View Predictions
                </button>

                {/* Loading indicator */}
                <div className="flex items-center justify-center gap-0.5 text-primary">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  <span className="text-[10px] text-muted-foreground ml-1">Redirecting...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row - No background on laptop, smaller on mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {[ 
            { icon: Brain, label: "AI Models", value: "50+" },
            { icon: TrendingUp, label: "Accuracy", value: "85%+" },
            { icon: Zap, label: "Updates", value: "Real-time" },
            { icon: Sparkles, label: "Coverage", value: "Nifty 50" },
          ].map((item, idx) => {
            const Icon = item.icon
            return (
              <div key={idx} className="md:bg-transparent sm:glass-morphism rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-4 md:p-4 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <Icon className="h-4 w-4 sm:h-6 sm:w-6 md:h-7 md:w-7 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-xs md:text-sm text-muted-foreground leading-tight">{item.label}</p>
                  <p className="font-bold text-xs sm:text-sm md:text-base text-gradient leading-tight">{item.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
