import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { email, symbol, price } = await request.json()

    if (!email || !symbol || price === undefined) {
      return NextResponse.json(
        { success: false, error: "Email, symbol, and price are required" },
        { status: 400 }
      )
    }

    // Check if database is configured
    const databaseUrl = process.env.DATABASE_URL
    const useDatabase = databaseUrl && !databaseUrl.includes('dummy')

    if (!useDatabase || !databaseUrl) {
      return NextResponse.json({
        success: true,
        message: "Database not configured"
      })
    }

    const sql = neon(databaseUrl)
    const normalizedEmail = email.toLowerCase().trim()

    try {
      // Get user by email
      const userResult = await sql`
        SELECT id FROM users WHERE LOWER(TRIM(email)) = ${normalizedEmail}
      `

      if (!userResult || userResult.length === 0) {
        console.log(`No user found for email: ${normalizedEmail}`)
        return NextResponse.json({
          success: false,
          error: "User not found"
        }, { status: 404 })
      }

      const userId = userResult[0].id

      // Store or update last trading price
      await sql`
        INSERT INTO last_trading_prices (user_id, symbol, price, updated_at)
        VALUES (${userId}, ${symbol.toUpperCase()}, ${parseFloat(price.toString())}, NOW())
        ON CONFLICT (user_id, symbol) DO UPDATE SET
          price = ${parseFloat(price.toString())},
          updated_at = NOW()
      `

      return NextResponse.json({
        success: true,
        message: "Price saved successfully"
      })
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({
        success: false,
        error: "Database error: " + (dbError instanceof Error ? dbError.message : String(dbError))
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error saving price:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save price" },
      { status: 500 }
    )
  }
}
