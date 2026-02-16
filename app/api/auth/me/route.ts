import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get("session_token")
    const token = cookie?.value
    if (!token) {
      // Try fallback: when no DB is configured we may have set a readable cookie named `session_user`
      const sess = request.cookies.get('session_user')
      if (sess?.value) {
        try {
          const parsed = JSON.parse(sess.value)
          const response = NextResponse.json({ success: true, user: { id: parsed.id, email: parsed.email, name: parsed.name || parsed.email?.split?.('@')?.[0], balance: Number(parsed.balance || 0), isPredictionPaid: !!parsed.isPredictionPaid, isTopGainerPaid: !!parsed.isTopGainerPaid } })
          response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
          response.headers.set('Pragma', 'no-cache')
          response.headers.set('Expires', '0')
          return response
        } catch (e) {
          // fall through to unauthorized
        }
      }
      return NextResponse.json({ success: false }, { status: 401 })
    }

    const useDatabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')
    if (!useDatabase) return NextResponse.json({ success: false }, { status: 401 })

    const sql = neon(process.env.DATABASE_URL!)
    
    let rows: any[] = []
    let hasTopGainerColumn = true
    
    // Try with is_top_gainer_paid column first
    try {
      rows = await sql`
        SELECT u.id, u.email, u.name, u.balance, u.is_prediction_paid, u.is_top_gainer_paid
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.session_token = ${token}
        LIMIT 1
      `
      console.log('[AUTH-ME] Query successful with is_top_gainer_paid column')
    } catch (columnError: any) {
      // If is_top_gainer_paid column doesn't exist, query without it
      if (columnError?.message?.includes('is_top_gainer_paid') || columnError?.message?.includes('does not exist')) {
        console.warn('[AUTH-ME] Column is_top_gainer_paid does not exist, querying without it')
        hasTopGainerColumn = false
        rows = await sql`
          SELECT u.id, u.email, u.name, u.balance, u.is_prediction_paid
          FROM user_sessions s
          JOIN users u ON u.id = s.user_id
          WHERE s.session_token = ${token}
          LIMIT 1
        `
      } else {
        throw columnError
      }
    }

    if (!rows || rows.length === 0) return NextResponse.json({ success: false }, { status: 401 })

    const u = rows[0]
    const isTopGainerPaid = hasTopGainerColumn ? !!u.is_top_gainer_paid : false
    
    console.log('[AUTH-ME] User:', { id: u.id, email: u.email, isPredictionPaid: !!u.is_prediction_paid, isTopGainerPaid })
    
    const response = NextResponse.json({ 
      success: true, 
      user: { 
        id: u.id, 
        email: u.email, 
        name: u.name, 
        balance: Number(u.balance || 0), 
        isPredictionPaid: !!u.is_prediction_paid, 
        isTopGainerPaid: isTopGainerPaid
      } 
    })
    
    // CRITICAL: Force no-cache to always get fresh data from DB
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (err) {
    console.error("/api/auth/me error:", err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
