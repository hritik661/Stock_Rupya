"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PredictionPaymentPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to predictions page since payments are disabled
    router.push('/predictions')
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
