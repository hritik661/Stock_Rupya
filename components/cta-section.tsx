"use client"

import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

export function CTASection() {
  const { user } = useAuth()

  return (
    <section className="relative py-16 md:py-24 lg:py-32 bg-background overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto text-center animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground mb-4 md:mb-6">
            Ready to Master the Markets?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 md:mb-12">
            Join thousands of traders using StockAI to make smarter trading decisions with advanced AI insights and professional tools.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
            <Button asChild size="lg" variant="outline" className="rounded-full text-base md:text-lg font-semibold h-12 md:h-14 px-8 md:px-10 bg-transparent">
              <Link href="/about">Learn More About Us</Link>
            </Button>
            {/* Only show Get Started Free if not logged in */}
            {!user && (
              <Button size="lg" className="rounded-full text-base md:text-lg font-semibold h-12 md:h-14 px-8 md:px-10" onClick={() => window.dispatchEvent(new Event('open-login'))}>
                <div className="flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </div>
              </Button>
            )}
          </div>

          {/* Trust badges */}
          <div className="mt-12 md:mt-16 pt-8 md:pt-12 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-4">Trusted by traders worldwide</p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {["Real-time Data", "AI Predictions", "Secure", "24/7 Support", "Mobile Ready"].map((badge) => (
                <div key={badge} className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 border border-primary/20 text-xs md:text-sm font-medium text-primary">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
