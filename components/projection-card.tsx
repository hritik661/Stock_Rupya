"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ProjectionCard() {
  const [projected, setProjected] = useState<number | null>(null)

  useEffect(() => {
    // Simple projection: assume ₹10,00,000 invested across top predictions
    // and an expected average return of 12% (placeholder until server calc).
    const base = 1000000
    const expectedReturn = 0.12
    setProjected(Math.round(base * (1 + expectedReturn)))
  }, [])

  return (
    <Card className="p-6 rounded-[1.5rem] border-2 border-green-500/40 hover:border-green-500/70 hover:shadow-lg bg-card/50 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-black">Projection</h3>
          <p className="text-sm text-muted-foreground mt-1">If you invest ₹10,00,000 across top AI predictions</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Projected value</div>
          <div className="text-xl font-mono font-bold">{projected ? `₹${projected.toLocaleString("en-IN")}` : "—"}</div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="outline" onClick={() => alert('Simulate investments from Dashboard')}>Simulate</Button>
      </div>
    </Card>
  )
}
