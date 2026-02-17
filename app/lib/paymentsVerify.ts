import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"

export async function verifyPaymentByIdInternal({ paymentId, orderId = null, product = 'predictions' }:{paymentId:string, orderId?:string|null, product?:string}) {
  try {
    const requiredAmountPaise = product === 'top_gainers' ? 20000 : 20000

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

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
        try { razorpayData = respText ? JSON.parse(respText) : null } catch (e) { razorpayData = { raw: respText } }
        if (resp.ok && razorpayData) {
          const status = (razorpayData?.status || '').toLowerCase()
          const amount = Number(razorpayData?.amount) || 0
          const allowedStatuses = ['captured']
          if (allowedStatuses.includes(status) && amount >= requiredAmountPaise) {
            razorpayVerified = true
          }
        }
      } catch (err) {
        // ignore
      }
    }

    const databaseUrl = process.env.DATABASE_URL
    const useDatabase = databaseUrl && !databaseUrl.includes('dummy')
    let sql: any = null
    if (useDatabase) {
      try { sql = neon(databaseUrl!) } catch (e) { sql = null }
    }

    // identify user from cookies
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
    } catch (e) { /* ignore */ }

    if (razorpayVerified) {
      try {
        if (useDatabase && sql) {
          if (orderId) {
            try { await sql`UPDATE payment_orders SET status = 'paid', payment_id = ${paymentId} WHERE order_id = ${orderId}` } catch (e) {}
          } else {
            try { await sql`UPDATE payment_orders SET status = 'paid' WHERE payment_id = ${paymentId}` } catch (e) {}
          }

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
            try {
              const urows = await sql`SELECT id, email, name, is_top_gainer_paid, is_prediction_paid FROM users WHERE id = ${userId} LIMIT 1`
              if (urows?.length) {
                const u = urows[0]
                return { verified: true, payment_id: paymentId, order_id: orderId || null, user: { id: u.id, email: u.email, name: u.name, isTopGainerPaid: u.is_top_gainer_paid, isPredictionPaid: u.is_prediction_paid } }
              }
            } catch (e) { }
          }
        }
      } catch (err) { }
      return { verified: true, payment_id: paymentId, order_id: orderId || null }
    }

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
            try {
              if (productType === 'top_gainers') await sql`UPDATE users SET is_top_gainer_paid = true WHERE id = ${uid}`
              else await sql`UPDATE users SET is_prediction_paid = true WHERE id = ${uid}`
            } catch (e) {}
            try {
              const urows = await sql`SELECT id, email, name, is_top_gainer_paid, is_prediction_paid FROM users WHERE id = ${uid} LIMIT 1`
              if (urows?.length) {
                const u = urows[0]
                return { verified: true, payment_id: paymentId, order_id: orderId || null, user: { id: u.id, email: u.email, name: u.name, isTopGainerPaid: u.is_top_gainer_paid, isPredictionPaid: u.is_prediction_paid } }
              }
            } catch (e) {}
            return { verified: true, payment_id: paymentId, order_id: orderId || null }
          }
        }
      } catch (err) { }
    }

    const debug: any = { razorpay: razorpayData || null, sessionToken: null }
    try { const cs = await cookies(); debug.sessionToken = cs.get('session_token')?.value || null } catch(e){}
    if (razorpayData && !razorpayVerified) {
      const status = razorpayData?.status || null
      const amount = Number(razorpayData?.amount) || null
      return { verified: false, error: 'Payment not verified', reason: 'razorpay_mismatch', razorpay: { status, amount }, debug }
    }
    return { verified: false, error: 'Payment not verified', reason: 'no_record', debug }
  } catch (error) {
    return { verified: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export default verifyPaymentByIdInternal
