# Gmail OTP Login Setup Guide

This guide will help you set up Gmail-based OTP authentication for your stock market app. This is completely free and requires minimal setup!

## Step 1: Enable 2-Factor Authentication on Your Gmail Account

1. Go to https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Scroll down to **2-Step Verification**
4. Click **Enable 2-Step Verification** and follow the steps

## Step 2: Create an App Password

1. Go to https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Scroll down to **App passwords** (only visible after 2FA is enabled)
4. Select "Mail" and "Windows Computer" (or your device)
5. Google will generate a 16-character password like: `abcd efgh ijkl mnop`
6. **Copy this password** - you'll need it in the next step

## Step 3: Add Environment Variables

Go to your Vercel dashboard and add these environment variables:

\`\`\`
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
GMAIL_FROM_NAME=Hrtik Stocks
\`\`\`

**Important:** Use the exact app password Google generated (including spaces).

## Step 4: Test the OTP Login

1. Go to your app login page: `https://yourapp.vercel.app/login`
2. Click on **"Sign in with OTP"** tab
3. Enter your email address
4. Click **"Send OTP to Email"**
5. Check your Gmail inbox for the OTP code
6. Enter the 6-digit code and click **"Verify & Login"**

## Troubleshooting

### OTP not arriving
- Check your spam/promotions folder in Gmail
- Make sure GMAIL_USER and GMAIL_APP_PASSWORD are correctly set
- Wait a few seconds and retry

### "Invalid app password" error
- Make sure you have 2FA enabled on your Gmail account
- Double-check the app password (16 characters with spaces)
- Regenerate the app password if needed

### Other errors
- Check your Vercel function logs for detailed error messages
- Ensure NODE_ENV is set correctly

## Security Notes

- App passwords are specific to Gmail and can be revoked anytime
- OTPs expire after 5 minutes
- This implementation uses in-memory OTP storage (safe for development, consider database for production)
- All OTP endpoints are rate-limited by Vercel automatically

## How It Works

1. User enters email → OTP is generated and stored
2. Email is sent via Gmail SMTP (free, no third-party service needed)
3. User enters OTP → Verified against stored OTP
4. Session is created and user is logged in
5. User data is stored in localStorage (development mode)

Enjoy your OTP login system! 🎉
