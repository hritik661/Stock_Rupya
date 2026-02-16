# Deployment to Vercel - Complete Guide

Your stockmarket application is ready for production deployment! Follow these steps:

## Step 1: Create a GitHub Repository

### Option A: Using GitHub Web (Recommended)

1. Go to **https://github.com/new**
2. Create a new repository:
   - **Repository name:** `stockmarket` (or any name you prefer)
   - **Description:** "Stock Market Trading Platform"
   - **Visibility:** Public (required for free Vercel tier)
   - Do NOT initialize with README, .gitignore, or license
3. Click **Create repository**

### Option B: Using GitHub CLI (if installed)

```bash
gh repo create stockmarket --public --source=. --remote=origin --push
```

---

## Step 2: Add GitHub Remote and Push Code

Once your GitHub repository is created, run these commands in your project folder:

```bash
cd "C:\Users\HRITIK PARMAR\Downloads\stockmarket"

# Add the GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/stockmarket.git

# Rename branch to main if needed (Vercel prefers 'main')
git branch -M main

# Push your code to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Step 3: Connect to Vercel for Deployment

1. Go to **https://vercel.com/new**
2. Sign in with your GitHub account (or create a free Vercel account)
3. Click **Import Project**
4. Select your `stockmarket` repository
5. Vercel will auto-detect the project as **Next.js**

---

## Step 4: Configure Environment Variables in Vercel

### In the Vercel import dialog, before deploying:

1. Click **Environment Variables**
2. Add each variable from your `.env.local`:

```
GMAIL_USER=hritikparmar800@gmail.com
GMAIL_APP_PASSWORD=zvpuszgvhsbcnnfs
GMAIL_FROM_NAME=Hritik Stocks
ALLOW_ANY_OTP=false
MASTER_OTP=123456
DATABASE_URL=postgresql://neondb_owner:npg_UBVz2pF8rnbt@ep-restless-bush-ah3czsaz-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
INSTAMOJO_API_KEY=cb0e1d114fa76bb0b464866819dc9b12
INSTAMOJO_AUTH_TOKEN=2e849e7fdaa29b259ce1979ec86e610d
INSTAMOJO_TEST_MODE=false
NEXT_PUBLIC_APP_ORIGIN=https://hritik-stockmarket.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://ukeltuwxqbjjlzugcxpo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_fRQ8KSv00CsiluJW02rVmw_velDR-Sh
```

3. Make sure **Environments** is set to: **Production, Preview, Development**
4. Click **Save**

---

## Step 5: Deploy

1. Click **Deploy**
2. Vercel will:
   - Build your Next.js app
   - Run the build command: `next build`
   - Deploy to production

Your site will be live in ~2-3 minutes at:
**https://hritik-stockmarket.vercel.app**

Or your custom domain if you configured one.

---

## Step 6: Verify Deployment

Once deployed:

1. Visit your Vercel URL
2. Test key features:
   - ✅ Stock search and listings
   - ✅ Portfolio page
   - ✅ Options trading
   - ✅ Predictions
   - ✅ Login/Logout with OTP

---

## Important Notes

### Security
- **Never commit `.env.local`** - It's in `.gitignore` ✓
- Environment variables are securely stored in Vercel Dashboard
- Sensitive data (API keys) are encrypted at rest

### Database
- Your Neon PostgreSQL database is cloud-hosted
- Vercel can access it via `DATABASE_URL`
- No local database needed

### Automatic Deployments
- Every `git push` to GitHub's `main` branch auto-deploys to Vercel
- Preview deployments for pull requests
- Easy rollbacks if needed

### Custom Domain (Optional)
- In Vercel Dashboard → **Settings → Domains**
- Add your custom domain (e.g., `stockmarket.com`)
- Update DNS records (provided by Vercel)

---

## Troubleshooting

### Build fails with environment variable errors
- Make sure all variables are added in Vercel Dashboard
- Redeploy after adding variables

### Database connection timeout
- Verify `DATABASE_URL` is correct in Vercel
- Check Neon console for connection issues
- Whitelist Vercel IP (usually automatic)

### Still having issues?
- Check Vercel deployment logs: Project → **Deployments** → Recent deployment
- View function logs: **Functions** tab
- Test locally: `pnpm build && pnpm start`

---

## Next Steps After Deployment

1. **Monitor performance** in Vercel Analytics
2. **Set up custom domain** if desired
3. **Enable auto-scaling** for traffic spikes
4. **Configure webhooks** for GitHub integration
5. **Regular backups** of your Neon database

---

**Your app is production-ready!** 🚀
