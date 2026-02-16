import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { PredictionProvider } from "@/contexts/prediction-context"
import { Toaster } from "@/components/ui/toaster"
import StartupRedirect from "@/components/startup-redirect"
import LoginModal from "@/components/login-modal"
import Providers from "@/components/providers"
import "../styles/indices-ticker-mobile.css"
import { LOGOS } from "@/lib/logos-config"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "StockAI - AI-Powered Indian Stock Trading Platform",
  description: "Trade Indian stocks with real-time data, advanced charts, AI predictions, and portfolio management powered by machine learning",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: LOGOS.favicon.light,
        media: "(prefers-color-scheme: light)",
      },
      {
        url: LOGOS.favicon.dark,
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: LOGOS.favicon.svg,
        type: "image/svg+xml",
      },
    ],
    apple: LOGOS.favicon.apple,
  },
}

export const viewport: Viewport = {
  themeColor: "#1a1625",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
            <Providers>
              <StartupRedirect />
              {children}
              <LoginModal />
              <Toaster />
            </Providers>
        <Analytics />
      </body>
    </html>
  )
}
