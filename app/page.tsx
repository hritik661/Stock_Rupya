"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Header } from "@/components/header"
import { MarketStatus } from "@/components/market-status"
import { IndicesTicker } from "@/components/indices-ticker"
import { useAuth } from "@/contexts/auth-context"
import { useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import AboutPage from "@/app/about/page"

// Ultra-fast loading: Suspense boundaries with minimal loading states
const StockList = dynamic(() => import("@/components/stock-list").then(mod => ({ default: mod.StockList })), {
  loading: () => <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-2.5 p-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-16 md:h-18 bg-secondary/50 rounded-xl animate-pulse" />
    ))}
  </div>,
  ssr: true
})

const NewsSection = dynamic(() => import("@/components/news-section").then(mod => ({ default: mod.NewsSection })), {
  loading: () => null, // No visible loading for news (non-critical)
  ssr: false // Load in background
})

const GainersLosers = dynamic(() => import("@/components/gainers-losers").then(mod => ({ default: mod.GainersLosers })), {
  loading: () => <div className="h-24 bg-secondary/50 rounded-xl animate-pulse" />
})

const FiftyTwoWeekView = dynamic(() => import("@/components/52-week-view").then(mod => ({ default: mod.FiftyTwoWeekView })), {
  loading: () => <div className="h-24 bg-secondary/50 rounded-xl animate-pulse" />
})

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Preload common stocks for instant access
    if (user) {
      import("@/lib/cache-utils").then(({ preloadCommonStocks }) => {
        preloadCommonStocks()
      })
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <AboutPage />
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <IndicesTicker />

      <main className="container mx-auto px-3 py-3 md:px-3 md:py-4">
        {/* Large logo + welcome banner removed for logged-in users */}

        <div className="flex flex-col lg:flex-row gap-3 md:gap-4">
          {/* Main Content */}
          <div className="flex-1 space-y-3 md:space-y-4">
            {/* Header Section with animated gradient */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-1 md:gap-2 animate-slide-in-up">
              <div className="space-y-0 md:space-y-1.5">
                <h1 className="text-xs md:text-xl lg:text-3xl font-black tracking-tighter text-gradient">
                  Market Dashboard
                </h1>
              
              </div>
              <div className="flex items-center gap-1 md:gap-2 glass-morphism px-2 md:px-4 py-1 md:py-2.5 rounded-lg md:rounded-xl animate-scale-bounce text-xs md:text-sm">
                <MarketStatus />
              </div>
            </div>

            {/* Stock List Card with premium styling */}
            <div
              className="rounded-2xl md:rounded-3xl border border-primary/20 bg-gradient-to-br from-card/60 to-card/20 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 px-4 md:px-5 py-4 md:py-4 border-b border-border/10">
              </div>
              <StockList />
            </div>

            {/* Gainers & Losers */}
            <div
              style={{ animationDelay: "0.3s" }}
            >
              <GainersLosers />
            </div>

            {/* 52-Week Highs */}
            <div
              style={{ animationDelay: "0.4s" }}
            >
              <FiftyTwoWeekView type="near-high" title="52-Week" description="Stocks near their 52-week highs" limit={20} />
            </div>
          </div>

          {/* Sidebar with News */}
          <div className="w-full lg:w-80 space-y-3 md:space-y-4">
            <div style={{ animationDelay: "0.6s" }}>
              <div className="rounded-2xl md:rounded-3xl border border-border/20 bg-gradient-to-br from-card/60 to-card/20 overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-accent/5 to-primary/5 px-4 md:px-5 py-4 md:py-4 border-b border-border/10">
                  <h2 className="text-lg md:text-lg font-bold text-foreground">Market News</h2>
                </div>
                <div className="p-4 md:p-5">
                  <NewsSection limit={4} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
