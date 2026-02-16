# Email Service Configuration - Complete Fix Guide

Your error shows the Gmail credentials are NOT being read in production. Let's fix this step-by-step.

## Why It's Failing

From debug logs: `[v0] Gmail not configured. GMAIL_USER: false GMAIL_APP_PASSWORD: false`

This means either:
1. Variables weren't added to Vercel yet
2. Deployment hasn't run after adding variables
3. Variable names are slightly different

## QUICK FIX - Do This Now (5 minutes)

### Step 1: Verify Variables in Vercel (1 min)

Go to https://vercel.com → Your Project → Settings → Environment Variables

**Check that EXACTLY these 5 variables exist:**

```
GMAIL_USER = hritikparmar800@gmail.com
GMAIL_APP_PASSWORD = zvpuszgvhsbcnnfs
GMAIL_FROM_NAME = Hritik Stocks
ALLOW_ANY_OTP = false
MASTER_OTP = 123456
```

**Important:** Make sure the checkboxes are enabled for:
- ✓ Production
- ✓ Preview  
- ✓ Development

### Step 2: Force Redeploy (2 min)

1. Go to **Deployments** tab in Vercel dashboard
2. Find the LATEST deployment (usually top)
3. Click the **three dots (...)** on the right
4. Click **Redeploy**
5. Wait for the deployment to complete (green checkmark)

**This is crucial!** Without redeploying, Vercel won't apply the new variables.

### Step 3: Test It Works (2 min)

1. Go to your app login page: `https://your-domain.vercel.app/login`
2. Click "Send OTP"
3. Enter your test email: `hritikparmar33@gmail.com`
4. Check the email inbox for OTP

**If you see "Email service not configured":**
- Try waiting 2 minutes for the deployment to fully propagate
- Then refresh the page and try again

---

## If Still Not Working - Troubleshooting

### Check 1: Verify Gmail App Password is Correct

The password `zvpuszgvhsbcnnfs` should be exactly as shown (spaces removed).

**Never use your regular Gmail password** - must be an App Password from 2FA settings.

### Check 2: Verify Email Variable Case

In the code at `/app/api/auth/send-otp/route.ts` line 33, it checks:

```typescript
if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)
```

Make sure in Vercel, you have:
- `GMAIL_USER` (exactly this case)
- `GMAIL_APP_PASSWORD` (exactly this case)

NOT: `gmail_user` or `GmailUser` (different case won't work)

### Check 3: Clear Vercel Cache

If variables still don't work:

1. Go to Settings → Git
2. Scroll down to "Deployment" 
3. Click "Clear Cache"
4. Redeploy again

### Check 4: Check Deployment Function Logs

In Vercel dashboard:
1. Click on the latest deployment
2. Go to "Functions" tab
3. Click on `/api/auth/send-otp`
4. Check the logs to see exactly what's happening

---

## Variables Needed for Full App

These are ALL the environment variables your app needs in production:

### Email (Gmail OTP)
```
GMAIL_USER=hritikparmar800@gmail.com
GMAIL_APP_PASSWORD=zvpuszgvhsbcnnfs
GMAIL_FROM_NAME=Hritik Stocks
ALLOW_ANY_OTP=false
MASTER_OTP=123456
```

### Database (Neon)
```
DATABASE_URL=your_neon_connection_string
```

### Payments (Optional - if using)
```
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

### AI/Chat (Optional - if using)
```
OPENAI_API_KEY=your_openai_key
```

---

## Expected Behavior After Fix

1. User tries to login
2. Enters email: `hritikparmar33@gmail.com`
3. Clicks "Send OTP"
4. **Success message**: "OTP sent to your email. Please check your inbox."
5. Email arrives with the OTP code
6. User enters OTP and logs in

If you see: "OTP email sent successfully via Gmail to: [email]" in logs = ✅ WORKING

---

## Still Stuck?

Try this final nuclear option:

1. Go to Vercel Settings → Domains
2. Add `vercelsecure.com` as a test domain temporarily
3. Redeploy
4. Test with the temporary domain
5. If it works, the issue was domain-specific caching

OR: 

Contact v0 support with a screenshot of:
- Your Vercel Environment Variables page (blur sensitive values)
- The latest deployment log showing the error
- The `/api/auth/send-otp` function logs
