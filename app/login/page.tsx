"use client"

import LoginForm from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* animated blobs behind the form */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="login-blob login-blob--one" aria-hidden />
        <div className="login-blob login-blob--two" aria-hidden />
      </div>

      <div className="w-full max-w-4xl px-4">
        <div className="login-card-entrance login-backdrop p-4 md:p-6">
          <LoginForm full />
        </div>
      </div>
    </div>
  )
}
