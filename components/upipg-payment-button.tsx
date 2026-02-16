"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Loader2, Smartphone } from "lucide-react"

interface UPIPGPaymentButtonProps {
  amount: number
  currency?: string
  description: string
  onSuccess?: (transactionId: string) => void
  onError?: (error: string) => void
  disabled?: boolean
  upi?: string
  qrUrl?: string
  userEmail?: string | null
  product?: string
}

export function UPIPGPaymentButton({
  amount,
  currency = "INR",
  description,
  onSuccess,
  onError,
  disabled = false,
  upi,
  qrUrl,
  userEmail,
  product,
}: UPIPGPaymentButtonProps) {
  const [loading, setLoading] = useState(false)
  const handlePayment = async () => {
    setLoading(true)
    try {
      const resp = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, upi, qrUrl, userEmail, product }),
      })

      if (!resp.ok) throw new Error("Failed to create payment order")
      const data = await resp.json()
      const paymentURL = data.upiDeepLink || data.gatewayUrl
      const orderId = data.orderId

      // Open the payment target (deep link or gateway page)
      let popup: Window | null = null
      try {
        popup = window.open(paymentURL, "UPIPG_Payment", "width=800,height=600")
      } catch (e) {
        // ignore
      }

      if (!popup) {
        try {
          popup = window.open(paymentURL, "_blank")
        } catch (e) {
          // ignore
        }
      }

      if (!popup) {
        // last resort: navigate current window
        window.location.href = paymentURL
        setLoading(false)
        return
      }

      const pollStatus = async (orderIdToCheck: string, timeoutMs = 30_000) => {
        const start = Date.now()
        while (Date.now() - start < timeoutMs) {
          try {
            const s = await fetch(`/api/payments/status?orderId=${encodeURIComponent(orderIdToCheck)}`)
            if (s.ok) {
              const sd = await s.json()
              if (sd.status === "paid") return true
            }
          } catch {
            // ignore
          }
          await new Promise((r) => setTimeout(r, 1000))
        }
        return false
      }

      const checkInterval = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(checkInterval)
            ;(async () => {
              const paid = await pollStatus(orderId)
              if (paid) {
                onSuccess?.(orderId)
              } else {
                onError?.("Payment not confirmed yet. If you completed payment, try again or contact support.")
              }
              setLoading(false)
            })()
          }
        } catch (err) {
          // swallow
        }
      }, 700)

      // safety: after 5 minutes stop checking and close popup
      setTimeout(() => {
        try {
          clearInterval(checkInterval)
          if (popup && !popup.closed) popup.close()
        } catch {}
        setLoading(false)
      }, 5 * 60 * 1000)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed"
      onError?.(message)
      setLoading(false)
    }
  }

  return (
    <Button onClick={handlePayment} disabled={disabled || loading} className="w-full gap-2" size="lg">
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <Smartphone className="h-4 w-4" />
            <span className="text-xs font-bold bg-blue-600 text-white px-1 py-0.5 rounded">UPI</span>
          </div>
          Pay ₹{amount} via UPI
        </>
      )}
    </Button>
  )
}
