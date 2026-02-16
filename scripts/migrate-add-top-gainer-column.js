// Run this to add the is_top_gainer_paid column to your Postgres database
// Command: node scripts/migrate-add-top-gainer-column.js

const { neon } = require("@neondatabase/serverless");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function migrate() {
  try {
    const sql = neon(DATABASE_URL);
    
    console.log("🔄 Checking if is_top_gainer_paid column exists...");
    
    // Try to add the column if it doesn't exist
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_top_gainer_paid BOOLEAN DEFAULT false;
    `;
    
    console.log("✅ Column is_top_gainer_paid added successfully (or already exists)");
    
    // Verify the column exists
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_top_gainer_paid';
    `;
    
    if (result.length > 0) {
      console.log("✅ Verified: is_top_gainer_paid column exists in users table");
    } else {
      console.log("⚠️ Column verification failed, but migration completed without error");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
}

migrate();
