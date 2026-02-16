# Production Deployment Guide - Environment Variables

## Important: Why .env.local is NOT Deployed

`.env.local` files are **intentionally excluded from deployment** for security reasons:
- They contain sensitive secrets (API keys, passwords, tokens)
- They are listed in `.gitignore` and never committed to git
- Production requires explicit environment variable configuration

## How to Deploy with Environment Variables to Vercel

### Step 1: Gather Your Environment Variables

Your application requires these environment variables:

**Authentication & Email (OTP):**
```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password-16-chars
GMAIL_FROM_NAME=Your App Name
ALLOW_ANY_OTP=false
MASTER_OTP=123456 (optional, for testing only)
```

**Database:**
```
DATABASE_URL=your-neon-postgresql-connection-string
```

**Payment Gateway:**
```
DEFAULT_UPI=your-upi-id@bank
PAYEE_NAME=Your Name
UPIPG_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_APP_ORIGIN=https://yourdomain.com
```

**AI/Chat:**
```
OPENAI_API_KEY=sk-your-openai-api-key
```

**Optional - Supabase:**
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=https://yourdomain.com
```

### Step 2: Add Environment Variables to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Settings** → **Environment Variables**
4. Add each variable:
   - **Name**: `GMAIL_USER`
   - **Value**: `your-email@gmail.com`
   - **Environments**: Production, Preview, Development
5. Click **Save** and repeat for all variables

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add GMAIL_USER
# Enter: your-email@gmail.com
# Select: Production, Preview, Development

vercel env add GMAIL_APP_PASSWORD
# Enter: your-app-password

# Repeat for all variables...
```

#### Option C: Via `.env.production` (for Vercel only)

Create a `.env.production` file with sensitive values (but DO NOT commit it):
```bash
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
DATABASE_URL=your-neon-url
```

Then add to `.gitignore` (already done):
```
.env.production
```

### Step 3: Deploy to Vercel

```bash
# Push to GitHub
git add .
git commit -m "Deploy to production"
git push origin main

# Vercel auto-deploys when you push, OR manually:
vercel --prod
```

### Step 4: Verify Environment Variables

1. Go to Vercel Dashboard → Your Project
2. Click **Deployments** → Latest Deployment
3. Click **Functions** tab
4. Click on any API route like `/api/auth/send-otp`
5. Scroll to **Environment Variables** section to confirm all vars are present

## Testing Production Variables

```bash
# After deployment, test the OTP endpoint
curl -X POST https://yourdomain.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Should return: {"success":true,"message":"OTP sent to email"}
```

## Quick Checklist

- [ ] Create Neon database and get `DATABASE_URL`
- [ ] Set up Gmail App Password and get `GMAIL_APP_PASSWORD`
- [ ] Get UPI details for payment gateway
- [ ] Generate OpenAI API key (if using chat)
- [ ] Add all variables to Vercel dashboard
- [ ] Deploy code to GitHub
- [ ] Verify deployment in Vercel
- [ ] Test OTP email sending
- [ ] Test payment gateway
- [ ] Monitor logs for errors

## Troubleshooting

### Issue: "process.env.GMAIL_USER is undefined"
**Solution:** Variable not added to Vercel. Go to Settings → Environment Variables and add it.

### Issue: OTP not sending
**Solution:** Check Vercel function logs at Deployments → Functions → `/api/auth/send-otp`

### Issue: "GMAIL_APP_PASSWORD incorrect"
**Solution:** Regenerate a new App Password in Google Account settings.

### Issue: Database connection fails
**Solution:** Verify `DATABASE_URL` doesn't include `dummy` prefix. Check Neon dashboard for correct connection string.

## Security Best Practices

1. **Never commit secrets**: `.env*` files are gitignored ✓
2. **Use different keys per environment**: Vercel supports this natively
3. **Rotate API keys regularly**: Change keys every 3-6 months
4. **Use Vercel's encrypted storage**: All variables encrypted at rest
5. **Limit access**: Only assign team members who need it

## Environment Variables Reference

| Variable | Required | Environment | Description |
|----------|----------|-------------|-------------|
| `GMAIL_USER` | Yes | Production | Gmail address for OTP |
| `GMAIL_APP_PASSWORD` | Yes | Production | Gmail app password (16 chars) |
| `DATABASE_URL` | Yes | Production | Neon PostgreSQL connection |
| `DEFAULT_UPI` | No | Production | UPI ID for payments |
| `OPENAI_API_KEY` | No | Production | For AI chat features |
| `ALLOW_ANY_OTP` | No | Development | Allow any OTP (dev only) |
| `MASTER_OTP` | No | Development | Master OTP for testing |
| `NEXT_PUBLIC_*` | Varies | All | Visible to browser (no secrets!) |

## Need Help?

- Vercel Docs: https://vercel.com/docs/concepts/projects/environment-variables
- Neon Setup: https://neon.tech/docs/connect/connect-from-any-app
- Gmail App Password: https://support.google.com/accounts/answer/185833
