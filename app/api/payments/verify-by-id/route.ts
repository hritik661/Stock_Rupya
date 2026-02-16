import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { neon } from "@neondatabase/serverless"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const paymentId = (body?.payment_id || '').trim()
    const orderId = body?.order_id || null
    const product = body?.product || 'predictions'

    if (!paymentId) return NextResponse.json({ error: 'Missing payment_id' }, { status: 400 })

    const requiredAmountPaise = product === 'top_gainers' ? 20000 : 20000

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    // If Razorpay keys exist, verify payment directly with Razorpay
    let razorpayVerified = false
    let razorpayData: any = null
    if (keyId && keySecret) {
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
        const resp = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
          method: 'GET',
          headers: { Authorization: `Basic ${auth}` }
        })
        if (resp.ok) {
          razorpayData = await resp.json()
          const status = (razorpayData?.status || '').toLowerCase()
          const amount = Number(razorpayData?.amount) || 0
          // status should be "captured" for successful payment
          if (status === 'captured' && amount >= requiredAmountPaise) {
            razorpayVerified = true
          }
        }
      } catch (err) {
        console.warn('[VERIFY-BY-ID] Razorpay lookup failed:', err)
      }
    }

    // Determine DB availability
    const databaseUrl = process.env.DATABASE_URL
    const useDatabase = databaseUrl && !databaseUrl.includes('dummy')
    let sql: any = null
    if (useDatabase) {
      try { sql = neon(databaseUrl!) } catch (e) { sql = null }
    }

    // Identify user from session cookie if possible
    let userId: string | null = null
    try {
      const cookieStore = await cookies()
      const sessionToken = cookieStore.get('session_token')?.value
      if (sessionToken && useDatabase && sql) {
        const rows = await sql`
          SELECT u.id FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.session_token = ${sessionToken} LIMIT 1
        `
        if (rows?.length) userId = rows[0].id
      } else if (sessionToken && sessionToken.startsWith('local:')) {
        // local token format: local:email
        const parts = sessionToken.split(':')
        if (parts.length >= 2) userId = parts[1].replace(/[^a-zA-Z0-9]/g, "_")
      }
    } catch (e) {
      // ignore
    }

    // If Razorpay confirmed the payment, persist in DB and mark user as paid
    if (razorpayVerified) {
      try {
        if (useDatabase && sql) {
          // Update payment_orders if orderId provided
          if (orderId) {
            try {
              await sql`UPDATE payment_orders SET status = 'paid', payment_id = ${paymentId} WHERE order_id = ${orderId}`
            } catch (e) { /* ignore */ }
          } else {
            // Try to find payment_orders by payment_id column
            try {
              await sql`UPDATE payment_orders SET status = 'paid' WHERE payment_id = ${paymentId}`
            } catch (e) { /* ignore */ }
          }

          // If we have userId or can find user from payment_orders, mark user as paid
          if (!userId && orderId) {
            try {
              const r = await sql`SELECT user_id FROM payment_orders WHERE order_id = ${orderId} LIMIT 1`
              if (r?.length) userId = r[0].user_id
            } catch (e) {}
          }

          if (userId) {
            if (product === 'top_gainers') {
              await sql`UPDATE users SET is_top_gainer_paid = true WHERE id = ${userId}`
            } else {
              await sql`UPDATE users SET is_prediction_paid = true WHERE id = ${userId}`
            }
            // fetch updated user row to return to client
            try {
              const urows = await sql`SELECT id, email, name, is_top_gainer_paid, is_prediction_paid FROM users WHERE id = ${userId} LIMIT 1`
              if (urows?.length) {
                const u = urows[0]
                return NextResponse.json({ verified: true, payment_id: paymentId, order_id: orderId || null, user: { id: u.id, email: u.email, name: u.name, isTopGainerPaid: u.is_top_gainer_paid, isPredictionPaid: u.is_prediction_paid } })
              }
            } catch (e) {
              // ignore
            }
          }
        }
      } catch (err) {
        console.warn('[VERIFY-BY-ID] DB update error:', err)
      }
      return NextResponse.json({ verified: true, payment_id: paymentId, order_id: orderId || null })
    }

    // If Razorpay couldn't verify but DB exists, check payment_orders status
    if (useDatabase && sql) {
      try {
        let rows: any = []
        if (orderId) {
          rows = await sql`SELECT status, user_id, product_type FROM payment_orders WHERE order_id = ${orderId} LIMIT 1`
        } else {
          rows = await sql`SELECT status, user_id, product_type FROM payment_orders WHERE payment_id = ${paymentId} LIMIT 1`
        }
          if (rows?.length) {
          const status = rows[0].status
          const uid = rows[0].user_id
          const productType = rows[0].product_type || product
          if (status === 'paid') {
            // Ensure user flag is set
            try {
              if (productType === 'top_gainers') {
                await sql`UPDATE users SET is_top_gainer_paid = true WHERE id = ${uid}`
              } else {
                await sql`UPDATE users SET is_prediction_paid = true WHERE id = ${uid}`
              }
            } catch (e) {}
            // fetch updated user to return
            try {
              const urows = await sql`SELECT id, email, name, is_top_gainer_paid, is_prediction_paid FROM users WHERE id = ${uid} LIMIT 1`
              if (urows?.length) {
                const u = urows[0]
                return NextResponse.json({ verified: true, payment_id: paymentId, order_id: orderId || null, user: { id: u.id, email: u.email, name: u.name, isTopGainerPaid: u.is_top_gainer_paid, isPredictionPaid: u.is_prediction_paid } })
              }
            } catch (e) {}
            return NextResponse.json({ verified: true, payment_id: paymentId, order_id: orderId || null })
          }
        }
      } catch (err) {
        console.warn('[VERIFY-BY-ID] DB lookup error:', err)
      }
    }

    // Do NOT auto-accept in test/dev mode. Require either Razorpay confirmation or DB-recorded 'paid' status.
    return NextResponse.json({ verified: false, error: 'Payment not verified' }, { status: 400 })
  } catch (error) {
    console.error('[VERIFY-BY-ID] Error:', error)
    return NextResponse.json({ verified: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
