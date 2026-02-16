import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { email, options } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
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
      // Get user by email (case-insensitive and trim)
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

      // If no options provided, clear them
      if (!options || options.length === 0) {
        await sql`
          DELETE FROM options_transactions WHERE user_id = ${userId}
        `
        return NextResponse.json({
          success: true,
          message: "Options cleared"
        })
      }

      // Save each option (upsert based on id if exists)
      for (const option of options) {
        const optionId = option.id || Math.random().toString(36).substring(7)
        
        await sql`
          INSERT INTO options_transactions (
            user_id, id, symbol, option_type, action, index_name, strike_price, quantity, entry_price, created_at
          ) VALUES (
            ${userId}, ${optionId}, ${option.symbol || ''}, ${option.type || ''}, ${option.action || 'BUY'},
            ${option.index || ''}, ${option.strike || 0}, ${option.quantity || 1}, 
            ${option.price || 0}, ${new Date(option.timestamp || Date.now()).toISOString()}
          )
          ON CONFLICT (id) DO UPDATE SET
            quantity = ${option.quantity || 1},
            entry_price = ${option.price || 0},
            updated_at = NOW()
        `
      }

      return NextResponse.json({
        success: true,
        message: `Saved ${options.length} option(s)`
      })
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({
        success: false,
        error: "Database error: " + (dbError instanceof Error ? dbError.message : String(dbError))
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error saving options:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save options" },
      { status: 500 }
    )
  }
}
