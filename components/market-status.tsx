"use client"

import { useState, useEffect } from "react"
import { isMarketOpen } from "@/lib/market-utils"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

export function MarketStatus() {
  const [status, setStatus] = useState(isMarketOpen())

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(isMarketOpen())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Badge
        variant={status.isOpen ? "default" : "secondary"}
        className={`text-xs md:text-sm ${status.isOpen ? "bg-primary text-primary-foreground" : "bg-destructive/20 text-destructive"}`}
      >
        <span
          className={`mr-1 md:mr-1.5 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full ${status.isOpen ? "bg-primary-foreground animate-pulse" : "bg-destructive"}`}
        />
        {status.isOpen ? "Market Open" : "Market Closed"}
      </Badge>
      <span className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-0.5 md:gap-1">
        <Clock className="h-2 w-2 md:h-3 md:w-3" />
        {status.message}
      </span>
    </div>
  )
}
