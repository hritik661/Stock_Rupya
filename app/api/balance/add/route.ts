import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { email, amount, type, symbol, quantity, price } = await request.json()

    if (!email || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid email and amount required" },
        { status: 400 }
      )
    }

    // Check if database is configured
    const useDatabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')

    if (!useDatabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Get current balance
    const userResult = await sql`
      SELECT id, balance FROM users WHERE email = ${email.toLowerCase()}
    `

    if (userResult.length === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const user = userResult[0]
    const currentBalance = parseFloat(user.balance)

    // Add balance
    const newBalance = currentBalance + amount
    await sql`
      UPDATE users
      SET balance = ${newBalance}
      WHERE email = ${email.toLowerCase()}
    `

    // Record transaction
    await sql`
      INSERT INTO transactions (user_id, type, amount, symbol, quantity, price, created_at)
      VALUES (
        ${user.id},
        ${type || "SELL"},
        ${amount},
        ${symbol || "N/A"},
        ${quantity || 0},
        ${price || 0},
        NOW()
      )
    `

    console.log(`[v0] Balance added for ${email}: ₹${amount}, new balance: ₹${newBalance}`)

    return NextResponse.json(
      {
        success: true,
        message: `Transaction successful. ₹${amount} added.`,
        newBalance,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Error adding balance:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process transaction" },
      { status: 500 }
    )
  }
}
