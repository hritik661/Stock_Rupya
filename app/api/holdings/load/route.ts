import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    // Check if database is configured
    const useDatabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')

    if (!useDatabase) {
      return NextResponse.json({
        success: true,
        holdings: []
      })
    }

    const sql = neon(process.env.DATABASE_URL)
    const normalizedEmail = email.toLowerCase().trim()

    try {
      // Get user by email (case-insensitive and trim)
      const userResult = await sql`
        SELECT id FROM users WHERE LOWER(TRIM(email)) = ${normalizedEmail}
      `

      if (!userResult || userResult.length === 0) {
        console.log(`No user found for email: ${normalizedEmail}`)
        return NextResponse.json({
          success: true,
          holdings: []
        })
      }

      const userId = userResult[0].id

      // Get user holdings ordered by most recent first
      const holdingsResult = await sql`
        SELECT symbol, name, quantity, avg_price
        FROM holdings
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
      `

      const holdings = holdingsResult.map(h => ({
        symbol: h.symbol,
        name: h.name || '',
        quantity: parseInt(h.quantity.toString()),
        avgPrice: parseFloat(h.avg_price.toString())
      }))

      return NextResponse.json({
        success: true,
        holdings
      })
    } catch (dbError) {
      console.error("Database query error:", dbError)
      throw dbError
    }
  } catch (error) {
    console.error("Error loading holdings:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load holdings",
      },
      { status: 500 }
    )
  }
}