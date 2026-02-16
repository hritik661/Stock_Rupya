"use client"

import { CheckCircle2 } from "lucide-react"

export function WhyChooseSection() {
  return (
    <section className="relative bg-background">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6">
      </div>
    </section>
  )
}
