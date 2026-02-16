import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { email, symbols } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      )
    }

    // Check if database is configured
    const databaseUrl = process.env.DATABASE_URL
    const useDatabase = databaseUrl && !databaseUrl.includes('dummy')

    if (!useDatabase || !databaseUrl) {
      return NextResponse.json({
        success: true,
        prices: {}
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
          success: true,
          prices: {}
        })
      }

      const userId = userResult[0].id

      // Get prices for user
      let pricesResult
      if (symbols && Array.isArray(symbols) && symbols.length > 0) {
        // Get prices for specific symbols
        const symbolUpper = symbols.map((s: string) => s.toUpperCase())
        pricesResult = await sql`
          SELECT symbol, price FROM last_trading_prices
          WHERE user_id = ${userId} AND symbol = ANY(${symbolUpper}::text[])
        `
      } else {
        // Get all prices for user
        pricesResult = await sql`
          SELECT symbol, price FROM last_trading_prices
          WHERE user_id = ${userId}
        `
      }

      // Convert to key-value object
      const prices: Record<string, number> = {}
      pricesResult.forEach((row: any) => {
        prices[row.symbol] = parseFloat(row.price.toString())
      })

      return NextResponse.json({
        success: true,
        prices
      })
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({
        success: true,
        prices: {}
      })
    }
  } catch (error) {
    console.error("Error loading prices:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load prices" },
      { status: 500 }
    )
  }
}
