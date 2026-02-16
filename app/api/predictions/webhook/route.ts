import { NextResponse } from "next/server"
import nodemailer from 'nodemailer'
import { neon } from "@neondatabase/serverless"
import crypto from 'crypto'

async function handleWebhook(request: Request) {
  try {
    const bodyText = await request.text()

    // Verify Razorpay signature if webhook secret exists
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (webhookSecret && bodyText) {
      const signature = request.headers.get('x-razorpay-signature') || request.headers.get('X-Razorpay-Signature')
      if (signature && bodyText) {
        try {
          const expected = crypto.createHmac('sha256', webhookSecret).update(bodyText).digest('hex')
          const match = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
          if (!match) return NextResponse.json({ status: 'error', message: 'Invalid signature' }, { status: 400 })
        } catch (e) {
          console.warn('[WEBHOOK] Signature verification skipped:', e)
        }
      }
    }

    let payload: any = {}
    try {
      const formData = await request.formData()
      payload = Object.fromEntries(formData.entries())
    } catch (e) {
      try {
        payload = bodyText ? JSON.parse(bodyText) : {}
      } catch { payload = {} }
    }

    // Normalize fields
    const paymentId = payload.payment_id || payload.razorpay_payment_id || payload?.payload?.payment?.entity?.id || null
    const orderIdReceived = payload.payment_request_id || payload.payment_link_id || payload.order_id || payload?.payload?.payment?.entity?.order_id || null
    const statusRaw = payload.status || (payload?.payload?.payment?.entity?.status) || ''
    const amount = payload.amount || payload?.amount_paid || payload?.payload?.payment?.entity?.amount || null
    const status = String(statusRaw || '').toLowerCase()
    
    console.log('[WEBHOOK] Received webhook - order:', orderIdReceived, 'status:', status, 'payment_id:', paymentId)
    
    if (!status.includes('paid') && status !== 'credit') return NextResponse.json({ status: 'ignored', message: 'Payment not completed.' })

    // Update payment status in database
    const databaseUrl = process.env.DATABASE_URL!
    const sql = neon(databaseUrl)

    // Find user by order id
    const searchOrderId = orderIdReceived
    if (!searchOrderId) return NextResponse.json({ status: 'error', message: 'Order id missing in webhook' })
    const orderRows = await sql`SELECT user_id, product_type FROM payment_orders WHERE order_id = ${searchOrderId}`
    if (!orderRows.length) return NextResponse.json({ status: 'error', message: 'Order not found.' })
    const userId = orderRows[0].user_id
    const productType = orderRows[0].product_type

    // Update the appropriate payment field based on product type
    if (productType === 'top_gainers') {
      await sql`UPDATE users SET is_top_gainer_paid = true WHERE id = ${userId}`
    } else {
      await sql`UPDATE users SET is_prediction_paid = true WHERE id = ${userId}`
    }
    
    await sql`UPDATE payment_orders SET status = 'paid', payment_id = ${paymentId} WHERE order_id = ${searchOrderId}`

    console.log('[WEBHOOK] ✅ Payment processed for user:', userId, 'product:', productType)

    // Optional notification
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })
      const productName = productType === 'top_gainers' ? 'Top Gainers' : 'Predictions'
      await transporter.sendMail({
        from: `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        subject: `${productName} Payment Received`,
        text: `Payment received for ${productName}.\nOrder ID: ${searchOrderId}\nPayment ID: ${paymentId}\nUser ID: ${userId}\nAmount: ${amount}`,
      })
    } catch (e) {}

    return NextResponse.json({ status: 'success', message: 'Payment processed and access granted.' })
  } catch (error: any) {
    console.error('[WEBHOOK] Error:', error)
    return NextResponse.json({ status: 'error', message: error?.message || 'Webhook error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return handleWebhook(request)
}

export async function GET(request: Request) {
  return handleWebhook(request)
}