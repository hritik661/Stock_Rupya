"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface CountdownTimerProps {
  duration: number // in seconds
  onComplete: () => void
  className?: string
}

export function CountdownTimer({ duration, onComplete, className = "" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const router = useRouter()

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, onComplete])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className={`fixed top-4 right-4 z-50 bg-black/80 backdrop-blur-sm border border-red-500/50 rounded-lg px-4 py-2 text-white font-mono text-lg ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <span>
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}