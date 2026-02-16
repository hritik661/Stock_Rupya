"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Target, Zap, Users, Award, ArrowRight, CheckCircle2, Globe, Lock, BarChart3, ShoppingCart, Smartphone, Sparkles, Brain, TrendingUp, BarChart2 } from "lucide-react"
import ChatSupport from "@/components/chat-support"
import { CTASection } from "@/components/cta-section"
import { SupportSection } from "@/components/support-section"

export default function AboutPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
          50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.6); }
        }
        @keyframes float-up {
          0% { transform: translateY(10px); opacity: 0.8; }
          50% { transform: translateY(-10px); opacity: 1; }
          100% { transform: translateY(10px); opacity: 0.8; }
        }
        @keyframes logo-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        /* Soft glow behind logo (static, no motion) */
        .logo-wrap { position: relative; display: inline-block; border-radius: 12px; }
        .logo-wrap::before {
          content: '';
          position: absolute;
          inset: -12px;
          background: radial-gradient(ellipse at center, rgba(34,197,94,0.16), rgba(34,197,94,0.06) 30%, transparent 60%);
          filter: blur(16px);
          z-index: -1;
          pointer-events: none;
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }
        @keyframes shine {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }
        @keyframes border-glow {
          0%, 100% { 
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.3), inset 0 0 20px rgba(34, 197, 94, 0.1);
            border-color: rgba(34, 197, 94, 0.5);
          }
          50% { 
            box-shadow: 0 0 60px rgba(34, 197, 94, 0.6), inset 0 0 30px rgba(34, 197, 94, 0.2);
            border-color: rgba(34, 197, 94, 0.8);
          }
        }
        .logo-animate { /* kept for compatibility but we will avoid applying it where not wanted */ }
        .hero-title { animation: fade-in-up 0.8s ease-out; }
        .hero-subtitle { animation: fade-in-up 0.8s ease-out 0.2s both; }
        .hero-buttons { animation: fade-in-up 0.8s ease-out 0.4s both; }
        .feature-card { animation: fade-in-up 0.6s ease-out backwards; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .feature-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(34, 197, 94, 0.2); }
        /* stat animations disabled for stable layout */
        .stat-card { /* no continuous animation */ }
        .stat-number { /* no continuous animation */ }
        .premium-card {
          position: relative;
          background: linear-gradient(-45deg, rgba(34, 197, 94, 0.1), rgba(139, 92, 246, 0.1), rgba(34, 197, 94, 0.1));
          background-size: 400% 400%;
          animation: gradient-shift 6s ease infinite, border-glow 3s ease-in-out infinite;
          overflow: hidden;
        }
        .premium-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: shine 3s infinite;
          z-index: 1;
          pointer-events: none;
        }
        .premium-card > * {
          position: relative;
          z-index: 2;
        }
      `}</style>

      <Header isLandingPage={true} />

      <main className="container mx-auto px-2 md:px-4 py-4 md:py-12">
        {/* Centered StockRupya Logo + Welcome Banner (visible on all screen sizes) */}
        <div className="flex justify-center mb-3 md:mb-4">
          <div className="logo-wrap">
            <img src="/rupya.png" alt="StockRupya Logo" className="h-20 sm:h-28 md:h-48 w-auto sparkle-anim" style={{ filter: 'brightness(0) saturate(100%)' }} />
          </div>
        </div>
        <div className="flex justify-center mb-6 md:mb-12">
          <div className="px-3 md:px-6 py-1.5 md:py-3 rounded-full border border-primary/50 bg-primary/10 backdrop-blur-sm">
            <p className="text-xs md:text-base font-bold text-center text-primary uppercase tracking-tight md:tracking-widest whitespace-nowrap overflow-hidden text-ellipsis">
              ⚡ Welcome to StockRupya - India's #1 Trading Platform
            </p>
          </div>
        </div>

        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center text-center mb-6 md:mb-12">
          <style>{`
            @keyframes subtle-black-glow {
              0%, 100% { background-color: rgba(0, 0, 0, 0.05); box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.08); }
              50% { background-color: rgba(0, 0, 0, 0.1); box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.12); }
            }
            .highlight-effect {
              animation: subtle-black-glow 4s ease-in-out infinite;
              padding: 2px 6px;
              border-radius: 6px;
              display: inline-block;
            }
          `}</style>
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="hero-title">
              <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
                Master the Market with <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">AI Power</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground">
                Trade smarter, not harder. Get real-time predictions and <span className="highlight-effect">Start trading with virtual money—zero real money risk</span>
              </p>
            </div>

         

            <div className="hero-buttons flex flex-row gap-2 sm:gap-6 justify-center">
              {!user && (
                <Button size="md" className="rounded-lg text-sm sm:text-base px-4 sm:px-12 py-2 sm:py-4 bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/60" onClick={() => window.dispatchEvent(new Event('open-login'))}>
                  Start Trading Free
                </Button>
              )}
              <Button asChild size="md" variant="outline" className="rounded-lg text-sm sm:text-base px-3 sm:px-8 py-2 sm:py-4 border-2">
                <Link href="#features">Explore Features</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-12 md:mb-16">
          {[
            { number: "10K+", label: "Active Traders", icon: Users },
            { number: "50+", label: "Nifty Stocks", icon: BarChart2 },
            { number: "85%", label: "Accuracy Rate", icon: TrendingUp },
          ].map((stat, idx) => {
            const Icon = stat.icon
            return (
              <div
                key={idx}
                className="stat-card bg-card/50 backdrop-blur border border-primary/20 rounded-xl p-2 md:p-4 lg:p-5 text-center"
                style={{ animationDelay: `${idx * 0.15}s` }}
              >
                <div className="flex justify-center mb-2">
                  <Icon className="h-4 w-4 md:h-6 md:w-6 lg:h-5 lg:w-5 text-primary" />
                </div>
                <div className="stat-number text-base md:text-2xl lg:text-lg font-black text-primary mb-1">{stat.number}</div>
                <p className="text-xs md:text-sm lg:text-xs text-muted-foreground font-medium">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Features Grid */}
        <section id="features" className="mb-16 md:mb-24 scroll-mt-20">
          <div className="max-w-5xl mx-auto mb-12">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-center mb-4 md:mb-6">Powerful Features Built for <span className="text-primary">You</span></h2>
            <p className="text-center text-muted-foreground text-sm md:text-base lg:text-lg max-w-2xl mx-auto">Everything you need to master stock trading, options, and index investing with AI-powered insights.</p>
          </div>

          <div className="grid grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {[
              { icon: Zap, title: "Lightning-Fast Data", desc: "Real-time stock quotes, indices, and market updates" },
              { icon: Brain, title: "AI Predictions", desc: "Machine learning models tracking 50+ Nifty stocks with growth predictions and confidence scores" },
              { icon: BarChart3, title: "Advanced Charts", desc: "Professional candlestick charts, technical indicators, and multiple timeframe analysis" },
              { icon: ShoppingCart, title: "Trade Stocks & Options", desc: "Place simulated BUY/SELL orders for shares and option lots; view P&L, close/partially close positions" },
              { icon: Globe, title: "News & Alerts", desc: "Curated market news and alerts alongside quotes so you never miss important events" },
              { icon: Lock, title: "Secure Trading", desc: "Bank-grade security with OAuth authentication and encrypted transactions" },
              { icon: Users, title: "Community", desc: "Connect with Indian traders, share insights, and learn from market professionals" },
              { icon: Award, title: "Market Trust & Credibility", desc: "Trusted by thousands of Indian investors with reliable data and transparent analytics" },
              { icon: Smartphone, title: "Mobile Trading App", desc: "Trade on-the-go with fully responsive design and instant push notifications for live alerts" },
            ].map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  className="feature-card group bg-gradient-to-br from-card/80 to-card/40 border border-primary/20 rounded-lg p-4 md:p-5 lg:p-6 backdrop-blur-sm hover:border-primary/50 min-h-[92px] md:min-h-[110px]"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className="h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 rounded-full border-2 border-primary bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center mb-2 md:mb-3 lg:mb-4 group-hover:from-primary/30 group-hover:to-accent/20 transition-all relative">
                    <Icon className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-primary" />
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse"></div>
                  </div>
                  <h3 className="text-sm md:text-base lg:text-lg font-bold mb-1 md:mb-1 lg:mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-xs md:text-sm lg:text-sm leading-relaxed">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* About Premium */}
        <section className="mb-16 md:mb-24">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-3 gap-3 md:gap-6 lg:gap-8\">
              <div className="stat-card text-center p-2 md:p-4 lg:p-5 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/30">
                <div className="text-xl md:text-3xl font-black text-primary mb-1 md:mb-3">₹10L</div>
                <p className="text-muted-foreground font-medium text-xs md:text-base">Starting Capital</p>
                <p className="text-xs text-muted-foreground mt-1 md:mt-2">Risk-free virtual trading</p>
              </div>
              <div className="stat-card text-center p-2 md:p-4 lg:p-5 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/30">
                <div className="text-xl md:text-3xl font-black text-primary mb-1 md:mb-3">Real-Time</div>
                <p className="text-muted-foreground font-medium text-xs md:text-base">Live Updates</p>
                <p className="text-xs text-muted-foreground mt-1 md:mt-2">Market data & prices</p>
              </div>
              <div className="stat-card text-center p-2 md:p-4 lg:p-5 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/30">
                <div className="text-xl md:text-3xl font-black text-primary mb-1 md:mb-3">24/7</div>
                <p className="text-muted-foreground font-medium text-xs md:text-base">Support</p>
                <p className="text-xs text-muted-foreground mt-1 md:mt-2">Always available for you</p>
              </div>
            </div>
          </div>
        </section>

        {/* Premium Service Section */}
        <section className="max-w-5xl mx-auto mb-24 md:mb-32">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Premium Services</h2>
            <p className="text-muted-foreground text-lg">Get exclusive AI-powered insights and real-time market analysis.</p>
          </div>
          
          <div className="space-y-6 md:space-y-8">
            {/* Predictions Service - First */}
            <Card className="border-primary/40 bg-gradient-to-br from-primary/8 via-accent/4 to-primary/6 backdrop-blur transition-all shadow-2xl overflow-hidden">
              <CardContent className="p-6 md:p-8 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <h3 className="text-2xl font-bold">AI Stock Predictions</h3>
                  </div>
                  <span className="bg-gradient-to-r from-primary to-accent text-white px-4 py-1.5 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider shadow-lg">MOST POPULAR</span>
                </div>
                <p className="text-muted-foreground mb-4">Get access to our AI-powered daily predictions of stocks likely to gain 5%+ growth.</p>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 85%+ Accuracy predictions</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Real-time market analysis</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Technical indicators & charts</li>
                </ul>
                <Link href="/predictions">
                  <Button size="md" className="bg-gradient-to-r from-primary to-accent hover:shadow-xl hover:shadow-primary/50 w-full font-bold transition-all py-3 text-sm">
                    Unlock Now - ₹200
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Top Gainers Service - Second */}
            <Card className="border-primary/40 bg-gradient-to-br from-primary/8 via-accent/4 to-primary/6 backdrop-blur transition-all shadow-2xl overflow-hidden">
              <CardContent className="p-6 md:p-8 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <h3 className="text-2xl font-bold">Top Gainers (5%+ Growth)</h3>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">Unlock access to our curated list of top-performing stocks with 5%+ growth.</p>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 5+ trending gainers daily</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Real-time price updates</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 52-week performance tracking</li>
                </ul>
                <Link href="/top-gainers">
                  <Button size="sm" className="bg-gradient-to-r from-primary to-accent hover:shadow-xl hover:shadow-primary/50 w-full font-semibold transition-all py-2 text-sm">
                    Unlock Now - ₹200
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Advanced Analytics Service */}
            <Card className="premium-card border-primary/40 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 backdrop-blur hover:border-primary/60 transition-all shadow-2xl overflow-hidden">
              <CardContent className="p-6 md:p-8 relative">
                <h3 className="text-2xl font-bold mb-3 flex items-center gap-3">
                  <Award className="h-6 w-6 text-primary animate-pulse" />
                  Advanced Analytics
                </h3>
                <p className="text-muted-foreground mb-4">Deep-dive technical analysis, volume trends, option chain insights, and institutional ownership patterns for every stock in our tracking system.</p>
                <Button size="sm" className="bg-gradient-to-r from-primary to-accent hover:shadow-xl hover:shadow-primary/50 font-bold transition-all">
                  Learn More
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-4xl mx-auto mb-24 md:mb-32">
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12">How To Get Started</h2>
          
          <div className="space-y-6">
            {[
              { step: 1, title: "Sign Up Free", desc: "Create your account with email and get ₹10,00,000 virtual capital instantly." },
              { step: 2, title: "Explore the Market", desc: "Browse 50+ Nifty stocks with real-time data, charts, and our AI predictions." },
              { step: 3, title: "Place Your First Trade", desc: "Buy or sell stocks and options with zero risk. Your portfolio and P&L persist across sessions." },
              { step: 4, title: "Learn & Improve", desc: "Track your performance, learn from the data, and refine your trading strategy." },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-4 md:gap-6 p-6 rounded-xl border border-primary/20 bg-card/50 hover:border-primary/50 transition-all">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/20 text-primary font-bold text-lg">
                    {item.step}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto mb-24 md:mb-32">
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {[
              {
                q: "How accurate are your AI predictions?",
                a: "Our ML models achieve 85%+ confidence on predictions for stocks with 7% or more expected growth within 48 hours.",
              },
              {
                q: "Can I trade in real markets?",
                a: "Currently, Stock AI offers virtual trading with ₹10,00,000 starting balance. Real market trading may be supported in a future release.",
              },
              {
                q: "How can I restore my balance?",
                a: "Use the Reset Balance option in your user menu to reset your virtual balance to ₹10,00,000.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept UPI, debit cards, credit cards, net banking, and all major payment apps via secure gateway.",
              },
            ].map((item, idx) => (
              <div key={idx} className="p-4 md:p-6 rounded-xl border border-primary/20 bg-card/50 hover:border-primary/50 transition-all">
                <h4 className="font-bold text-base md:text-lg mb-2">{item.q}</h4>
                <p className="text-muted-foreground text-sm md:text-base">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Support Section */}
        <section className="max-w-5xl mx-auto mb-12 md:mb-16">
          <SupportSection />
        </section>

        {/* CTA Section */}
        <section className="text-center py-12 md:py-16 border-t border-border/50">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
            {!user && (
              <Button asChild size="sm" className="rounded-lg text-xs sm:text-sm px-4 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-primary to-accent hover:shadow-lg">
                <Link href="/login">Get Started Free</Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline" className="rounded-lg text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-3 border-2">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </section>
      </main>

      <CTASection />
    </div>
  )
}
