"use client"

import React from "react"
import { AuthProvider } from "@/contexts/auth-context"
import { PredictionProvider } from "@/contexts/prediction-context"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PredictionProvider>
        {children}
      </PredictionProvider>
    </AuthProvider>
  )
}
