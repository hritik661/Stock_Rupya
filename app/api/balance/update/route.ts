import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { email, balance } = await request.json()

    if (!email || balance === undefined || balance < 0) {
      return NextResponse.json(
        { success: false, error: "Valid email and balance required" },
        { status: 400 }
      )
    }

    // Check if database is configured
    const useDatabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')

    if (!useDatabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Update balance
    const result = await sql`
      UPDATE users
      SET balance = ${balance}
      WHERE email = ${email.toLowerCase()}
    `

    if (result.count === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Balance updated successfully",
      balance,
    })
  } catch (error) {
    console.error("Error updating balance:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update balance",
      },
      { status: 500 }
    )
  }
}
