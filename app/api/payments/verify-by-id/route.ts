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

    const requiredAmountPaise = 20000

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
        const respText = await resp.text().catch(() => '')
        try {
          razorpayData = respText ? JSON.parse(respText) : null
        } catch (e) {
          razorpayData = { raw: respText }
        }
        if (resp.ok && razorpayData) {
          const status = (razorpayData?.status || '').toLowerCase()
          const amount = Number(razorpayData?.amount) || 0
          const allowedStatuses = ['captured']
          if (allowedStatuses.includes(status) && amount >= requiredAmountPaise) {
            razorpayVerified = true
          } else {
            console.warn('[VERIFY-BY-ID] Razorpay returned unexpected status or insufficient amount', { paymentId, status, amount, requiredAmountPaise })
          }
        } else {
          console.warn('[VERIFY-BY-ID] Razorpay lookup failed', { paymentId, status: resp.status })
          razorpayData = razorpayData || { status: resp.status, body: respText }
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
          }
        }
      } catch (e) {
        console.warn('[VERIFY-BY-ID] DB update error:', e)
      }
    }

    return NextResponse.json({
      verified: razorpayVerified,
      payment_id: paymentId,
      order_id: orderId,
      error: razorpayVerified ? null : 'Payment verification failed',
      reason: razorpayVerified ? null : 'razorpay_mismatch',
      razorpay: razorpayData,
      debug: { sessionToken: userId ? 'present' : 'missing' }
    }, { status: razorpayVerified ? 200 : 402 })
  } catch (error) {
    console.error('[VERIFY-BY-ID] Error:', error)
    return NextResponse.json({ verified: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
