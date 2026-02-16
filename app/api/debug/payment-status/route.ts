import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { neon } from "@neondatabase/serverless"

// Dev-only debug endpoint to inspect current user and recent payment orders for the session
export async function GET(req: Request) {
  try {
    // Guard: disable in production unless explicitly enabled via ENV
    const allowDebug = process.env.ENABLE_DEBUG === 'true' || process.env.NODE_ENV !== 'production'
    if (!allowDebug) return NextResponse.json({ error: 'Debug endpoint disabled' }, { status: 403 })

    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value
    if (!sessionToken) return NextResponse.json({ error: 'No session token provided' }, { status: 401 })

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl || databaseUrl.includes('dummy')) return NextResponse.json({ error: 'No database configured' }, { status: 400 })

    const sql = neon(databaseUrl)

    // Lookup user by session
    let rows = await sql`
      SELECT u.id, u.email, u.name, u.balance, u.is_prediction_paid, u.is_top_gainer_paid
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.session_token = ${sessionToken}
      LIMIT 1
    `
    if (!rows || rows.length === 0) return NextResponse.json({ error: 'User not found for session' }, { status: 404 })
    const user = rows[0]

    // Fetch recent payment orders for this user
    const orders = await sql`
      SELECT order_id, user_id, amount, currency, status, payment_gateway, product_type, created_at
      FROM payment_orders
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 25
    `

    return NextResponse.json({ success: true, user, paymentOrders: orders })
  } catch (err) {
    console.error('[DEBUG] /api/debug/payment-status error:', err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
