"use client"

import { Card, CardContent } from "@/components/ui/card"
import { LineChart, BarChart3, TrendingUp, Sparkles, Lock, Zap } from "lucide-react"

export function StockAboutSection() {
  const highlights = [
    {
      icon: LineChart,
      title: "Professional Line Charts",
      desc: "Beautiful, interactive line charts with smooth animations showing stock price trends over multiple timeframes",
    },
    {
      icon: BarChart3,
      title: "Advanced Candlestick Charts",
      desc: "Professional candlestick charts with real-time updates, technical indicators, and pattern recognition",
    },
    {
      icon: Sparkles,
      title: "AI-Powered Insights",
      desc: "Machine learning models providing 85%+ accurate predictions for 50+ Nifty stocks with confidence scores",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Data",
      desc: "Live NSE/BSE quotes updated every second with accurate bid-ask spreads and volume data",
    },
    {
      icon: Lock,
      title: "Secure Trading",
      desc: "Bank-grade encryption, OAuth authentication, and protected virtual trading environment",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      desc: "Sub-second data refresh, instant order execution, and responsive mobile-first design",
    },
  ]

  return (
    <section className="relative py-12 md:py-20 lg:py-28 bg-background overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        {/* Logo Section */}
        <div className="flex justify-center mb-12 md:mb-16 animate-fade-in-up">
          <img src="/rupya.png" alt="StockRupya" className="h-32 md:h-40 w-auto" />
        </div>
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-20 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground mb-4 md:mb-6">
            Our Mission
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            A comprehensive stock trading platform built for Indian traders with professional-grade tools, real-time data, and AI-powered insights
          </p>
        </div>

        {/* Highlights Grid */}
        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mb-12 md:mb-16\">
          {highlights.map((item, idx) => {
            const Icon = item.icon
            return (
              <Card
                key={idx}
                className="border-2 border-border/50 bg-gradient-to-br from-card/80 to-card/40 hover:border-border/70 transition-all duration-300 overflow-hidden animate-fade-in-up card-hover"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="h-1 bg-gradient-to-r from-primary to-accent" />
                <CardContent className="p-6 md:p-8">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Key Features */}
        <div className="max-w-4xl mx-auto">
          <h3 className=\"text-2xl md:text-3xl font-bold text-center mb-8 md:mb-10 animate-fade-in-up\">
            What Makes Us Different
          </h3>
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6\">
            {[
              {
                title: "Virtual Trading Practice",
                desc: "Start with ₹10 lakh virtual balance. No real money needed. Perfect for learning without risk.",
              },
              {
                title: "Persistent Portfolio",
                desc: "Your portfolio data is saved across sessions. Track P&L, manage positions, and build long-term strategies.",
              },
              {
                title: "Options Trading",
                desc: "Trade options with CE/PE strategies, lot management, and comprehensive Greeks calculation.",
              },
              {
                title: "Mobile First Design",
                desc: "Fully responsive on all devices. Trade from your phone, tablet, or desktop seamlessly.",
              },
              {
                title: "Curated Market News",
                desc: "Real-time market news and alerts keeping you informed of important market events.",
              },
              {
                title: "Community Insights",
                desc: "Connect with fellow traders, share strategies, and learn from market professionals.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="glass-morphism rounded-xl p-6 md:p-8 animate-fade-in-up card-hover"
                style={{ animationDelay: `${(idx + 6) * 100}ms` }}
              >
                <h4 className="text-lg font-bold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
