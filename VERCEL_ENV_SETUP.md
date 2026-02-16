# Complete Vercel Production Environment Setup

This guide will help you add all environment variables to production so your app works perfectly.

## Your Environment Variables

Your app needs these 5 environment variables in production:

```
GMAIL_USER=hritikparmar800@gmail.com
GMAIL_APP_PASSWORD=zvpuszgvhsbcnnfs
GMAIL_FROM_NAME=Hritik Stocks
ALLOW_ANY_OTP=false
MASTER_OTP=123456
```

## Method 1: Vercel Dashboard (Easiest - Recommended)

### Step 1: Go to Your Vercel Project
1. Open https://vercel.com/dashboard
2. Click on your **stocksmarket** project
3. Go to **Settings** tab (top navigation)

### Step 2: Add Environment Variables
1. Click on **Environment Variables** in the left sidebar
2. You'll see a form to add new variables

### Step 3: Add Each Variable

For each variable below, click "Add New" and fill in:

**Variable 1 - Gmail User**
- Name: `GMAIL_USER`
- Value: `hritikparmar800@gmail.com`
- Environments: Check ✓ **Production**, ✓ **Preview**, ✓ **Development**
- Click "Save"

**Variable 2 - Gmail App Password**
- Name: `GMAIL_APP_PASSWORD`
- Value: `zvpuszgvhsbcnnfs`
- Environments: Check ✓ **Production**, ✓ **Preview**, ✓ **Development**
- Click "Save"

**Variable 3 - From Name**
- Name: `GMAIL_FROM_NAME`
- Value: `Hritik Stocks`
- Environments: Check ✓ **Production**, ✓ **Preview**, ✓ **Development**
- Click "Save"

**Variable 4 - Allow Any OTP**
- Name: `ALLOW_ANY_OTP`
- Value: `false`
- Environments: Check ✓ **Production**, ✓ **Preview**, ✓ **Development**
- Click "Save"

**Variable 5 - Master OTP**
- Name: `MASTER_OTP`
- Value: `123456`
- Environments: Check ✓ **Production**, ✓ **Preview**, ✓ **Development**
- Click "Save"

### Step 4: Verify Variables Added
Your Settings → Environment Variables should now show all 5 variables like:

```
GMAIL_USER                  = hritikparmar800@gmail.com
GMAIL_APP_PASSWORD          = zvpuszgvhsbcnnfs
GMAIL_FROM_NAME             = Hritik Stocks
ALLOW_ANY_OTP               = false
MASTER_OTP                  = 123456
```

## Method 2: Vercel CLI (If You Have Terminal Access)

```bash
# Login to Vercel
vercel login

# Navigate to your project
cd /path/to/your/project

# Add each environment variable
vercel env add GMAIL_USER
# Enter value: hritikparmar800@gmail.com

vercel env add GMAIL_APP_PASSWORD
# Enter value: zvpuszgvhsbcnnfs

vercel env add GMAIL_FROM_NAME
# Enter value: Hritik Stocks

vercel env add ALLOW_ANY_OTP
# Enter value: false

vercel env add MASTER_OTP
# Enter value: 123456
```

## Step 5: Redeploy Your Application

**Important:** You must redeploy after adding environment variables!

### Option A: Through Dashboard
1. Go to your Vercel project
2. Click **Deployments** tab
3. Find your latest deployment (top one)
4. Click the **...** (three dots) menu
5. Select **Redeploy**
6. Click **Redeploy** button in the popup

### Option B: Through GitHub
1. Make a small change to your code (even a comment)
2. Push to GitHub: `git commit -m "Trigger redeploy" && git push`
3. Vercel automatically redeploys

### Option C: Through Vercel CLI
```bash
vercel redeploy
```

## Step 6: Verify Deployment

1. Wait 2-3 minutes for deployment to complete
2. Go to https://yourapp.vercel.app/login
3. Click "Sign in with OTP"
4. Enter your email: `hritikparmar33@gmail.com` (your test email)
5. Click "Send OTP to Email"
6. Check Gmail inbox for the OTP code
7. You should receive the email successfully!

## Important Notes

⚠️ **Never commit .env.local to Git**
- Keep your `.gitignore` with `.env.local` (it already is)
- Secrets should only be in Vercel, not in your repository

🔒 **Security Best Practices**
- These variables are encrypted in Vercel
- Only visible to you in the dashboard
- Each environment (Production/Preview/Development) can have different values

🚀 **Production vs Preview**
- **Production**: When users visit your deployed app
- **Preview**: When you open pull request previews
- **Development**: When you run locally with `.env.local`

## Troubleshooting

### Still Getting "Email service not configured" Error?

1. **Verify variables are saved**: Go to Settings → Environment Variables and confirm all 5 variables are there
2. **Redeploy is required**: You must click "Redeploy" after adding variables
3. **Wait for deployment**: Give it 2-3 minutes to complete
4. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
5. **Check function logs**: In Vercel dashboard → Functions → Logs to see error details

### App Password Issues?

If Gmail auth fails:
1. Verify `GMAIL_APP_PASSWORD` has no extra spaces
2. Check your Gmail account has 2FA enabled
3. Go to https://myaccount.google.com/apppasswords and regenerate if needed
4. Update the password in Vercel Environment Variables

### Database Table Errors?

If you see "relation 'users' does not exist":
1. Run the database migration: `scripts/create-user-tables.sql`
2. This creates the required tables in your Neon database
3. Verify with: `DATABASE_URL` environment variable is set

## Final Checklist

- [ ] All 5 environment variables added to Vercel
- [ ] Checked ✓ Production, ✓ Preview, ✓ Development for each
- [ ] Clicked "Redeploy" on latest deployment
- [ ] Waited 2-3 minutes for deployment to complete
- [ ] Tested login on production URL
- [ ] Received OTP email successfully

## Next Steps

Once verified working:
1. Your OTP login is now production-ready!
2. Users can sign up and receive login codes via email
3. The database (Neon) stores user sessions
4. Perfect for production use!

## Support

If issues persist:
1. Check Vercel dashboard → Functions → Logs for error details
2. Verify all environment variables are set (Settings → Environment Variables)
3. Ensure you clicked "Redeploy" after adding variables
4. Contact support at hritikparmar800@gmail.com
