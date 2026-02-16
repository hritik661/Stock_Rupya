import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

/**
 * Sync holdings endpoint - ensures portfolio is synchronized between database and client
 * This is called when user logs in on any device
 */
export async function POST(request: NextRequest) {
  try {
    const { email, holdings: clientHoldings } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    const useDatabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')

    if (!useDatabase) {
      return NextResponse.json({
        success: true,
        holdings: clientHoldings || [],
        source: "client"
      })
    }

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json({
        success: true,
        holdings: clientHoldings || [],
        source: "client"
      })
    }

    const sql = neon(databaseUrl)
    const normalizedEmail = email.toLowerCase().trim()

    try {
      // Get user
      const userResult = await sql`
        SELECT id FROM users WHERE LOWER(TRIM(email)) = ${normalizedEmail}
      `

      if (!userResult || userResult.length === 0) {
        return NextResponse.json({
          success: true,
          holdings: clientHoldings || [],
          source: "client"
        })
      }

      const userId = userResult[0].id

      // Get holdings from database
      const dbHoldings = await sql`
        SELECT symbol, name, quantity, avg_price, updated_at
        FROM holdings
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
      `

      const formattedDbHoldings = dbHoldings.map(h => ({
        symbol: h.symbol,
        name: h.name || '',
        quantity: parseInt(h.quantity.toString()),
        avgPrice: parseFloat(h.avg_price.toString()),
        timestamp: new Date(h.updated_at).getTime()
      }))

      // If we have client holdings and no database holdings, save them to database
      if (clientHoldings && clientHoldings.length > 0 && formattedDbHoldings.length === 0) {
        for (const holding of clientHoldings) {
          try {
            await sql`
              INSERT INTO holdings (user_id, symbol, name, quantity, avg_price, created_at, updated_at)
              VALUES (
                ${userId},
                ${holding.symbol},
                ${holding.name || ''},
                ${holding.quantity},
                ${holding.avgPrice},
                NOW(),
                NOW()
              )
              ON CONFLICT (user_id, symbol) DO UPDATE SET
                quantity = ${holding.quantity},
                avg_price = ${holding.avgPrice},
                updated_at = NOW()
            `
          } catch (e) {
            console.warn(`Failed to sync holding ${holding.symbol}:`, e)
          }
        }

        return NextResponse.json({
          success: true,
          holdings: clientHoldings,
          source: "client_synced_to_db"
        })
      }

      // Return database holdings as source of truth
      return NextResponse.json({
        success: true,
        holdings: formattedDbHoldings,
        source: "database"
      })
    } catch (dbError) {
      console.error("Sync database error:", dbError)
      // Fall back to client holdings if database fails
      return NextResponse.json({
        success: true,
        holdings: clientHoldings || [],
        source: "client_fallback",
        dbError: dbError instanceof Error ? dbError.message : "Unknown error"
      })
    }
  } catch (error) {
    console.error("Error syncing holdings:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync holdings",
      },
      { status: 500 }
    )
  }
}
