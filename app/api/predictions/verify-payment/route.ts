
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const apiMode = searchParams.get('api') === '1' || (request.headers.get && request.headers.get('accept')?.includes('application/json'))
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://hritik.vercel.app';

    // Determine testMode from DATABASE_URL or explicit env var to avoid ReferenceError
    const databaseUrl = process.env.DATABASE_URL || ''
    const testMode = !!(process.env.TEST_MODE === '1' || !databaseUrl || databaseUrl.includes('dummy') || process.env.NODE_ENV !== 'production')

    console.log('[VERIFY-PAYMENT] Starting verification:', { orderId, apiMode, testMode, NODE_ENV: process.env.NODE_ENV })
    
    if (!orderId) {
      console.log('⚠️ [VERIFY-PAYMENT] Missing order_id - refusing to auto-verify');
      if (apiMode) return NextResponse.json({ verified: false, error: 'missing_order' }, { status: 400 });
      return NextResponse.redirect(`${origin}/predictions?error=missing_order&t=${Date.now()}`);
    }

    if (!databaseUrl || databaseUrl.includes('dummy')) {
      console.log('✅ [VERIFY-PAYMENT] No database, assuming test payment is verified');
      if (apiMode) return NextResponse.json({ verified: true, message: 'Test mode - no database' }, { status: 200 });
      return NextResponse.redirect(`${origin}/predictions?success=paid&t=${Date.now()}`);
    }

    const sql = neon(databaseUrl);
    
    // Check payment status
    console.log('[VERIFY-PAYMENT] Checking payment order:', orderId)
    const orderRows = await sql`
      SELECT status, user_id, product_type FROM payment_orders WHERE order_id = ${orderId}
    `;
    
    console.log('[VERIFY-PAYMENT] Order rows result:', orderRows)
    
    if (!orderRows.length) {
      console.log('⚠️ [VERIFY-PAYMENT] Order not found:', orderId);
      if (apiMode) return NextResponse.json({ verified: false, error: 'order_not_found' }, { status: 404 })
      return NextResponse.redirect(`${origin}/predictions?error=order_not_found&t=${Date.now()}`);
    }
    
    const userId = orderRows[0].user_id;
    const productType = orderRows[0].product_type;
    const status = orderRows[0].status;
    
    console.log('[VERIFY-PAYMENT] Order details:', { userId, productType, status, testMode })
    
    // Require an actual 'paid' status in the database (or verification via Razorpay webhook/verify-by-id).
    // This prevents incorrect payment ids from granting access.
    
    if (status !== 'paid') {
      console.log('⚠️ [VERIFY-PAYMENT] Payment not verified for order:', orderId, 'Status:', status);
      if (apiMode) return NextResponse.json({ verified: false, status: status }, { status: 200 })
      const redirectUrl = productType === 'top_gainers' ? '/top-gainers' : '/predictions';
      return NextResponse.redirect(`${origin}${redirectUrl}?error=payment_not_verified&t=${Date.now()}`);
    }

    // Grant access (already handled by webhook, but double-check)
    console.log('✅ [VERIFY-PAYMENT] Payment already marked as paid, granting access')
    if (productType === 'top_gainers') {
      await sql`
        UPDATE users SET is_top_gainer_paid = true WHERE id = ${userId}
      `;
    } else {
      await sql`
        UPDATE users SET is_prediction_paid = true WHERE id = ${userId}
      `;
    }
    
    console.log('✅ [VERIFY-PAYMENT] Payment verified for user:', userId, 'Order:', orderId, 'Product:', productType);
    const redirectUrl = productType === 'top_gainers' ? '/top-gainers' : '/predictions';
    if (apiMode) return NextResponse.json({ verified: true, orderId, userId }, { status: 200 })
    return NextResponse.redirect(`${origin}${redirectUrl}?success=paid&t=${Date.now()}`);
  } catch (error) {
    console.error('❌ [VERIFY-PAYMENT] Error:', error);
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://hritik.vercel.app';
    if (request.headers.get && request.headers.get('accept')?.includes('application/json')) {
      return NextResponse.json({ verified: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }
    return NextResponse.redirect(`${origin}/predictions?error=verify_failed&t=${Date.now()}`);
  }
}

  // Accept POST requests for manual payment_id verification by proxying to /api/payments/verify-by-id
  export async function POST(request: Request) {
    try {
      const body = await request.json().catch(() => ({}))
      const paymentId = body?.payment_id || body?.paymentId || body?.payment_id_input || null
      if (!paymentId) return NextResponse.json({ verified: false, error: 'Missing payment_id' }, { status: 400 })

      // Proxy to centralized payments verify endpoint which performs Razorpay lookup and DB updates.
      const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || `http://localhost:${process.env.PORT || 3000}`
      // Forward incoming cookies so payments/verify-by-id can identify the user session
      const incomingCookie = request.headers.get('cookie') || ''
      // Use an internal relative fetch to call the payments verify endpoint
      // This avoids potential routing differences when calling the same server via an absolute origin URL.
      // Call the internal verification helper directly to avoid HTTP proxying issues
      try {
        const { default: verifyPaymentByIdInternal } = await import('@/app/lib/paymentsVerify')
        const result = await verifyPaymentByIdInternal({ paymentId, orderId: null, product: 'predictions' })
        if (result?.verified) return NextResponse.json({ verified: true, ...result })
        const status = result?.reason === 'razorpay_mismatch' ? 402 : (result?.reason === 'no_record' ? 404 : 400)
        return NextResponse.json({ verified: false, error: result?.error || 'Payment not verified', debug: result }, { status })
      } catch (e) {
        console.error('[PREDICTIONS][VERIFY] helper call error', e)
        return NextResponse.json({ verified: false, error: 'Verification helper error' }, { status: 500 })
      }
    } catch (err) {
      console.error('[PREDICTIONS][VERIFY] POST error', err)
      return NextResponse.json({ verified: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
    }
  }