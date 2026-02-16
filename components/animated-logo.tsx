"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export function AnimatedLogo({ size = 'md', animated = true }: AnimatedLogoProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const sizeMap = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20 md:h-24 md:w-24',
    lg: 'h-40 w-40 md:h-48 md:w-48',
  }

  return (
    <div className={`relative ${sizeMap[size]}`}>
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { 
            filter: drop-shadow(0 0 12px rgba(34, 197, 94, 0.5)) drop-shadow(0 0 24px rgba(6, 182, 212, 0.3));
          }
          50% { 
            filter: drop-shadow(0 0 24px rgba(34, 197, 94, 0.9)) drop-shadow(0 0 40px rgba(6, 182, 212, 0.7));
          }
        }
        
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .animated-logo-image {
          animation: glow-pulse 3s ease-in-out infinite, float-gentle 4s ease-in-out infinite;
          transition: all 0.3s ease;
        }
        
        .animated-logo-image:hover {
          animation: spin-slow 8s linear infinite, glow-pulse 2s ease-in-out infinite;
        }
      `}</style>
      
      {isLoaded && (
        <Image
          src="/stockai-logo.png"
          alt="StockAI Logo"
          fill
          className="animated-logo-image object-contain"
          priority
        />
      )}
    </div>
  )
}
