import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { email, holdings } = await request.json()

    if (!email || !Array.isArray(holdings)) {
      return NextResponse.json(
        { success: false, error: "Valid email and holdings array required" },
        { status: 400 }
      )
    }

    // Check if database is configured
    const useDatabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')

    if (!useDatabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL)
    const normalizedEmail = email.toLowerCase().trim()

    // Get user ID with case-insensitive email lookup
    const userResult = await sql`
      SELECT id FROM users WHERE LOWER(TRIM(email)) = ${normalizedEmail}
    `

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const userId = userResult[0].id

    // Delete existing holdings for this user
    await sql`
      DELETE FROM holdings WHERE user_id = ${userId}
    `

    // Insert new holdings with current timestamp
    if (holdings.length > 0) {
      for (const holding of holdings) {
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
      }
    }

    return NextResponse.json({ success: true, holdingsCount: holdings.length })
  } catch (error) {
    console.error("Error saving holdings:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save holdings",
      },
      { status: 500 }
    )
  }
}