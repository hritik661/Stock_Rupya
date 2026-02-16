# Deployment Guide — publish to production

This guide helps you publish the project to production using Vercel and GitHub Actions. I added a `vercel.json`, a `.env.production.example`, and a GitHub Actions workflow to accelerate deployment.

Prerequisites
- A GitHub repository for this project (push the workspace to GitHub).
- A Vercel account and a project connected to the GitHub repo (recommended).
- Secrets configured in GitHub (see below).

Steps

1. Push this repository to GitHub (if not already):

\`\`\`bash
git init
git add .
git commit -m "Ready for production deploy"
git branch -M main
git remote add origin <your-git-remote>
git push -u origin main
\`\`\`

2. Configure secrets in the GitHub repository (Settings → Secrets → Actions):
- `VERCEL_TOKEN` — your Vercel personal token
- `VERCEL_ORG_ID` — Vercel organization id
- `VERCEL_PROJECT_ID` — Vercel project id
- `OPENAI_API_KEY` — OpenAI API key (required for the chat feature)
- `MYSQL_URL` — optional, if you want MySQL persistence
- `NEXT_PUBLIC_APP_ORIGIN` — your site origin (https://your-domain.com)

3. In Vercel (if you prefer Vercel-managed deploys):
- Connect the GitHub repo to Vercel and set environment variables in the Vercel project settings (the same values as GitHub secrets). Vercel will build and deploy automatically on push.

4. If using the included GitHub Action, pushing to `main` will build and deploy to Vercel automatically when the secrets are set.

Notes and recommendations
- Do NOT commit real secrets to the repo. Use GitHub or Vercel environment variable settings.
- Set `NEXT_PUBLIC_APP_ORIGIN` to the actual domain used by Vercel (e.g., https://your-app.vercel.app or your custom domain).
- If you rely on MySQL, set `MYSQL_URL` to your production database. Schema migrations are not included — if you need them I can add a simple migration script.
- The payment flow uses `/api/payments/create` and will persist to MySQL if `MYSQL_URL` is set; otherwise it will use in-memory fallback.

If you want, I can:
- Create the GitHub repo and push this code (I will need a token with repo permissions), or
- Configure Vercel directly if you provide `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, and `VERCEL_ORG_ID`, or
- Walk you through linking the repo to Vercel step-by-step.
