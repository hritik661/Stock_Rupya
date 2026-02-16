"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"

const Globe3D = dynamic(() => import("@/components/globe-scene"), { ssr: false })

export function ThreeDGlobe() {
  return (
    <Suspense fallback={<div className="w-full h-48 bg-secondary/50 rounded-2xl animate-pulse" />}>
      <Globe3D />
    </Suspense>
  )
}
