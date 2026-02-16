"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useAuth } from '@/contexts/auth-context'

export default function VerifyPaymentPage() {
  const router = useRouter()
  const search = useSearchParams()
  const { setUserFromData } = useAuth()
  const orderId = search.get('order_id') || ''
  const product = search.get('product') || 'predictions'
  const [paymentId, setPaymentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: any) => {
    e.preventDefault()
    setError(null)
    if (!paymentId) return setError('Please enter the Payment ID you received from Razorpay.')
    setLoading(true)
    try {
      const res = await fetch('/api/payments/verify-by-id', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId.trim(), order_id: orderId || undefined, product })
      })
      const data = await res.json()
      if (res.ok && data?.verified) {
        // If server returned updated user, update auth context so pages show paid content immediately
        if (data.user && setUserFromData) {
          try { setUserFromData(data.user) } catch (e) { /* ignore */ }
        } else {
          // Try to refresh auth/me to get updated user
          try {
            await fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store', credentials: 'include' })
          } catch (e) {}
        }
        // Redirect to product page on success
        const target = product === 'top_gainers' ? '/top-gainers' : '/predictions'
        router.push(`${target}?from=payment&success=paid`)
        return
      }
      // If payment not verified specifically, show friendly message requested
      if (data?.error && data.error.toString().toLowerCase().includes('payment not verified')) {
        setError('you are put wrong payment id pls enter correct payment id')
      } else {
        setError(data?.error || 'Payment verification failed. Please double-check the Payment ID and try again.')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error during verification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-card rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Verify Payment ID</h1>
        <p className="text-sm text-muted-foreground mb-4">Enter the Razorpay Payment ID you received after completing the payment.</p>

        {orderId && (
          <div className="mb-4 text-xs text-muted-foreground">Order ID: <span className="font-mono">{orderId}</span></div>
        )}

        <form onSubmit={onSubmit}>
          <label className="block mb-2 text-sm font-medium">Payment ID</label>
          <input
            value={paymentId}
            onChange={e => setPaymentId(e.target.value)}
            placeholder="e.g. pay_ABC123xyz"
            className="w-full p-3 rounded-md border border-border mb-4"
          />

          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

          <div className="flex gap-3">
            <button disabled={loading} className="flex-1 px-4 py-2 rounded-md bg-primary text-white font-bold">
              {loading ? 'Verifying…' : 'Verify Payment ID'}
            </button>
            <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md border">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
