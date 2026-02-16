"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function StartupRedirect() {
  const router = useRouter()

  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      // On first client load after a fresh environment, redirect user to home page
      const launched = localStorage.getItem("hrtik_app_launched")
      if (!launched) {
        localStorage.setItem("hrtik_app_launched", "1")
        router.replace("/")
      }
    } catch {}
  }, [router])

  return null
}
