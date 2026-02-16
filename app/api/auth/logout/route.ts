import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 [LOGOUT] Starting logout process...')
    const cookie = request.cookies.get("session_token")
    const token = cookie?.value
    console.log('🔐 [LOGOUT] Token found:', !!token)

    const useDatabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')
    if (useDatabase && token) {
      try {
        console.log('🔐 [LOGOUT] Deleting session from database...')
        const sql = neon(process.env.DATABASE_URL!)
        await sql`DELETE FROM user_sessions WHERE session_token = ${token}`
        console.log('✅ [LOGOUT] Session deleted from database')
      } catch (err) {
        console.warn("🔐 [LOGOUT] Failed to delete session from database:", err)
      }
    }

    console.log('🔐 [LOGOUT] Creating response and clearing cookies...')
    const res = NextResponse.json({ success: true, message: 'Logged out successfully' })
    
    // Clear session cookie
    res.cookies.set('session_token', '', { 
      httpOnly: true, 
      path: '/', 
      maxAge: 0,
      sameSite: 'lax'
    })
    // Clear fallback session_user cookie if present
    res.cookies.set('session_user', '', {
      httpOnly: false,
      path: '/',
      maxAge: 0,
      sameSite: 'lax'
    })
    
    console.log('✅ [LOGOUT] Logout complete, redirecting to home')
    return res
  } catch (err) {
    console.error("🔐 [LOGOUT] Logout error:", err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
