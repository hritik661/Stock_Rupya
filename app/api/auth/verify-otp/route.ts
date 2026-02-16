import { type NextRequest, NextResponse } from "next/server"
import { verifyAndDeleteOTP } from "@/lib/otp-store"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const emailRaw = body.email
    const otpRaw = body.otp
    
    const email = emailRaw.toLowerCase().trim()
    const otp = otpRaw.toString().trim()

    console.log("[OTP-VERIFY] Raw input - email:", emailRaw, "otp:", otpRaw)
    console.log("[OTP-VERIFY] Normalized - email:", email, "otp:", otp)

    if (!email || !otp) {
      console.log("[OTP-VERIFY] ❌ Missing email or OTP")
      return NextResponse.json({ success: false, error: "Email and OTP are required" }, { status: 400 })
    }

    // Development/test overrides
    if (process.env.NODE_ENV !== "production") {
      if (process.env.ALLOW_ANY_OTP === "true") {
        console.warn('[OTP-VERIFY] 🔓 Development override: ALLOW_ANY_OTP is enabled — accepting any OTP')
      } else if (process.env.MASTER_OTP && otp === process.env.MASTER_OTP) {
        console.warn('[OTP-VERIFY] 🔓 Development override: MASTER_OTP matched — accepting OTP')
      } else {
        const verification = await verifyAndDeleteOTP(email, otp)
        if (!verification.valid) {
          console.log("[OTP-VERIFY] ❌ OTP verification failed:", verification.reason)
          return NextResponse.json({ success: false, error: verification.reason }, { status: 400 })
        }
      }
    } else {
      const verification = await verifyAndDeleteOTP(email, otp)
      if (!verification.valid) {
        console.log("[OTP-VERIFY] ❌ OTP verification failed:", verification.reason)
        return NextResponse.json({ success: false, error: verification.reason }, { status: 400 })
      }
    }

    console.log("[OTP-VERIFY] ✅ OTP verified successfully for:", email)

    const emailLower = email.toLowerCase()
    let userId: string
    let userBalance: number = 1000000 // Default balance
    let isNewUser: boolean = false

    // Check if database is configured and not dummy
    const useDatabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')

    if (useDatabase) {
      try {
        const sql = neon(process.env.DATABASE_URL!)
        // Check if user exists in database
        const existingUser = await sql`SELECT id, balance FROM users WHERE email = ${emailLower}`

        if (existingUser.length === 0) {
          // Create new user with starting balance
          const newUserResult = await sql`
            INSERT INTO users (email, name, balance, is_prediction_paid, created_at)
            VALUES (${emailLower}, ${email.split("@")[0]}, 1000000, false, NOW())
            RETURNING id, balance
          `
          userId = newUserResult[0].id
          userBalance = newUserResult[0].balance
          isNewUser = true
          console.log("[OTP-VERIFY] ✅ New user created:", emailLower, "with balance: ₹1000000")
        } else {
          // User exists, get their current balance
          userId = existingUser[0].id
          userBalance = existingUser[0].balance
          console.log("[OTP-VERIFY] ✅ Existing user logged in:", emailLower, "balance: ₹" + userBalance)
        }
      } catch (dbError) {
        console.warn("[OTP-VERIFY] ⚠️ Database error, falling back to localStorage:", dbError)
        userId = emailLower // Use email as ID for local
        isNewUser = true // Assume new if database error
      }
    } else {
      // Use localStorage logic
      userId = emailLower
      isNewUser = true // For localStorage, always treat as new for now
      console.log("[OTP-VERIFY] 📝 Using localStorage for user:", emailLower, "balance: ₹1000000")
    }

    // Create session token
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36)

    // Store session in database if using database
    if (useDatabase) {
      try {
        const sql = neon(process.env.DATABASE_URL!)
        await sql`
          INSERT INTO user_sessions (user_id, session_token, created_at, last_active)
          VALUES (${userId}, ${sessionToken}, NOW(), NOW())
        `
        console.log("[OTP-VERIFY] ✅ Session created in database for user:", userId)
      } catch (dbError) {
        console.warn("[OTP-VERIFY] ⚠️ Failed to create database session:", dbError)
      }
    }

    // Set session_token cookie for authentication
    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: {
        email: emailLower,
        id: userId,
        balance: userBalance,
      },
      sessionToken,
      isNewUser,
    })
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === 'production'
    })    
    // Also add explicit Set-Cookie header for maximum compatibility on Vercel
    const secureSuffix = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    const cookieValue = `session_token=${sessionToken}; Path=/; SameSite=Lax; HttpOnly; Max-Age=${60 * 60 * 24 * 30}${secureSuffix}`
    response.headers.append('Set-Cookie', cookieValue)    // If database isn't configured (local/dev fallback), also set a readable session_user cookie
    // so the client can persist a lightweight user object across refreshes.
    if (!useDatabase) {
      try {
        const sessUser = JSON.stringify({ id: userId, email: emailLower, balance: userBalance })
        response.cookies.set('session_user', sessUser, {
          httpOnly: false,
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          secure: process.env.NODE_ENV === 'production'
        })
      } catch (e) {
        console.warn('[OTP-VERIFY] ⚠️ Failed to set session_user cookie fallback:', e)
      }
    }
    console.log('[OTP-VERIFY] ✅ Session token cookie set, expires in 30 days')
    return response
  } catch (error) {
    console.error("[OTP-VERIFY] ❌ Error in verify-otp:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to verify OTP",
      },
      { status: 500 },
    )
  }
}
