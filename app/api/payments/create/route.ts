import { NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"

// Create order and persist to MySQL when MYSQL_URL is configured. Otherwise keep an in-memory fallback.
type Order = {
  id: string
  amount: number
  status: "pending" | "paid"
  qrUrl: string
  createdAt: number
  meta?: Record<string, any>
}

const orders = new Map<string, Order>()

function genId() {
  return (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function")
    ? (crypto as any).randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const amount = Number(body.amount) || 1
    const upi = (body.upi || process.env.DEFAULT_UPI || "hritikparmar33@okaxis").toString()
    const payee = (body.payee || process.env.PAYEE_NAME || "Hritik Parmar").toString()
    const userEmail = (body.userEmail || null)
    const product = (body.product || "general")

    const id = genId()

    const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(
      payee,
    )}&am=${encodeURIComponent(String(amount))}&cu=INR&tn=${encodeURIComponent("Predictions Unlock")}`

    const qrUrl = (body.qrUrl || "/qr-upi.png").toString()

    const order: Order = { id, amount, status: "pending", qrUrl, createdAt: Date.now(), meta: { userEmail, product } }
    orders.set(id, order)

    // If MySQL is available, persist order to `orders` table. Schema (example):
    // CREATE TABLE orders (id VARCHAR(128) PRIMARY KEY, amount INT, status VARCHAR(16), created_at BIGINT, meta JSON);
    try {
      const pool = getPool()
      // store metadata if the schema supports a `meta` or `notes` column. If not, this will be ignored.
      try {
        await pool.query("INSERT INTO orders (id, amount, status, created_at, meta) VALUES (?, ?, ?, ?, ?)", [
          id,
          amount,
          "pending",
          Date.now(),
          JSON.stringify({ userEmail, product }),
        ])
      } catch (e) {
        // fallback to older schema without meta column
        await pool.query("INSERT INTO orders (id, amount, status, created_at) VALUES (?, ?, ?, ?)", [
          id,
          amount,
          "pending",
          Date.now(),
        ])
      }
    } catch (e) {
      // Ignore DB errors in dev; still return order info
      console.warn("Could not persist order to MySQL:", e)
    }

    // Return a gateway URL placeholder — payment gateways often require a server-generated URL.
    // We include orderId so the callback can verify the order.
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || (typeof (globalThis as any).location !== "undefined" ? (globalThis as any).location.origin : "")
    const returnUrl = encodeURIComponent(`${origin}/payments/upipg/callback?orderId=${id}`)
    const gatewayUrl = `https://upipg.cit.org.in/en/pay/CMncrfrdBy38YdVfBrFI?public&return_url=${returnUrl}`

    return NextResponse.json({ orderId: id, qrUrl, amount, upiDeepLink, gatewayUrl }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

export { orders }
