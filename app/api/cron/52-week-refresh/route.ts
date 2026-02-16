import { NextResponse } from "next/server"

/**
 * Daily Cron Job for 52-Week Data Update
 * Runs automatically at 4:00 PM IST (when Indian markets close)
 * 
 * Configured in vercel.json:
 * - Every day at 4 PM IST (10:30 AM UTC)
 * - Refreshes 52-week high/low cache
 */

export async function POST(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization")
    const expectedToken = process.env.CRON_SECRET || "cron-secret-key"

    if (authHeader !== `Bearer ${expectedToken}`) {
      console.warn("[52W CRON] Unauthorized cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[52W CRON] Starting daily 52-week data refresh...")

    // Call the API endpoint to refresh the cache
    const baseUrl = process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000"
    const response = await fetch(`${baseUrl}/api/stock/52-week-data?action=refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh: ${response.statusText}`)
    }

    const result = await response.json()
    console.log("[52W CRON] Refresh successful:", result)

    return NextResponse.json({
      success: true,
      message: "52-week data refreshed successfully",
      timestamp: new Date().toISOString(),
      details: result,
    })
  } catch (error) {
    console.error("[52W CRON] Error:", error)

    return NextResponse.json(
      {
        error: "Failed to refresh 52-week data",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * Optional: GET endpoint for manual trigger and status check
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get("action")

    if (action === "status") {
      // Return status of cron job
      return NextResponse.json({
        status: "operational",
        description: "52-Week High/Low daily cron job",
        schedule: "Every day at 4:00 PM IST (after market close)",
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endpoint: "/api/stock/52-week-data",
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[52W CRON] GET Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
