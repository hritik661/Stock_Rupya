"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, ArrowRight, Sparkles, AlertCircle, Loader } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { LOGOS } from "@/lib/logos-config"

export function LoginForm({ compact, full, compactOnly }: { compact?: boolean; full?: boolean; compactOnly?: boolean }) {
  const router = useRouter()
  const { loginWithOTP } = useAuth()
  const [otpEmail, setOtpEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [otpStep, setOtpStep] = useState<"email" | "verify">("email")
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [otpSuccess, setOtpSuccess] = useState("")

  const handleSendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setOtpError("")
    setOtpSuccess("")
    setOtpLoading(true)

    const emailNormalized = otpEmail.toLowerCase().trim()
    if (!emailNormalized || !emailNormalized.includes("@")) {
      setOtpError("Please enter a valid email address")
      setOtpLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNormalized }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setOtpSuccess("OTP sent! Check your email")
        setOtpStep("verify")
        setOtp("")
      } else {
        setOtpError(data.error || "Failed to send OTP")
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Error sending OTP")
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setOtpError("")
    setOtpSuccess("")
    setOtpLoading(true)

    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP")
      setOtpLoading(false)
      return
    }

    try {
      const result = await loginWithOTP(otpEmail, otp)
      if (result.success) {
        try { window.dispatchEvent(new CustomEvent("close-login")) } catch (e) {}
        router.push("/")
      } else {
        setOtpError(result.error || "Invalid OTP")
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Error verifying OTP")
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResetOTP = () => {
    setOtpStep("email")
    setOtpEmail("")
    setOtp("")
    setOtpError("")
    setOtpSuccess("")
  }

  const cardWidth = compact ? "w-full max-w-md" : full ? "w-full max-w-2xl mx-auto" : "w-full max-w-lg"

  // Compact-only small card used in some contexts
  if (compactOnly) {
    return (
      <Card className={`${cardWidth}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 rounded-xl overflow-hidden shadow-2xl">
          <div className="hidden md:flex flex-col items-center justify-center p-10 bg-gradient-to-br from-primary to-emerald-400 text-black gap-6">
            <img src={LOGOS.main} alt="StockAI" className="h-16 w-16 object-contain drop-shadow-lg" onError={(e) => { (e.currentTarget as HTMLImageElement).src = LOGOS.fallback[0] }} />
            <div className="text-center">
              <h3 className="text-3xl md:text-4xl font-extrabold">StockAI</h3>
              <p className="mt-3 text-sm opacity-95">Secure Login via Email</p>
            </div>
          </div>

          <div className="m-0 rounded-none md:rounded-r-xl p-4 md:p-6">
            <div className="pb-2">
              <h4 className="text-lg font-bold">Sign In</h4>
              <p className="text-sm">Enter your email to receive an OTP</p>
            </div>

            <div className="space-y-4">
              {otpError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                  <AlertCircle className="h-4 w-4" />
                  {otpError}
                </div>
              )}

              {otpSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-100 p-2 rounded">
                  <Sparkles className="h-4 w-4" />
                  {otpSuccess}
                </div>
              )}

              {otpStep === "email" ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <Label htmlFor="otp-email" className="text-sm">Email Address</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input id="otp-email" type="email" placeholder="your@gmail.com" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} className="pl-12 h-10" />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-primary to-emerald-400 text-white font-semibold text-lg" disabled={otpLoading}>
                    {otpLoading ? (
                      <><Loader className="h-4 w-4 animate-spin mr-2" />Sending...</>
                    ) : (
                      <><span>Send OTP</span><ArrowRight className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <Label htmlFor="otp-code" className="text-sm">Enter 6-Digit Code</Label>
                    <div className="relative">
                      <Input id="otp-code" type="text" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} className="text-center text-2xl tracking-widest font-mono h-12" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Code expires in 5 minutes</p>
                  </div>

                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-primary to-emerald-400 text-white font-semibold text-lg" disabled={otpLoading}>
                    {otpLoading ? (<><Loader className="h-4 w-4 animate-spin mr-2" />Verifying...</>) : (<>Verify & Login<ArrowRight className="h-4 w-4 ml-2" /></>) }
                  </Button>

                  <Button type="button" variant="outline" className="w-full bg-transparent" onClick={handleResetOTP}>Change Email</Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Full login form (desktop + mobile)
  return (
    <div className={`${cardWidth} login-card-entrance`}>
      <div className={`grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-primary/10 bg-transparent`}>
        <div className={`flex flex-col items-center justify-center p-6 md:p-10 lg:p-14 bg-gradient-to-br from-primary/80 to-emerald-400/80 text-black gap-6`}>
          <div className="rounded-xl bg-white p-4 md:p-5 shadow-xl transform-gpu scale-100">
            <Sparkles className="h-8 md:h-10 w-8 md:w-10 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-extrabold leading-tight">Welcome to Stocks Market</h3>
            <p className="mt-3 text-xs md:text-sm opacity-95 max-w-sm mx-auto">Sign in with your Gmail to access your dashboard, portfolio and trades. Virtual ₹10,00,000 on first login.</p>
          </div>
          <div className="mt-6 text-xs md:text-sm text-black/85">Trusted by traders • Secure & instant</div>
        </div>

        <div className="m-0 rounded-none md:rounded-r-xl p-4 md:p-8 bg-card/80 backdrop-blur-sm">
          <div className="pb-2 px-0">
            <h4 className="text-xl md:text-2xl font-bold">Gmail Sign In</h4>
            <p className="text-xs md:text-sm text-muted-foreground">Quick and secure login with OTP</p>
          </div>

          <div className="space-y-3 md:space-y-6">
            {otpError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            {otpSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-100 p-3 rounded">
                <Sparkles className="h-4 w-4 flex-shrink-0" />
                <span>{otpSuccess}</span>
              </div>
            )}

            {otpStep === "email" ? (
              <form onSubmit={handleSendOTP} className="space-y-2 md:space-y-4">
                <div>
                  <Label htmlFor="otp-email" className="text-xs md:text-sm font-medium">Email Address</Label>
                  <div className="relative mt-1 md:mt-2">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 md:h-5 md:w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input id="otp-email" type="email" placeholder="your@gmail.com" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} className="pl-10 md:pl-12 h-9 md:h-12 text-sm md:text-lg" disabled={otpLoading} autoFocus />
                  </div>
                </div>

                <Button type="submit" className="w-full h-9 md:h-12 bg-gradient-to-r from-primary to-emerald-400 text-white font-semibold text-sm md:text-lg hover:opacity-90" disabled={otpLoading}>
                  {otpLoading ? (<><Loader className="h-4 w-4 animate-spin mr-2" />Sending OTP...</>) : (<><span>Send OTP to Email</span><ArrowRight className="h-4 w-4 ml-2" /></>)}
                </Button>

                <p className="text-[10px] md:text-xs text-muted-foreground text-center">We'll send you a 6-digit code.</p>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-2 md:space-y-4">
                <div>
                  <Label htmlFor="otp-code" className="text-xs md:text-sm font-medium">Enter OTP Code</Label>
                  <Input id="otp-code" type="text" inputMode="numeric" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} className="text-center text-2xl md:text-3xl tracking-widest font-mono h-11 md:h-14 mt-1 md:mt-2" disabled={otpLoading} autoFocus />
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2">Sent to: {otpEmail}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Code expires in 5 minutes</p>
                </div>

                <Button type="submit" className="w-full h-9 md:h-12 bg-gradient-to-r from-primary to-emerald-400 text-white font-semibold text-sm md:text-lg hover:opacity-90" disabled={otpLoading}>
                  {otpLoading ? (<><Loader className="h-4 w-4 animate-spin mr-2" />Verifying...</>) : (<><span>Verify & Login</span><ArrowRight className="h-4 w-4 ml-2" /></>)}
                </Button>

                <Button type="button" variant="outline" className="w-full h-9 md:h-12 bg-transparent text-sm md:text-base" onClick={handleResetOTP} disabled={otpLoading}>Change Email</Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginForm
