"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Smartphone, CheckCircle } from "lucide-react"

function UPIPGCallbackContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { markPredictionsAsPaid, user } = useAuth()
  const [tx, setTx] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = params.get("tx") || params.get("transactionId") || null
    const orderId = params.get("orderId") || null
    setTx(t)

    const verify = async () => {
      // If we have orderId, call verify endpoint with txRef to ensure server marks order paid
      if (orderId) {
        try {
          const resp = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, txRef: t || undefined }),
          })
          if (resp.ok) {
            // Mark paid for logged-in user
            if (user) {
              markPredictionsAsPaid()
            }
            setDone(true)
          }
        } catch (e) {
          // ignore
        }
      } else {
        if (user) {
          markPredictionsAsPaid()
          setDone(true)
        }
      }
    }

    verify()
  }, [params, user, markPredictionsAsPaid])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Smartphone className="h-5 w-5" />
              <span className="text-sm font-bold bg-blue-600 text-white px-2 py-1 rounded">UPI</span>
            </div>
            <CardTitle>Payment {done ? "Successful" : "Processing"}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <p className="text-sm font-medium">Thank you — your payment was recorded.</p>
              </div>
              {tx && <p className="font-mono text-sm">Transaction: {tx}</p>}
              <div className="flex gap-2">
                <Button onClick={() => router.push("/")}>Go Home</Button>
                <Button variant="outline" onClick={() => router.push("/predictions")}>View Predictions</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Processing payment. If you're logged in the purchase will be recorded automatically.</p>
              <div className="flex gap-2">
                <Button onClick={() => router.push("/")}>Go Home</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function UPIPGCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-xl w-full">
          <CardHeader>
            <CardTitle>Processing Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading payment details...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <UPIPGCallbackContent />
    </Suspense>
  )
}
