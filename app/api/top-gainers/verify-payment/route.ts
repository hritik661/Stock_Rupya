import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import verifyPaymentByIdInternal from "@/app/lib/paymentsVerify"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const api = searchParams.get('api') === '1';
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://hritik.vercel.app';

    const databaseUrl = process.env.DATABASE_URL || ''
    const testMode = !!(process.env.TEST_MODE === '1' || !databaseUrl || databaseUrl.includes('dummy') || process.env.NODE_ENV !== 'production')

    console.log('[VERIFY-PAYMENT] Starting verification:', { orderId, testMode, api, NODE_ENV: process.env.NODE_ENV })
    
    if (!orderId) {
      console.log('⚠️ [VERIFY-PAYMENT] Missing order_id - refusing to auto-verify');
      if (api) {
        return NextResponse.json({ verified: false, error: 'missing_order' }, { status: 400 });
      }
      return NextResponse.redirect(`${origin}/top-gainers?error=missing_order&t=${Date.now()}`);
    }

    if (!databaseUrl || databaseUrl.includes('dummy')) {
      console.log('✅ [VERIFY-PAYMENT] No database, assuming test payment is verified');
      if (api) {
        return NextResponse.json({ verified: true, message: 'Test mode - no database' });
      }
      return NextResponse.redirect(`${origin}/top-gainers?success=paid&t=${Date.now()}`);
    }

    const sql = neon(databaseUrl);
    // Check payment status
    console.log('[VERIFY-PAYMENT] Checking payment order:', orderId)
    const orderRows = await sql`
      SELECT status, user_id FROM payment_orders WHERE order_id = ${orderId}
    `;
    
    console.log('[VERIFY-PAYMENT] Order rows result:', orderRows)
    
    if (!orderRows.length) {
      console.log('⚠️ [VERIFY-PAYMENT] Order not found:', orderId);
      if (api) {
        return NextResponse.json({ verified: false, message: 'Order not found' }, { status: 404 });
      }
      return NextResponse.redirect(`${origin}/top-gainers?error=order_not_found&t=${Date.now()}`);
    }
    
    const userId = orderRows[0].user_id;
    const status = orderRows[0].status;
    
    console.log('[VERIFY-PAYMENT] Order details:', { userId, status, testMode })
    
    // Require explicit 'paid' status in DB or Razorpay verification via POST/signature.
    
    if (status !== 'paid') {
      console.log('⚠️ [VERIFY-PAYMENT] Payment not verified for order:', orderId, 'Status:', status);
      if (api) {
        return NextResponse.json({ verified: false, message: 'Payment not verified' }, { status: 402 });
      }
      return NextResponse.redirect(`${origin}/top-gainers?error=payment_not_verified&t=${Date.now()}`);
    }

    // Grant access (already handled by webhook, but double-check)
    console.log('✅ [VERIFY-PAYMENT] Payment verified for user:', userId, 'Order:', orderId);
    if (api) {
      return NextResponse.json({ verified: true, message: 'Payment verified' });
    }
    return NextResponse.redirect(`${origin}/top-gainers?success=paid&t=${Date.now()}`);
  } catch (error) {
    console.error('❌ [VERIFY-PAYMENT] Error:', error);
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://hritik.vercel.app';
    if (request.url.includes('api=1')) {
      return NextResponse.json({ verified: false, message: 'Error verifying payment' });
    }
    return NextResponse.redirect(`${origin}/top-gainers?error=verify_failed&t=${Date.now()}`);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const paymentId = body?.payment_id || body?.paymentId || body?.payment_id_input || null
    if (!paymentId) return NextResponse.json({ verified: false, error: 'Missing payment_id' }, { status: 400 })

    const result = await verifyPaymentByIdInternal({ paymentId, orderId: null, product: 'top_gainers' })
    if (result?.verified) return NextResponse.json(result, { status: 200 })
    const status = result?.reason === 'razorpay_mismatch' ? 402 : (result?.reason === 'no_record' ? 404 : 400)
    return NextResponse.json(result, { status })
  } catch (err) {
    console.error('[TOP-GAINERS][VERIFY] POST error', err)
    return NextResponse.json({ verified: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
