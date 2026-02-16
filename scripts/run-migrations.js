import { neon } from "@neondatabase/serverless"
import fs from "fs"
import path from "path"
import dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function runMigrations() {
  try {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      console.error("DATABASE_URL not found in environment variables")
      console.error("Current DATABASE_URL:", databaseUrl)
      process.exit(1)
    }

    console.log("Connecting to database...")
    console.log("Database URL:", databaseUrl.substring(0, 50) + "...")
    const sql = neon(databaseUrl)

    console.log("Reading SQL file...")
    const sqlFile = path.join(process.cwd(), "scripts", "create-user-tables.sql")
    const sqlContent = fs.readFileSync(sqlFile, "utf-8")

    console.log("Executing SQL...")
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => {
        // Remove comment lines from each statement
        return s.split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim()
      })
      .filter(s => s.length > 0)

    for (const statement of statements) {
      if (statement.trim()) {
        console.log("Executing:", statement.substring(0, 50) + "...")
        await sql.unsafe(statement)
      }
    }

    console.log("✅ Database tables created successfully!")
  } catch (error) {
    console.error("❌ Error creating tables:", error)
    process.exit(1)
  }
}

runMigrations()