-- Migration: Create last_trading_prices table
-- This table stores the last trading price for each symbol per user
-- Used for P&L calculations when market is closed

CREATE TABLE IF NOT EXISTS last_trading_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(50) NOT NULL,
  price NUMERIC(20, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one entry per user per symbol
  UNIQUE(user_id, symbol)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_last_trading_prices_user_id 
  ON last_trading_prices(user_id);

CREATE INDEX IF NOT EXISTS idx_last_trading_prices_symbol 
  ON last_trading_prices(symbol);

CREATE INDEX IF NOT EXISTS idx_last_trading_prices_user_symbol
  ON last_trading_prices(user_id, symbol);

-- Create index for updated_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_last_trading_prices_updated_at 
  ON last_trading_prices(updated_at);
