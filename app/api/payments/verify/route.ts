import { NextResponse } from "next/server"
import { orders } from "../create/route"
import { getPool } from "@/lib/mysql"

// Manual verification endpoint. Production: call gateway APIs or rely on webhook signatures.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, txRef } = body || {}
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 })

    const order = orders.get(orderId)
    if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 })

    if (!txRef || typeof txRef !== "string" || txRef.trim().length === 0) {
      return NextResponse.json({ error: "txRef required" }, { status: 400 })
    }

    order.status = "paid"
    orders.set(orderId, order)

    // Persist status to DB if available
    try {
      const pool = getPool()
      await pool.query("UPDATE orders SET status = ? WHERE id = ?", ["paid", orderId])
      await pool.query("INSERT INTO payments (order_id, tx_ref, amount, created_at) VALUES (?, ?, ?, ?)", [
        orderId,
        txRef,
        order.amount,
        Date.now(),
      ])
    } catch (e) {
      console.warn("Could not persist verification to MySQL:", e)
    }

    return NextResponse.json({ ok: true, orderId })
  } catch (err) {
    return NextResponse.json({ error: "verification failed" }, { status: 500 })
  }
}
