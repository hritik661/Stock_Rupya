import { NextResponse } from "next/server"

// Payment gateway has been disabled per user request. This endpoint intentionally
// returns 410 Gone to indicate the entitlement API is no longer available.
export async function POST() {
  return NextResponse.json({ error: "Entitlement API disabled" }, { status: 410 })
}
