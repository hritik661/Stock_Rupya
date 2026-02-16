# Persistent Balance System - Complete Guide

## What's New

Your stock market app now has **PERSISTENT BALANCE** that survives logout/login cycles, just like a real stock market!

### Before (❌ Wrong)
- User has ₹10,00,000
- Buys stock for ₹10,00,000 (balance becomes ₹0)
- Logs out
- Logs in again → Balance resets to ₹10,00,000 ✗ (WRONG!)

### After (✅ Correct)
- User has ₹10,00,000
- Buys stock for ₹10,00,000 (balance becomes ₹0)
- Logs out
- Logs in again → Balance is still ₹0 ✓ (CORRECT!)

---

## How It Works

### 1. **Database Storage**
All user data is stored in **Neon PostgreSQL**:
- `users` table - User account & balance
- `transactions` table - Buy/sell history
- `active_users` table - Analytics tracking

### 2. **On Login**
1. User enters email → OTP sent
2. User verifies OTP
3. System fetches user from database
4. Loads actual balance (not reset to ₹10,00,000)
5. Stores in localStorage for fast access

### 3. **On Purchase/Sale**
\`\`\`
User clicks "Buy Stock"
    ↓
Balance deducted from database
    ↓
Transaction recorded
    ↓
Updated balance synced to localStorage
    ↓
UI updates immediately
\`\`\`

---

## API Endpoints

### Get Balance
\`\`\`bash
POST /api/balance/get
Body: { "email": "user@gmail.com" }
Response: { 
  "balance": 950000,
  "user": { "id", "email", "name", "balance" }
}
\`\`\`

### Deduct Balance (Buy)
\`\`\`bash
POST /api/balance/deduct
Body: {
  "email": "user@gmail.com",
  "amount": 50000,
  "type": "BUY",
  "symbol": "RELIANCE",
  "quantity": 10,
  "price": 5000
}
Response: { "newBalance": 950000 }
\`\`\`

### Add Balance (Sell)
\`\`\`bash
POST /api/balance/add
Body: {
  "email": "user@gmail.com",
  "amount": 50000,
  "type": "SELL",
  "symbol": "RELIANCE"
}
\`\`\`

### Analytics
\`\`\`bash
GET /api/analytics/users
Response: {
  "totalUsers": 42,
  "activeUsers": 18,
  "totalBalance": 4200000,
  "totalTransactions": 156
}
\`\`\`

---

## Using in Components

### Example: Buy Stock

\`\`\`tsx
import { useBalance } from "@/hooks/use-balance"

export function BuyStock() {
  const { currentBalance, deductBalance } = useBalance()

  const handleBuy = async () => {
    const result = await deductBalance(
      50000,  // amount
      "BUY",  // type
      "TCS",  // symbol
      10,     // quantity
      5000    // price
    )

    if (result.success) {
      alert(`Bought! New balance: ₹${result.newBalance}`)
    } else {
      alert(`Error: ${result.error}`)
    }
  }

  return (
    <div>
      <p>Balance: ₹{currentBalance}</p>
      <button onClick={handleBuy}>Buy ₹50,000 worth</button>
    </div>
  )
}
\`\`\`

### Example: Sell Stock

\`\`\`tsx
import { useBalance } from "@/hooks/use-balance"

export function SellStock() {
  const { addBalance } = useBalance()

  const handleSell = async () => {
    const result = await addBalance(
      50000,  // amount
      "SELL", // type
      "TCS"   // symbol
    )

    if (result.success) {
      alert(`Sold! New balance: ₹${result.newBalance}`)
    }
  }

  return <button onClick={handleSell}>Sell Stock</button>
}
\`\`\`

---

## Database Schema

### users table
\`\`\`sql
- id (UUID)
- email (VARCHAR)
- name (VARCHAR)
- balance (DECIMAL) ← Persistent!
- is_prediction_paid (BOOLEAN)
- created_at (TIMESTAMP)
- last_login (TIMESTAMP)
\`\`\`

### transactions table
\`\`\`sql
- id (UUID)
- user_id (UUID)
- type (BUY/SELL)
- amount (DECIMAL)
- symbol (VARCHAR)
- quantity (INTEGER)
- price (DECIMAL)
- created_at (TIMESTAMP)
\`\`\`

### active_users table
\`\`\`sql
- email (VARCHAR)
- last_active (TIMESTAMP)
\`\`\`

---

## User Analytics

### Check How Many Users
\`\`\`bash
curl https://yoursite.com/api/analytics/users
\`\`\`

Response:
\`\`\`json
{
  "analytics": {
    "totalUsers": 42,
    "activeUsers": 18,
    "totalBalance": 4200000,
    "totalTransactions": 156
  }
}
\`\`\`

- **Total Users**: Everyone who ever logged in
- **Active Users**: Logged in last 24 hours
- **Total Balance**: Sum of all user balances
- **Total Transactions**: All buy/sell transactions

---

## Example Flow

### User Journey
1. User signs up with email → Gets ₹10,00,000
2. Buys stock for ₹1,00,000 → Balance = ₹9,00,000 ✓
3. Logs out
4. **Next day** - Logs in again → Balance = ₹9,00,000 ✓
5. Sells stock for ₹50,000 → Balance = ₹9,50,000 ✓
6. Logs out & logs back in → Balance = ₹9,50,000 ✓

**Everything persists!**

---

## Testing

### Test Persistent Balance
1. Login with email
2. Note balance: ₹10,00,000
3. Buy stock: ₹2,00,000
4. Check balance: ₹8,00,000
5. **Logout**
6. **Login again**
7. Check balance: Should be ₹8,00,000 ✓

### Test Analytics
\`\`\`bash
curl https://yoursite.com/api/analytics/users
# See live user count!
\`\`\`

---

## Files Modified

- `/scripts/create-user-tables.sql` - Database schema
- `/app/api/balance/get/route.ts` - Fetch user balance
- `/app/api/balance/deduct/route.ts` - Buy stocks
- `/app/api/balance/add/route.ts` - Sell stocks
- `/app/api/analytics/users/route.ts` - User analytics
- `/app/api/auth/verify-otp/route.ts` - Load balance on login
- `/contexts/auth-context.tsx` - Fetch from database
- `/hooks/use-balance.ts` - React hook for balance updates

---

## Important Notes

✓ Balance persists across logout/login
✓ All transactions saved to database
✓ Real-time analytics on active users
✓ Secure - server-side balance deduction
✓ Fast - localStorage caching for UI
✓ Scalable - Neon database backend

---

## Troubleshooting

### Balance not persisting?
1. Check database connected: `/api/analytics/users`
2. Check user created in database
3. Check localStorage being saved

### Transactions not recording?
1. Check balance deducted properly
2. Check transactions table not full
3. Check API responses

### See user count wrong?
1. Run `/api/analytics/users`
2. Check last_login updated in database
3. Check active_users table

---

**Your stock market app now works like a real market!** 🎯
