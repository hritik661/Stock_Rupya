import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { neon } from "@neondatabase/serverless"

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    // Dev fallback: allow passing session token in body/header/query if no cookie
    let devSessionToken: string | null = null
    if (!sessionToken && process.env.NODE_ENV !== 'production') {
      try {
        const body = await req.json()
        devSessionToken = body?.session_token || null
      } catch {}
      devSessionToken = devSessionToken || req.headers.get('x-session-token') || null
      try {
        const url = new URL(req.url)
        devSessionToken = devSessionToken || url.searchParams.get('session_token') || null
      } catch {}
      const auth = req.headers.get('authorization') || req.headers.get('Authorization')
      if (!devSessionToken && auth?.startsWith('Bearer ')) devSessionToken = auth.slice(7)
    }

    const token = sessionToken || devSessionToken
    if (!token) return NextResponse.json({ error: "Unauthorized - No session token" }, { status: 401 })

    const databaseUrl = process.env.DATABASE_URL
    const useDatabase = databaseUrl && !databaseUrl.includes('dummy')
    const sql = useDatabase ? neon(databaseUrl!) : null
    let user: any

    const isLocalToken = token.startsWith('local')
    if (useDatabase && sql && !isLocalToken) {
      const userRows = await sql`
        SELECT u.id, u.email, u.name, u.is_top_gainer_paid
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.session_token = ${token}
        LIMIT 1
      `
      if (!userRows?.length) return NextResponse.json({ error: "Unauthorized - User not found" }, { status: 401 })
      user = userRows[0]
    } else {
      const parts = token.split(':')
      if (parts.length >= 2 && parts[0] === 'local') {
        const userEmail = parts[1]
        // Format user ID the same way login route does: email.replace(/[^a-zA-Z0-9]/g, "_")
        const formattedId = userEmail.replace(/[^a-zA-Z0-9]/g, "_")
        user = { id: formattedId, email: userEmail, name: userEmail.split('@')[0], is_top_gainer_paid: false }
      } else {
        return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 })
      }
    }

    // Check if user has top gainer access
    if (!user.is_top_gainer_paid) {
      return NextResponse.json({ error: "User does not have top gainer access to revert" }, { status: 400 })
    }

    // Revert the top gainer payment - also clear predictions access so revert in one module clears both
    if (useDatabase && sql) {
      try {
        // Clear both payment flags on the user (top_gainers and predictions)
        await sql`UPDATE users SET is_top_gainer_paid = false, is_prediction_paid = false WHERE id = ${user.id}`

        // Optionally mark any existing payment orders as reverted for clarity
        try {
          await sql`UPDATE payment_orders SET status = 'reverted' WHERE user_id = ${user.id} AND product_type IN ('predictions', 'top_gainers')`
        } catch (e) {
          console.warn('[REVERT-PAYMENT] Failed to update payment_orders status (continuing):', e)
        }

        console.log('🔄 [REVERT-PAYMENT] Reverted payment for user (top_gainers + predictions):', user.id)

        return NextResponse.json({ 
          success: true, 
          message: "Payment access has been reverted for top gainers and predictions. Please make a new payment to access features.",
          user: {
            id: user.id,
            email: user.email,
            isTopGainerPaid: false,
            isPredictionPaid: false
          }
        })
      } catch (err) {
        console.error('[REVERT-PAYMENT] DB error:', err)
        return NextResponse.json({ error: "Failed to revert payment", details: err instanceof Error ? err.message : String(err) }, { status: 500 })
      }
    }

    return NextResponse.json({ error: "Database not configured" }, { status: 500 })

  } catch (error) {
    console.error('[REVERT-PAYMENT] Error:', error)
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
