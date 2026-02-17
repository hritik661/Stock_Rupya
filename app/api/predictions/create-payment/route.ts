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
        SELECT u.id, u.email, u.name, u.is_prediction_paid
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
        user = { id: formattedId, email: userEmail, name: userEmail.split('@')[0], is_prediction_paid: false }
      } else {
        return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 })
      }
    }

    // If user already has access, just return success instead of error
    if (useDatabase && user.is_prediction_paid) {
      console.log('✅ [CREATE-PAYMENT] User already has prediction access:', user.id)
      return NextResponse.json({ 
        message: "You already have access to predictions", 
        alreadyPaid: true,
        redirect: '/predictions'
      }, { status: 200 })
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || ''
    const amountPaise = 20000 // ₹200 = 20000 paise

    // Try to create via Razorpay Payment Links API
    if (keyId && keySecret) {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
      const payload = {
        amount: amountPaise,
        currency: "INR",
        accept_partial: false,
        description: "Unlock Predictions - StockAI",
        customer: { name: user.name || user.email, email: user.email },
        notify: { sms: false, email: true },
        reminder_enable: false,
        callback_url: origin ? `${origin}/api/predictions/webhook` : undefined,
        callback_method: "post"
      }

      try {
        const resp = await fetch("https://api.razorpay.com/v1/payment_links", {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
        if (resp.ok) {
          const data = await resp.json() as any
          const linkId = data.id || data.link_id || data.payment_link_id || `rzp_${Date.now()}`
          const shortUrl = data.short_url || data.short_link || data.url
          // Also create a Razorpay Order so the frontend can optionally
          // open the Checkout modal (in-page) which provides a close button
          // on mobile devices. Creating an Order is safe and lightweight.
          let razorpayOrderId: string | null = null
          try {
            const orderResp = await fetch("https://api.razorpay.com/v1/orders", {
              method: "POST",
              headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: amountPaise,
                currency: 'INR',
                receipt: linkId,
                payment_capture: 1
              })
            })
            if (orderResp.ok) {
              const orderData = await orderResp.json() as any
              razorpayOrderId = orderData.id
            } else {
              console.warn('[CREATE-PAYMENT] Razorpay order creation failed', await orderResp.text())
            }
          } catch (e) {
            console.warn('[CREATE-PAYMENT] Razorpay order creation error', e)
          }
          if (useDatabase && sql) {
            try {
              await sql`
                INSERT INTO payment_orders (order_id, user_id, amount, currency, status, payment_gateway, product_type, created_at)
                VALUES (${linkId}, ${user.id}, ${amountPaise/100}, 'INR', 'created', 'razorpay', 'predictions', NOW())
                ON CONFLICT (order_id) DO NOTHING
              `
            } catch (e) {
              console.warn('[CREATE-PAYMENT] DB persist error:', e)
            }
          }
          // Return both the payment link and (when available) the Checkout order
          return NextResponse.json({ orderId: linkId, paymentLink: shortUrl || data.long_url, razorpayOrderId, keyId, amount: amountPaise })
        }
      } catch (err) {
        console.warn('[CREATE-PAYMENT] Razorpay API error:', err)
        // fall through to test link
      }
    }

    // For development/test: Create a test payment order
    console.log('💰 [CREATE-PAYMENT] TEST/DEV MODE: Using test payment link')
    const testLinkId = `aplink_test_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const testLink = process.env.RAZORPAY_TEST_LINK || process.env.NEXT_PUBLIC_RAZORPAY_TEST_LINK || 'https://rzp.io/rzp/9NJNueG'
    
    if (useDatabase && sql) {
      try {
        // Insert payment order with CREATED status (NOT paid yet)
        await sql`
          INSERT INTO payment_orders (order_id, user_id, amount, currency, status, payment_gateway, product_type, created_at)
          VALUES (${testLinkId}, ${user.id}, ${amountPaise/100}, 'INR', 'created', 'razorpay', 'predictions', NOW())
          ON CONFLICT (order_id) DO NOTHING
        `
        console.log('✅ [CREATE-PAYMENT] Test payment order created:', testLinkId, 'for user:', user.id)
      } catch (err) {
        console.warn('[CREATE-PAYMENT] DB error:', err)
      }
    }
    
    console.log('✅ [CREATE-PAYMENT] Returning test payment link for user:', user.id, 'Order ID:', testLinkId)
    return NextResponse.json({ orderId: testLinkId, paymentLink: testLink })

  } catch (error) {
    console.error('[CREATE-PAYMENT] Error:', error)
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}