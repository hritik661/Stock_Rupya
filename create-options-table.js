import { neon } from "@neondatabase/serverless"

async function createOptionsTable() {
  const sql = neon(process.env.DATABASE_URL || "")

  try {
    console.log("Creating options_transactions table...")

    await sql`
      CREATE TABLE IF NOT EXISTS options_transactions (
        id TEXT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol TEXT NOT NULL,
        option_type TEXT NOT NULL,
        action TEXT NOT NULL,
        index_name TEXT NOT NULL,
        strike_price DECIMAL(10, 2) NOT NULL,
        quantity INTEGER NOT NULL,
        entry_price DECIMAL(10, 4) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_options_user_id ON options_transactions(user_id)
    `

    console.log("✅ options_transactions table created successfully")
  } catch (error) {
    console.error("❌ Error creating options_transactions table:", error)
    process.exit(1)
  }
}

createOptionsTable()
