Gmail OTP Setup
================

This project includes an email OTP sign-in flow that can send OTPs via Gmail SMTP or via the Resend API as a fallback.

Environment variables
- `GMAIL_USER` - your Gmail address (e.g. `example@gmail.com`).
- `GMAIL_APP_PASSWORD` - an App Password generated from your Google Account (required for SMTP).
- `GMAIL_FROM_NAME` - optional display name for the email (e.g. `Hrtik Stocks`).
- `RESEND_API_KEY` - optional Resend API key (if you prefer Resend over Gmail).
- `RESEND_FROM` - optional from address for Resend (default: `noreply@hrtiksitems.in`).
- `MASTER_OTP` - optional master OTP for development testing.
- `ALLOW_ANY_OTP` - set to `true` (in non-production) to accept any OTP for local testing.

How to generate a Gmail App Password
1. Enable 2-Step Verification for the Google account you want to use.
2. Go to Security → App passwords and create a new app password for "Mail".
3. Use the generated 16-character password as `GMAIL_APP_PASSWORD`.

Local development fallback
- If you don't configure Gmail or Resend and `NODE_ENV !== 'production'`, the `send-otp` route will return the generated OTP in the JSON response for testing. This is only for development — do NOT use this in production.

Example `.env.local`
\`\`\`
GMAIL_USER=youremail@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
GMAIL_FROM_NAME=Hrtik Stocks
# optional development helpers
ALLOW_ANY_OTP=false
MASTER_OTP=123456
\`\`\`

After adding env vars, restart the dev server.
