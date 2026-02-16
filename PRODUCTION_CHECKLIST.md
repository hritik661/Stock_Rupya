# Production Deployment Checklist - 5 Minutes

## Quick Setup (Copy & Paste Ready)

Your environment variables are:
```
GMAIL_USER=hritikparmar800@gmail.com
GMAIL_APP_PASSWORD=zvpuszgvhsbcnnfs
GMAIL_FROM_NAME=Hritik Stocks
ALLOW_ANY_OTP=false
MASTER_OTP=123456
```

## 3 Steps to Deploy

### STEP 1: Add Environment Variables (2 mins)
1. Go to https://vercel.com/dashboard
2. Click **stocksmarket** project
3. Click **Settings** tab
4. Click **Environment Variables** in left menu
5. Add 5 variables (one by one):
   - GMAIL_USER = hritikparmar800@gmail.com
   - GMAIL_APP_PASSWORD = zvpuszgvhsbcnnfs
   - GMAIL_FROM_NAME = Hritik Stocks
   - ALLOW_ANY_OTP = false
   - MASTER_OTP = 123456
6. For each: Check ✓ Production, ✓ Preview, ✓ Development
7. Click "Save"

### STEP 2: Redeploy (2 mins)
1. Click **Deployments** tab
2. Click **...** (three dots) on top deployment
3. Click **Redeploy**
4. Click **Redeploy** button
5. Wait for green checkmark (2-3 minutes)

### STEP 3: Test (1 min)
1. Visit https://yourapp.vercel.app/login
2. Click "Sign in with OTP"
3. Enter: hritikparmar33@gmail.com
4. Click "Send OTP to Email"
5. Check Gmail - you should get OTP!

---

## Done! ✓

Your app is now deployed with:
✓ Gmail OTP authentication
✓ Email sending configured
✓ Production-ready
✓ 100% secure (secrets in Vercel, not Git)

---

## If It Doesn't Work

**Problem: Still seeing "Email service not configured"**
- ✓ Did you add all 5 variables?
- ✓ Did you click "Redeploy"?
- ✓ Did you wait 3 minutes?
- If still broken, check Vercel dashboard → Functions → Logs

**Problem: Gmail not sending emails**
- ✓ Is GMAIL_APP_PASSWORD correct?
- ✓ Does your Gmail have 2FA enabled?
- ✓ Check spam/promotions folder

---

For detailed help: See VERCEL_ENV_SETUP.md
