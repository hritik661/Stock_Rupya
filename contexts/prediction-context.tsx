"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useAuth } from "@/contexts/auth-context"

interface PredictionContextType {
  hasPaidAccess: boolean
  checkPaymentStatus: () => Promise<void>
}

const PredictionContext = createContext<PredictionContextType | undefined>(undefined)

export function PredictionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [hasPaidAccess, setHasPaidAccess] = useState(false)

  const checkPaymentStatus = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/predictions/check-access')
      const data = await response.json()
      setHasPaidAccess(data.hasAccess)
    } catch (error) {
      console.error('Failed to check payment status:', error)
    }
  }

  useEffect(() => {
    if (user) {
      checkPaymentStatus()
    }
  }, [user])

  return (
    <PredictionContext.Provider value={{
      hasPaidAccess,
      checkPaymentStatus
    }}>
      {children}
    </PredictionContext.Provider>
  )
}

export function usePrediction() {
  const context = useContext(PredictionContext)
  if (context === undefined) {
    throw new Error('usePrediction must be used within a PredictionProvider')
  }
  return context
}