**Vercel Deploy Helper**

- **Purpose**: quick helper to deploy this Next.js app to Vercel and push env vars from `.env.local`.

Steps to use (Windows PowerShell):

1. Install Vercel CLI if you haven't:

```powershell
npm i -g vercel
```

2. From the project root run the helper (it reads `.env.local`):

```powershell
.\scripts\deploy-vercel.ps1
```

3. If the script prompts for login, run:

```powershell
vercel login
# then re-run the helper
.\scripts\deploy-vercel.ps1
```

Notes:
- The script will try to export `VERCEL_OIDC_TOKEN` from `.env.local` into `VERCEL_TOKEN` for non-interactive use.
- If env variables are already configured in your Vercel project, the CLI may prompt. To avoid prompts, add a valid `VERCEL_TOKEN` and ensure the project is linked.
- By default the repository already ignores `.env.local`; do not commit it.
