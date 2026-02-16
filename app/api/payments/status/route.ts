import { NextResponse } from "next/server"
import { orders } from "../create/route"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const orderId = url.searchParams.get("orderId")
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 })

    const order = orders.get(orderId)
    if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 })

    return NextResponse.json({ orderId: order.id, status: order.status, amount: order.amount })
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 })
  }
}
