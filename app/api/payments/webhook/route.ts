import { NextResponse } from "next/server"
import { orders } from "../create/route"
import { getPool } from "@/lib/mysql"

// Webhook handler: expects gateway to POST { orderId, event, txRef }
// Production: verify signature header against UPIPG_WEBHOOK_SECRET
export async function POST(req: Request) {
  try {
    const sig = req.headers.get("x-upipg-signature") || req.headers.get("x-signature")
    const secret = process.env.UPIPG_WEBHOOK_SECRET
    if (secret && !sig) {
      return NextResponse.json({ error: "signature missing" }, { status: 401 })
    }

    // If signature is present, do a simple equality check. Gateways usually provide HMACs.
    if (secret && sig !== secret) {
      return NextResponse.json({ error: "invalid signature" }, { status: 403 })
    }

    const body = await req.json()
    const { orderId, event, txRef } = body || {}
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 })

    const order = orders.get(orderId)
    if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 })

    if (event === "paid") {
      order.status = "paid"
      orders.set(orderId, order)

      try {
        const pool = getPool()
        await pool.query("UPDATE orders SET status = ? WHERE id = ?", ["paid", orderId])
        if (txRef) {
          await pool.query("INSERT INTO payments (order_id, tx_ref, amount, created_at) VALUES (?, ?, ?, ?)", [
            orderId,
            txRef,
            order.amount,
            Date.now(),
          ])
        }
      } catch (e) {
        console.warn("Could not persist webhook to MySQL:", e)
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, message: "unhandled event" })
  } catch (err) {
    return NextResponse.json({ error: "webhook handling failed" }, { status: 500 })
  }
}
