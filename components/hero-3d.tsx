"use client"

import React from "react"

export default function Hero3D({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 z-0 pointer-events-none" />

      <div className="relative z-10">{children}</div>
    </div>
  )
}
