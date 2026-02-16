import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function dropTable() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL not set")
    return
  }
  const sql = neon(databaseUrl)
  await sql`DROP TABLE IF EXISTS otp_codes`
  console.log("Dropped otp_codes table")
}

dropTable().catch(console.error)