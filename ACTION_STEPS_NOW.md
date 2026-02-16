# DO THIS RIGHT NOW - Fix Email Service (5 minutes)

## Step 1: Go to Vercel Dashboard NOW
https://vercel.com/dashboard

## Step 2: Click Your "stocksmarket" Project

## Step 3: Go to Settings → Environment Variables

## Step 4: Add/Verify These 5 Variables

Copy-paste each one exactly:

```
GMAIL_USER
hritikparmar800@gmail.com

GMAIL_APP_PASSWORD
zvpuszgvhsbcnnfs

GMAIL_FROM_NAME
Hritik Stocks

ALLOW_ANY_OTP
false

MASTER_OTP
123456
```

**CHECK THE BOXES:** ✓ Production, ✓ Preview, ✓ Development for EACH

Click "Add" after each one.

## Step 5: Redeploy

1. Go to "Deployments" tab (top menu)
2. Find top deployment
3. Click "..." (three dots) → "Redeploy"
4. Wait for green checkmark (2-3 min)

## Step 6: Test

1. Go to your app: `https://stocksmarket.vercel.app/login` (use your actual domain)
2. Click "Send OTP"
3. Enter: `hritikparmar33@gmail.com`
4. **Check your email for the OTP**

## ✅ If You See the Email = FIXED!

## ❌ If Still Not Working

Wait 2 minutes, refresh page, and try again (variables take time to propagate).

If STILL doesn't work, check: `/EMAIL_SERVICE_FIX.md` for troubleshooting.
