import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, password } = body
    if (!email || !password) return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 })

    const emailLower = email.toLowerCase()
    const useDatabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')
    if (!useDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 })

    const sql = neon(process.env.DATABASE_URL!)

    // Ensure password_hash column exists (non-destructive)
    try {
      await sql.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`) 
    } catch (e) {
      // not fatal
    }

    // Check existing user
    const existing = await sql`SELECT id FROM users WHERE email = ${emailLower}`
    if (existing.length > 0) return NextResponse.json({ success: false, error: "Account already exists" }, { status: 400 })

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')

    const inserted = await sql`
      INSERT INTO users (email, name, balance, is_prediction_paid, created_at, password_hash)
      VALUES (${emailLower}, ${name || emailLower.split('@')[0]}, 1000000, false, NOW(), ${passwordHash})
      RETURNING id, email, name, balance, is_prediction_paid
    `

    const user = inserted[0]
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36)
    try {
      await sql`INSERT INTO user_sessions (user_id, session_token, created_at, last_active) VALUES (${user.id}, ${sessionToken}, NOW(), NOW())`
    } catch (e) {
      console.warn("Failed to create session:", e)
    }

    const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name, balance: Number(user.balance), isPredictionPaid: !!user.is_prediction_paid } })
    
    // Set cookie using both methods to ensure it works on Vercel
    res.cookies.set('session_token', sessionToken, { 
      httpOnly: true, 
      path: '/', 
      sameSite: 'lax', 
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === 'production'
    })
    
    // Also add explicit Set-Cookie header for maximum compatibility
    const secureSuffix = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    const cookieValue = `session_token=${sessionToken}; Path=/; SameSite=Lax; HttpOnly; Max-Age=${60 * 60 * 24 * 30}${secureSuffix}`
    res.headers.append('Set-Cookie', cookieValue)
    
    console.log('[SIGNUP-PASSWORD] ✅ Session token cookie set for user:', user.email)
    return res
  } catch (err) {
    console.error("/api/auth/signup-password error:", err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
