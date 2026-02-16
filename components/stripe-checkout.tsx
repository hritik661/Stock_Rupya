"use client"

import { useState, useEffect } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { startCheckoutSession, getCheckoutSessionStatus } from "@/app/actions/stripe"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface StripeCheckoutProps {
  productId: string
  onSuccess: () => void
  onCancel: () => void
}

export function StripeCheckout({ productId, onSuccess, onCancel }: StripeCheckoutProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)

  useEffect(() => {
    const initCheckout = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await startCheckoutSession(productId)
        if (result.clientSecret) {
          setClientSecret(result.clientSecret)
          setSessionId(result.sessionId)
        } else {
          setError("Failed to initialize payment. Please try again.")
        }
      } catch (err) {
        console.error("Error starting checkout:", err)
        setError("Failed to initialize payment. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    initCheckout()
  }, [productId])

  // Poll for payment status
  useEffect(() => {
    if (!sessionId) return

    const interval = setInterval(async () => {
      try {
        const { status, paymentStatus } = await getCheckoutSessionStatus(sessionId)
        console.log("[v0] Payment status:", status, paymentStatus)
        if (paymentStatus === "paid" || status === "complete") {
          clearInterval(interval)
          setPaymentComplete(true)
          setTimeout(() => {
            onSuccess()
          }, 2000)
        }
      } catch (error) {
        console.error("Error checking session status:", error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [sessionId, onSuccess])

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    setClientSecret(null)
    setSessionId(null)

    startCheckoutSession(productId)
      .then((result) => {
        if (result.clientSecret) {
          setClientSecret(result.clientSecret)
          setSessionId(result.sessionId)
        } else {
          setError("Failed to initialize payment. Please try again.")
        }
      })
      .catch((err) => {
        console.error("Error retrying checkout:", err)
        setError("Failed to initialize payment. Please try again.")
      })
      .finally(() => {
        setLoading(false)
      })
  }

  if (paymentComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-primary mb-2">Payment Successful!</h3>
        <p className="text-muted-foreground">
          Your ₹100 payment has been received. You can now continue using the prediction service.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-xl font-bold text-destructive mb-2">Payment Error</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    )
  }

  if (loading || !clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground">Initializing secure payment...</p>
      </div>
    )
  }

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
