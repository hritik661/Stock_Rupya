# Quick Start: Gmail OTP Login (5 minutes)

## What You Need
- A Gmail account
- Nothing else! It's completely free.

## Step-by-Step Setup

### 1️⃣ Enable 2FA on Gmail (2 min)
- Go to https://myaccount.google.com/
- Click **Security** (left sidebar)
- Find **2-Step Verification** and click it
- Follow the prompts to verify your phone
- Done! ✓

### 2️⃣ Create App Password (2 min)
- Go back to https://myaccount.google.com/
- Click **Security** (left sidebar)
- Scroll to **App passwords** (appears after 2FA is enabled)
- Choose: Mail → Windows Computer
- Google gives you 16 characters like: `abcd efgh ijkl mnop`
- **Copy and save this password!**

### 3️⃣ Add to Your App (1 min)

Open your Vercel project and add these environment variables in **Settings → Environment Variables**:

\`\`\`
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
GMAIL_FROM_NAME=Hrtik Stocks
\`\`\`

**Copy the exact app password with spaces!**

### 4️⃣ Test It!
1. Go to your login page
2. Click the **OTP** tab
3. Enter your email
4. Click **Send OTP to Email**
5. Check your Gmail inbox (or spam folder)
6. Copy the 6-digit code
7. Paste it and click **Verify & Login**

## ✅ Done!

Your Gmail OTP login is now live! 

### What Happens Behind the Scenes
- User enters email → OTP generated (6 digits, 5 min expiry)
- Email sent via Gmail SMTP (completely free, no API costs)
- User verifies code → Auto-login, virtual account created
- No passwords needed, fully secure with OTP

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| OTP not arriving | Check spam folder, wait 10sec, try again |
| "Invalid app password" | Make sure 2FA is enabled, regenerate app password |
| "Email service not configured" | Did you add env vars? Restart your dev server |
| Code expired | OTPs last 5 minutes, request a new one |

## 📝 Notes
- App passwords can be revoked anytime in Gmail settings
- This is free - no hidden costs
- OTPs are generated locally, not stored in any database (development mode)
- For production, store OTPs in a database

## Need Help?
See the full guide: `/GMAIL_OTP_SETUP.md`
