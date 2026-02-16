# Deploy Gmail OTP Login to Vercel (LIVE)

## Prerequisites
- Your app deployed on Vercel (or ready to deploy)
- A Gmail account with 2FA enabled
- 5 minutes

## Step 1: Get Your Gmail App Password

1. Go to https://myaccount.google.com/
2. Click **Security** in the left panel
3. Scroll down and find **App passwords**
   - ⚠️ If you don't see this, 2FA is not enabled. Enable it first.
4. Select:
   - App: **Mail**
   - Device: **Windows Computer** (or your device)
5. Click **Generate**
6. Google will show a 16-character password
7. **Copy it exactly** (including spaces): `abcd efgh ijkl mnop`

## Step 2: Add Environment Variables to Vercel

### Method A: Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Click **Settings** (top navigation)
3. Click **Environment Variables** (left sidebar)
4. Add three new variables:

| Key | Value |
|-----|-------|
| `GMAIL_USER` | your-email@gmail.com |
| `GMAIL_APP_PASSWORD` | abcd efgh ijkl mnop |
| `GMAIL_FROM_NAME` | Hrtik Stocks |

5. Click **Save** for each variable
6. The page will show "Deployment queued"

### Method B: Vercel CLI
\`\`\`bash
vercel env add GMAIL_USER
vercel env add GMAIL_APP_PASSWORD
vercel env add GMAIL_FROM_NAME
vercel deploy --prod
\`\`\`

## Step 3: Redeploy Your App

After adding env variables, Vercel automatically redeploys. If not:

1. Go to **Deployments** in your Vercel dashboard
2. Click the most recent deployment
3. Click **Redeploy** button
4. Wait for it to say "Ready"

That's it! ✓

## Step 4: Test It Live

1. Open your app: `https://yourapp.vercel.app/login`
2. Click the **OTP** tab
3. Enter your email
4. Click **Send OTP to Email**
5. Check your Gmail inbox
6. Copy the 6-digit code
7. Paste and click **Verify & Login**

## ✅ Success!

Your Gmail OTP login is now live on the internet!

## 🔐 Security Checklist

- ✅ Gmail 2FA enabled
- ✅ App password created (not your main password)
- ✅ Env vars set in Vercel dashboard
- ✅ Variables set for Production environment
- ✅ App redeployed

## 📊 What Happens

\`\`\`
User enters email
    ↓
Server generates 6-digit OTP
    ↓
Gmail SMTP sends email (free)
    ↓
User copies code from email
    ↓
Server verifies code (5 min expiry)
    ↓
Auto-login, session created
    ↓
Virtual account ready with ₹10,00,000
\`\`\`

## 🆘 Troubleshooting on Production

| Issue | Fix |
|-------|-----|
| "Email service not configured" | Check env vars in Vercel dashboard → Settings → Environment Variables |
| OTP not arriving | Check spam folder, wait 30s, try again |
| 403 / 5xx errors | Check Vercel function logs: Deployments → Function logs |
| "Invalid app password" | Regenerate in Gmail (Security → App passwords) |

## 📝 Verification

To verify env vars are set:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. You should see all three variables listed
3. Click each to verify the value

## 🎉 You're Done!

Your app now has production-grade Gmail OTP authentication!

Need help? See `/QUICK_START_OTP.md` or `/GMAIL_OTP_SETUP.md`
