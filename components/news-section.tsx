"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Clock, TrendingUp, TrendingDown, Sparkles, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  publishedAt: string
  url: string
  sentiment: "positive" | "negative" | "neutral"
  relatedStocks: string[]
  recommendation: string | null
}

interface NewsSectionProps {
  stockSymbol?: string
  limit?: number
}

export function NewsSection({ stockSymbol, limit = 5 }: NewsSectionProps) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const fetchNews = async () => {
    try {
      const response = await fetch("/api/news")
      if (response.ok) {
        const data = await response.json()

        // Filter by today's date first
        const today = new Date()
        const todayString = today.toISOString().split('T')[0]
        let filteredNews = data.filter((n: NewsItem) => {
          const newsDate = new Date(n.publishedAt).toISOString().split('T')[0]
          return newsDate === todayString
        })

        // If no today's news, show recent news (last 2 days)
        if (filteredNews.length === 0) {
          const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
          filteredNews = data.filter((n: NewsItem) => {
            const newsDate = new Date(n.publishedAt)
            return newsDate >= twoDaysAgo
          })
        }

        // Market-responsive filtering: prioritize by sentiment and market conditions
        const now = new Date()
        const hour = now.getHours()
        const isMarketOpen = hour >= 9 && hour < 16 // Indian market hours (9 AM to 4 PM)

        // During market hours, prioritize positive sentiment and sector news
        if (isMarketOpen) {
          const positiveNews = filteredNews.filter((n: NewsItem) => n.sentiment === "positive")
          const neutralNews = filteredNews.filter((n: NewsItem) => n.sentiment === "neutral")
          const negativeNews = filteredNews.filter((n: NewsItem) => n.sentiment === "negative")
          filteredNews = [...positiveNews, ...neutralNews, ...negativeNews]
        } else {
          // After hours, prioritize by relevance and recency
          filteredNews = filteredNews.sort((a, b) => 
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          )
        }

        // If stock symbol is provided, prioritize stock-specific news
        if (stockSymbol) {
          const stockSpecificNews = filteredNews.filter((n: NewsItem) =>
            n.relatedStocks.some((s: string) => s.includes(stockSymbol.replace(".NS", "")))
          )

          // If we have stock-specific news, show them first, then add general news to reach the limit
          if (stockSpecificNews.length > 0) {
            const generalNews = filteredNews.filter((n: NewsItem) =>
              !n.relatedStocks.some((s: string) => s.includes(stockSymbol.replace(".NS", "")))
            )
            filteredNews = [...stockSpecificNews, ...generalNews.slice(0, limit - stockSpecificNews.length)]
          }
        }

        // Remove duplicate items (same title + source)
        const seen = new Set<string>()
        filteredNews = filteredNews.filter((n: NewsItem) => {
          const key = `${n.title}||${n.source}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })

        // Filter out noisy index-level items (e.g., NSEI / generic index feeds)
        filteredNews = filteredNews.filter((n: NewsItem) => {
          const t = (n.title || "").toLowerCase()
          if (t.includes("nsei") || t.includes("nifty") || t.includes("index")) return false
          return true
        })

        setNews(filteredNews.slice(0, limit))
      }
    } catch (error) {
      console.error("Error fetching news:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchNews()
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchNews, 300000)
    return () => clearInterval(interval)
  }, [stockSymbol, limit])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchNews()
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 60) return `${diffMins} mins ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
  }

  const handleStockClick = (symbol: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const cleanSymbol = symbol.replace("^", "").replace(".NS", "")
    router.push(`/stock/${cleanSymbol}.NS`)
  }

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Latest Market News</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-2 rounded-md bg-secondary/50 animate-pulse">
                <div className="h-3 bg-secondary rounded w-3/4 mb-1" />
                <div className="h-2 bg-secondary rounded w-full mb-1" />
                <div className="h-2 bg-secondary rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Latest Market News
            {stockSymbol && (
              <Badge variant="secondary" className="text-[10px]">
                {stockSymbol.replace(".NS", "").replace("^", "")}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-7 w-7 p-0">
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Real-time news from Yahoo Finance</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 md:space-y-3">
          {news.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 md:p-3 rounded-md bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {item.sentiment === "positive" && <TrendingUp className="h-3 w-3 text-primary flex-shrink-0" />}
                    {item.sentiment === "negative" && (
                      <TrendingDown className="h-3 w-3 text-destructive flex-shrink-0" />
                    )}
                    <h4 className="font-medium text-xs line-clamp-2">{item.title}</h4>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5">{item.summary}</p>

                  {item.recommendation && (
                    <div className="flex items-center gap-1.5 mb-1.5 p-1.5 rounded-md bg-primary/10 border border-primary/20">
                      <Sparkles className="h-2.5 w-2.5 text-primary flex-shrink-0" />
                      <span className="text-[10px] font-medium text-primary">{item.recommendation}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{item.source}</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTimeAgo(item.publishedAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-0.5 mt-1.5">
                    {item.relatedStocks.slice(0, 3).map((stock) => (
                      <Badge
                        key={stock}
                        variant="outline"
                        className="text-[9px] cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-1.5 py-0.5"
                        onClick={(e) => handleStockClick(stock, e)}
                      >
                        {stock.replace(".NS", "").replace("^", "")}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
