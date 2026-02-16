import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('dummy')) {
      return NextResponse.json({
        totalUsers: 0,
        activeUsers: 0,
        totalBalance: 0,
        averageBalance: 0
      })
    }

    const sql = neon(process.env.DATABASE_URL)
    // Get total users
    const totalUsersResult = await sql`SELECT COUNT(*) as count FROM users`
    const totalUsers = totalUsersResult[0].count

    // Get active users (last 24 hours)
    const activeUsersResult = await sql`
      SELECT COUNT(*) as count
      FROM active_users
      WHERE last_active > NOW() - INTERVAL '24 hours'
    `
    const activeUsers = activeUsersResult[0].count

    // Get total balance across all users
    const totalBalanceResult = await sql`SELECT SUM(balance) as total FROM users`
    const totalBalance = totalBalanceResult[0].total || 0

    // Get transaction count
    const transactionCountResult = await sql`SELECT COUNT(*) as count FROM transactions`
    const transactionCount = transactionCountResult[0].count

    return NextResponse.json(
      {
        success: true,
        analytics: {
          totalUsers: parseInt(totalUsers),
          activeUsers: parseInt(activeUsers),
          totalBalance: parseFloat(totalBalance),
          totalTransactions: parseInt(transactionCount),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Error getting analytics:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get analytics" },
      { status: 500 }
    )
  }
}
