"use client"

import { BarChart3, TrendingUp, LineChart, Zap, Lock, Users, Award, Globe } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function FeaturesSection() {
  const features = [
    {
      icon: BarChart3,
      title: "Professional Charts",
      desc: "Interactive candlestick and line charts with multiple timeframes and technical indicators",
      color: "from-primary to-primary/50",
    },
    {
      icon: Zap,
      title: "AI Predictions",
      desc: "85%+ accuracy ML models predicting stock movements for 50+ Nifty companies",
      color: "from-accent to-accent/50",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Quotes",
      desc: "Live NSE/BSE stock data with instant updates and comprehensive market coverage",
      color: "from-emerald-500 to-emerald-500/50",
    },
    {
      icon: LineChart,
      title: "Portfolio Tracking",
      desc: "Persistent portfolio management with detailed P&L analysis across sessions",
      color: "from-blue-500 to-blue-500/50",
    },
    {
      icon: Lock,
      title: "Secure Trading",
      desc: "Bank-grade encryption, OAuth authentication, and protected transactions",
      color: "from-indigo-500 to-indigo-500/50",
    },
    {
      icon: Users,
      title: "Community",
      desc: "Connect with Indian traders and share insights with market professionals",
      color: "from-violet-500 to-violet-500/50",
    },
    {
      icon: Globe,
      title: "Market News",
      desc: "Curated real-time market news and alerts keeping you updated always",
      color: "from-cyan-500 to-cyan-500/50",
    },
    {
      icon: Award,
      title: "Premium Features",
      desc: "Advanced strategies, options trading, and priority market analysis",
      color: "from-orange-500 to-orange-500/50",
    },
  ]

  return (
    <section id="features" className="relative py-16 md:py-24 lg:py-32 bg-background overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16 lg:mb-20 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground mb-4 md:mb-6">
            Everything You Need to Trade
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful tools, real-time data, and AI insights all in one platform
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <Card
                key={idx}
                className="border-2 border-border/50 bg-card/50 hover:border-border/70 transition-all duration-300 overflow-hidden group animate-fade-in-up card-hover"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`h-1 bg-gradient-to-r ${feature.color}`} />
                <CardContent className="p-6 md:p-8">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
