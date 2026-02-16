"use client"

import React, { useEffect, useState } from "react"
import { LoginForm } from "./login-form"

export default function LoginModal() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const openHandler = () => setVisible(true)
    const openListener = (e: Event) => openHandler()
    const closeListener = (e: Event) => setVisible(false)
    window.addEventListener("open-login", openListener as EventListener)
    window.addEventListener("close-login", closeListener as EventListener)

    // show if URL contains ?showLogin
    try {
      if (typeof window !== "undefined" && window.location.search.includes("showLogin")) {
        setVisible(true)
      }
    } catch {}

    return () => {
      window.removeEventListener("open-login", openListener as EventListener)
      window.removeEventListener("close-login", closeListener as EventListener)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setVisible(false)}
        aria-hidden
      />

      <div className="relative w-full h-full">
        <div className="flex items-center justify-center h-full p-4">
          <div className="w-full h-full max-w-4xl max-h-[96vh] overflow-auto rounded-3xl bg-card/95 glass border border-primary/20 shadow-[0_30px_80px_rgba(2,6,23,0.8)] transform transition-all duration-300 login-card-entrance">
            <div className="relative">
              <div className="absolute -top-3 right-6 md:-top-4 md:right-8 z-50">
                <button
                  aria-label="Close login modal"
                  onClick={() => setVisible(false)}
                  className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/5 text-white hover:bg-white/10 transition-all duration-150 flex items-center justify-center border border-white/10 shadow-md"
                  style={{ boxShadow: '0 8px 18px rgba(0,0,0,0.45)' }}
                >
                  <span className="text-lg md:text-xl font-extrabold text-white">×</span>
                </button>
              </div>
            </div>
            <div className="h-full p-3 md:p-6">
              <div className="mx-auto max-w-4xl">
                <LoginForm full />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
