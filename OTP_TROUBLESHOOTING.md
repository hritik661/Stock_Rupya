# Gmail OTP Troubleshooting Guide

## ❌ Common Issues & Solutions

### 1. "Email service not configured" Error

**What it means:** The app can't find your Gmail credentials.

**Quick Fix:**
1. Open Vercel Dashboard → Your Project
2. Go to **Settings** → **Environment Variables**
3. Verify these three exist:
   - `GMAIL_USER` = your-email@gmail.com
   - `GMAIL_APP_PASSWORD` = (the 16-char app password)
   - `GMAIL_FROM_NAME` = Hrtik Stocks
4. If missing, add them
5. Redeploy: Click **Deployments** → **Redeploy Latest**

**Still not working?**
- Did you wait for the redeploy to complete? (Shows "Ready")
- Try a hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)
- Clear browser cache and try again

---

### 2. OTP Email Not Arriving

**Step 1: Check Spam Folder**
- Gmail sometimes filters emails as spam
- Look in: Promotions, Updates, or Spam tabs

**Step 2: Verify Gmail Credentials**
1. Did you enable 2FA on Gmail? (Required)
   - Go to https://myaccount.google.com/ → Security
   - Find "2-Step Verification" and check it's ON
2. Did you create an App Password? (Not your regular password)
   - Should look like: `abcd efgh ijkl mnop`
   - If unsure, regenerate it: Security → App passwords → Generate new one

**Step 3: Test Simple Send**
\`\`\`javascript
// In browser console:
fetch('/api/auth/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'your@gmail.com' })
})
.then(r => r.json())
.then(d => console.log(d))
\`\`\`
- Look for error messages in the response

**Still nothing?**
- Wait 10-15 seconds (Gmail can be slow)
- Try a different email address
- Check app password is exactly correct (with spaces)

---

### 3. "Invalid OTP" or "OTP not found"

**Reason:** Wrong code or code expired

**Solutions:**
- OTP codes expire after **5 minutes**
- Request a new OTP if more than 5 min passed
- Make sure you copied the code correctly (6 digits)
- Try entering it without spaces/formatting

**Testing locally (dev mode):**
If you're testing locally, you can see the OTP in:
1. Check browser console for `[v0]` logs
2. Look at Vercel function logs

---

### 4. Gmail Says "Invalid app password"

**Cause:** Wrong password or it's not an app password

**Fix:**
1. Go to https://myaccount.google.com/
2. Check 2FA is ON first
3. Go to **Security** → **App passwords**
4. Delete the old one
5. Create a new one: Mail + Your Device
6. Copy the exact 16 characters
7. Update in Vercel env vars
8. Redeploy

**⚠️ Important:** This must be an **App Password**, NOT your Gmail password!

---

### 5. Redeploy Not Working / Still Seeing Old Error

**Solution 1: Full Redeploy**
1. Go to Vercel Dashboard
2. Click **Deployments**
3. Find the latest one
4. Click the **...** menu
5. Click **Redeploy**
6. Wait for "Ready" status (2-5 minutes)

**Solution 2: Force Refresh**
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or open in Incognito/Private window

**Solution 3: Check Deployment Status**
1. Go to **Deployments** in Vercel
2. Click the latest one
3. Scroll to **Function logs**
4. Search for any errors

---

### 6. "500 Error" or "Internal Server Error"

**Check Function Logs:**
1. Vercel Dashboard → Deployments → Latest
2. Scroll down to "Function logs"
3. Look for POST requests to `/api/auth/send-otp`
4. Read the error message

**Common causes:**
- Gmail credentials not set (see issue #1)
- App password with wrong format
- Gmail blocking the connection
- Account not verified

---

### 7. Works Locally But Not on Production

**Checklist:**
- [ ] Env vars set in Vercel Dashboard (not .env file)
- [ ] App redeployed after adding env vars
- [ ] Using correct environment (Production, not Preview)
- [ ] Gmail 2FA is enabled
- [ ] App password (not main password) used

**Test Deployment:**
\`\`\`bash
# Deploy fresh
vercel deploy --prod

# Then test the /login page
\`\`\`

---

### 8. "OTP Code expires in 5 minutes" Then Expires Immediately

**Cause:** Server time is way off or clock issue

**Fix:**
- This usually fixes itself after 5 minutes
- Try again

**For development:**
- Check your computer's system clock is correct
- Restart the dev server: Ctrl+C and `npm run dev`

---

## 🔧 Advanced Debugging

### See Console Logs

1. **In Vercel:**
   - Deployments → Latest → Function logs
   - Look for `[v0]` prefixed messages

2. **In Browser:**
   - Open DevTools: F12
   - Go to Network tab
   - Send OTP
   - Click the POST request to `/api/auth/send-otp`
   - Read the response

### Verify Gmail Connection

\`\`\`bash
# Test if Gmail SMTP works
npm install nodemailer --save-dev

# Then in Node:
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'abcd efgh ijkl mnop'
  }
});

transporter.verify((error, success) => {
  if (error) console.log(error);
  else console.log('Gmail connection works!');
});
\`\`\`

---

## ✅ Verification Checklist

Before you give up, verify these one by one:

- [ ] Gmail account exists
- [ ] 2FA enabled on Gmail (must do this first!)
- [ ] App password generated (not regular password)
- [ ] App password is 16 characters
- [ ] App password used exactly (with spaces)
- [ ] `GMAIL_USER` env var set and correct
- [ ] `GMAIL_APP_PASSWORD` env var set and correct
- [ ] `GMAIL_FROM_NAME` env var set
- [ ] Variables in Production environment (not Preview)
- [ ] App redeployed after adding env vars
- [ ] Redeployment shows "Ready" status
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Using OTP tab (not password tab)
- [ ] Email is valid format (has @)
- [ ] Waiting for email (can take 10+ seconds)
- [ ] Checked spam folder
- [ ] OTP is 6 digits
- [ ] OTP entered within 5 minutes

If all checked and still not working → See "Advanced Debugging" section

---

## 🆘 Still Stuck?

1. **Check the log:**
   - Vercel Dashboard → Deployments → Function logs
   - Look for red errors

2. **Test with simple curl:**
\`\`\`bash
curl -X POST https://yourapp.vercel.app/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com"}'
\`\`\`

3. **Regenerate everything:**
   - Remove app password from Gmail
   - Create new app password
   - Update env vars
   - Redeploy
   - Test again

4. **Check Vercel status:**
   - Go to https://www.vercel-status.com/
   - Make sure no outage

---

Good luck! 🎉
