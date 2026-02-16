import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    const emailLower = email.toLowerCase()

    // Check if database is configured and not dummy
    const useDatabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')

    if (useDatabase) {
      try {
        const sql = neon(process.env.DATABASE_URL!)
        // Get user balance from database
        const result = await sql`
          SELECT id, email, name, balance, is_prediction_paid, created_at, last_login
          FROM users
          WHERE email = ${emailLower}
        `

        if (result.length === 0) {
          return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
        }

        const user = result[0]

        // Update last login
        await sql`
          UPDATE users
          SET last_login = NOW()
          WHERE email = ${emailLower}
        `

        // Track active user
        await sql`
          INSERT INTO active_users (email, last_active)
          VALUES (${emailLower}, NOW())
          ON CONFLICT (email) DO UPDATE
          SET last_active = NOW()
        `

        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            balance: parseFloat(user.balance),
            isPredictionPaid: user.is_prediction_paid,
            createdAt: user.created_at,
            lastLogin: user.last_login,
          },
        })
      } catch (dbError) {
        console.warn("[v0] Database error in balance/get, falling back to default:", dbError)
      }
    }

    // Fallback to default user data
    return NextResponse.json({
      success: true,
      user: {
        id: emailLower,
        email: emailLower,
        name: emailLower.split("@")[0],
        balance: 1000000,
        isPredictionPaid: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error getting balance:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get balance",
      },
      { status: 500 }
    )
  }
}
