
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const apiMode = searchParams.get('api') === '1' || (request.headers.get && request.headers.get('accept')?.includes('application/json'))
    const testMode = searchParams.get('test') === 'true' || process.env.NODE_ENV !== 'production';
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://hritik.vercel.app';
    
    console.log('[VERIFY-PAYMENT] Starting verification:', { orderId, apiMode, testMode, NODE_ENV: process.env.NODE_ENV })
    
    if (!orderId) {
      console.log('✅ [VERIFY-PAYMENT] Missing order_id, using test mode');
      if (apiMode) return NextResponse.json({ verified: testMode, message: 'Test mode' }, { status: 200 });
      return NextResponse.redirect(`${origin}/predictions?error=missing_order&t=${Date.now()}`);
    }

    const databaseUrl = process.env.DATABASE_URL;
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
    
    // In test mode, automatically mark as paid (simulating payment processing)
    if (testMode && status === 'created') {
      console.log('✅ [VERIFY-PAYMENT] TEST MODE: Marking order as paid:', orderId);
      try {
        await sql`UPDATE payment_orders SET status = 'paid' WHERE order_id = ${orderId}`;
        console.log('✅ [VERIFY-PAYMENT] Updated payment_orders status to paid')
        
        if (productType === 'top_gainers') {
          const updateResult = await sql`UPDATE users SET is_top_gainer_paid = true WHERE id = ${userId}`;
          console.log('✅ [VERIFY-PAYMENT] Updated is_top_gainer_paid:', updateResult)
        } else {
          const updateResult = await sql`UPDATE users SET is_prediction_paid = true WHERE id = ${userId}`;
          console.log('✅ [VERIFY-PAYMENT] Updated is_prediction_paid:', updateResult)
        }
        
        console.log('✅ [VERIFY-PAYMENT] User marked as paid in test mode:', userId);
        const redirectUrl = productType === 'top_gainers' ? '/top-gainers' : '/predictions';
        if (apiMode) return NextResponse.json({ verified: true, message: 'Test mode - marked as paid' }, { status: 200 });
        return NextResponse.redirect(`${origin}${redirectUrl}?success=paid&t=${Date.now()}`);
      } catch (err) {
        console.error('[VERIFY-PAYMENT] Error marking as paid in test mode:', err);
        if (apiMode) return NextResponse.json({ verified: false, error: 'Error marking as paid', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
      }
    }
    
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