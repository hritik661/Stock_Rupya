"use client"

import React, { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"

type Msg = { id: string; role: "user" | "ai"; text: string; ts: number }

function simulatedReply(prompt: string): string {
  const p = prompt.toLowerCase()
  if (p.includes("buy") || p.includes("sell")) {
    return "If you plan to buy or sell, check volume, support/resistance and your risk management. For options, decide lot size and target/stop values. This is education only — not financial advice."
  }
  if (p.includes("profit") || p.includes("loss") || p.includes("p&l") || p.includes("pnl")) {
    return "P&L is calculated from the difference between entry price and current price multiplied by quantity. For options, P&L uses per-lot premium. Ask for a specific position to get a worked example."
  }
  if (p.includes("news") || p.includes("announce") || p.includes("market")) {
    return "You can read curated market news in the News section; look for tag chips (e.g., NIFTY, TCS) to filter. Use news as one input among many when trading."
  }
  if (p.includes("how") || p.includes("what") || p.includes("why")) {
    return "Ask specific questions like 'How do I buy 10 shares of RELIANCE?', or 'How is P&L calculated for option CE 26350?'. I'll answer with step-by-step guidance."
  }
  return "Thanks — I can help with trading basics, how P&L works, how to use the app features (buy/sell, options, portfolio). Ask me something specific about a stock, option strike, or the app."
}

export default function ChatSupport() {
  const { user } = useAuth()
  const storageKey = user ? `ai_chat_${user.email}` : `ai_chat_guest`
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey) || "[]"
      setMessages(JSON.parse(raw))
    } catch {
      setMessages([])
    }
  }, [storageKey])

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages)) } catch {}
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight
  }, [messages, storageKey])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    const userMsg: Msg = { id: Date.now().toString(36), role: "user", text, ts: Date.now() }
    setMessages((s) => [...s, userMsg])
    setInput("")
    setSending(true)

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      })

      if (!resp.ok) {
        // fallback to simulated reply when server disabled or no API key
        const aiText = simulatedReply(text)
        const aiMsg: Msg = { id: (Date.now() + 1).toString(36), role: "ai", text: aiText, ts: Date.now() }
        setMessages((s) => [...s, aiMsg])
        setSending(false)
        return
      }

      const body = await resp.json()
      const aiText = body?.reply || simulatedReply(text)
      const aiMsg: Msg = { id: (Date.now() + 1).toString(36), role: "ai", text: aiText, ts: Date.now() }
      setMessages((s) => [...s, aiMsg])
    } catch (err) {
      const aiText = simulatedReply(text)
      const aiMsg: Msg = { id: (Date.now() + 1).toString(36), role: "ai", text: aiText, ts: Date.now() }
      setMessages((s) => [...s, aiMsg])
    } finally {
      setSending(false)
    }
  }

  const clearChat = () => { setMessages([]); try { localStorage.removeItem(storageKey) } catch {} }

  return (
    <div className="mt-16">
      <h3 className="text-2xl font-bold mb-4">AI Chat Support</h3>
      <p className="text-sm text-muted-foreground mb-4">Ask questions about the app, a stock, options, or how P&L is calculated. Replies are automated and educational.</p>

      <div className="border-2 border-border/50 rounded-xl bg-card/50 p-4 hover:border-border/70 transition-colors">
        <div ref={containerRef} className="max-h-64 overflow-auto space-y-3 p-2 mb-3">
          {messages.length === 0 && <div className="text-sm text-muted-foreground">No messages yet — say hi!</div>}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] p-3 rounded-lg ${m.role === 'user' ? 'bg-primary/15 text-primary' : 'bg-secondary/60 text-muted-foreground'}`}>
                <div className="text-sm">{m.text}</div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(m.ts).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input placeholder="Ask about a stock, option or the app..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send() }} />
          <Button onClick={send} disabled={sending}>{sending ? 'Thinking…' : 'Send'}</Button>
          <Button variant="outline" onClick={clearChat}>Clear</Button>
        </div>
      </div>
    </div>
  )
}
