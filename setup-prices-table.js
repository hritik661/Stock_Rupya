#!/usr/bin/env node

/**
 * Setup script to create the last_trading_prices table
 * Run this to initialize the database for price persistence
 * 
 * Usage:
 *   node setup-prices-table.js
 * 
 * This script will:
 * 1. Connect to your PostgreSQL database
 * 2. Create the last_trading_prices table if it doesn't exist
 * 3. Create necessary indexes for performance
 */

require("dotenv").config({ path: ".env.local" });
const { neon } = require("@neondatabase/serverless");

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error("❌ Error: DATABASE_URL environment variable is not set");
  console.error("Please set DATABASE_URL in your .env.local file");
  process.exit(1);
}

async function setupPricesTable() {
  const sql = neon(DB_URL);

  try {
    console.log("📦 Setting up last_trading_prices table...");

    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS last_trading_prices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol VARCHAR(50) NOT NULL,
        price NUMERIC(20, 2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(user_id, symbol)
      )
    `;

    console.log("✅ Table created: last_trading_prices");

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_last_trading_prices_user_id 
        ON last_trading_prices(user_id)
    `;
    console.log("✅ Index created: idx_last_trading_prices_user_id");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_last_trading_prices_symbol 
        ON last_trading_prices(symbol)
    `;
    console.log("✅ Index created: idx_last_trading_prices_symbol");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_last_trading_prices_user_symbol
        ON last_trading_prices(user_id, symbol)
    `;
    console.log("✅ Index created: idx_last_trading_prices_user_symbol");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_last_trading_prices_updated_at 
        ON last_trading_prices(updated_at)
    `;
    console.log("✅ Index created: idx_last_trading_prices_updated_at");

    console.log("\n✨ Setup complete!");
    console.log("\nNow you have:");
    console.log("✅ last_trading_prices table - stores last trading price for each symbol per user");
    console.log("✅ Automatic price sync to database when you buy/sell");
    console.log("✅ P&L persistence even after market closes");
    console.log("✅ Cross-device price synchronization");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

setupPricesTable();
