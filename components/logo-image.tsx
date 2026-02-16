"use client"

import React, { useState, useEffect } from "react"
import { getStockLogoCandidates, getStockLogoDataUrl } from "@/lib/logo"

interface LogoImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  symbol: string
  name?: string
  size?: number
}

export function LogoImage({ symbol, name, size = 64, alt, className, ...rest }: LogoImageProps) {
  const [candidates, setCandidates] = useState<string[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const list = getStockLogoCandidates(symbol, name, size)
    setCandidates(list)
    setIndex(0)
  }, [symbol, name, size])

  const src = candidates[index] || getStockLogoDataUrl(symbol, name, size)

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || symbol}
      className={className}
      onError={(e) => {
        // advance to next candidate if available
        if (index < candidates.length - 1) {
          setIndex((i) => i + 1)
        } else {
          // final fallback - set to company logo
          try {
            ;(e.currentTarget as HTMLImageElement).src = "/placeholder-logo.svg"
          } catch {}
        }
      }}
      {...rest}
    />
  )
}
