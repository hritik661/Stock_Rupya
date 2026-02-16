# Deploy to Vercel (Production)

This file contains step-by-step instructions to deploy the `stockai-redesign-and-calculations` project to Vercel production.

## Prerequisites
- A Git repository containing this project, pushed to a remote (GitHub, GitLab, Bitbucket).
- A Vercel account and access to the project you want to create or link.
- `pnpm` (or `npm`) installed locally if you plan to build/deploy from CLI.
- Do NOT commit secrets to the repo; `.env.local` is ignored by default.

## Steps (Dashboard - recommended)
1. Go to https://vercel.com and sign in.
2. Click **New Project** → import your Git repository.
3. When configuring the project, set the Framework Preset to **Next.js**.
4. In **Project Settings → Environment Variables**, add the production variables listed below (set values from your local `.env.local`). Scope: `Production` (and `Preview` if needed).

## Steps (CLI)
1. Install Vercel CLI globally if needed:

```bash
npm i -g vercel
# or
pnpm add -g vercel
```

2. From the repo root:

```bash
vercel login
vercel link     # link this folder to a Vercel project (follow prompts)
# then deploy to production
vercel --prod
```

If you prefer to build locally before deploying:

```bash
pnpm install
pnpm build
vercel --prod
```

## Environment Variables (add these in Vercel; DO NOT add secrets to repo)
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SUPABASE_URL
- DATABASE_URL
- VERCEL_OIDC_TOKEN (optional; prefer Personal Token in account settings)
- GMAIL_USER
- GMAIL_APP_PASSWORD
- GMAIL_FROM_NAME
- ALLOW_ANY_OTP
- MASTER_OTP
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- NEXT_PUBLIC_APP_ORIGIN
- NEXT_PUBLIC_RAZORPAY_ME_LINK
- NEXT_PUBLIC_RAZORPAY_TEST_LINK
- RAZORPAY_TEST_LINK
- RAZORPAY_WEBHOOK_SECRET

## Build Settings
- Install command: `pnpm install` (or `npm install`)
- Build command: `pnpm build` (or `npm run build`)
- Framework: Next.js (leave Output Directory blank for Next.js default)

## Security / Cleanup
- If any secrets were committed to the repository, rotate them immediately (DB, Gmail, Razorpay, tokens). Remove the commits containing secrets or use `git filter-repo` / `git filter-branch` carefully.

## Verification
- After deploy completes, open the production URL from Vercel dashboard.
- Check the build and runtime logs in Vercel if errors appear.

---
If you want, I can run `vercel --prod` from this environment — I will need you to either:
- Log in interactively in the integrated terminal (run `vercel login`), or
- Provide a Vercel Personal Token and confirm you want me to run the CLI here.

Which option do you prefer?