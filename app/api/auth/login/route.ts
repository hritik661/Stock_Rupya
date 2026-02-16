import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Valid email is required" }, { status: 400 })
    }

    // Create a simple session token and user object
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36)
    const userId = email.replace(/[^a-zA-Z0-9]/g, "_")
    const userName = name || email.split("@")[0]
    const user = {
      email,
      name: userName,
      id: userId,
      balance: 1000000,
    }

    // Try to save to database if configured
    const databaseUrl = process.env.DATABASE_URL
    const useDatabase = databaseUrl && !databaseUrl.includes('dummy')
    
    if (useDatabase) {
      try {
        const sql = neon(databaseUrl!)
        
        // Insert user if doesn't exist
        await sql`
          INSERT INTO users (id, email, name, balance, is_prediction_paid, is_top_gainer_paid, created_at)
          VALUES (${userId}, ${email}, ${userName}, 1000000, false, false, NOW())
          ON CONFLICT (id) DO NOTHING
        `
        console.log('[LOGIN] ✓ User created/exists in database:', userId)
        
        // Create session
        await sql`
          INSERT INTO user_sessions (user_id, session_token, created_at)
          VALUES (${userId}, ${sessionToken}, NOW())
          ON CONFLICT (session_token) DO NOTHING
        `
        console.log('[LOGIN] ✓ Session created:', sessionToken.slice(0, 20))
      } catch (err) {
        console.error('[LOGIN] Database error:', err instanceof Error ? err.message : String(err))
        // Continue anyway - return user and session token for frontend to use
      }
    }

    return NextResponse.json({ success: true, message: "Login successful", user, sessionToken })
  } catch (error) {
    console.error("[v0] Error in login:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Login failed" }, { status: 500 })
  }
}
