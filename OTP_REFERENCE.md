# Gmail OTP Login - Quick Reference Card

## 🚀 Setup Flow (Copy & Paste)

### Step 1: Enable Gmail 2FA
https://myaccount.google.com/ → Security → 2-Step Verification → Enable

### Step 2: Get App Password  
https://myaccount.google.com/ → Security → App passwords → Generate

Example format: `abcd efgh ijkl mnop` (16 chars with spaces)

### Step 3: Set Vercel Env Vars
\`\`\`
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
GMAIL_FROM_NAME=Hrtik Stocks
\`\`\`

### Step 4: Test Login
1. Go to /login
2. Click "OTP" tab
3. Enter email
4. Check Gmail inbox
5. Copy 6-digit code
6. Enter code → Done!

---

## 📋 Environment Variables Template

\`\`\`env
# Gmail OTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
GMAIL_FROM_NAME=Hrtik Stocks

# Optional
# MYSQL_URL=mysql://user:password@host/database
\`\`\`

---

## 🔍 File Quick Reference

| File | Purpose | Edit? |
|------|---------|:-----:|
| `/QUICK_START_OTP.md` | Setup guide | ❌ |
| `/DEPLOY_OTP_LIVE.md` | Production deploy | ❌ |
| `/GMAIL_OTP_SETUP.md` | Gmail config details | ❌ |
| `/OTP_TROUBLESHOOTING.md` | Fix errors | ❌ |
| `/components/login-form.tsx` | Login UI | ✅ |
| `/contexts/auth-context.tsx` | Auth logic | ✅ |
| `/app/api/auth/send-otp/route.ts` | Send OTP | ✅ |
| `/app/api/auth/verify-otp/route.ts` | Verify OTP | ✅ |
| `/lib/otp-store.ts` | OTP storage | ✅ |

---

## 🧪 Test Commands

### Send OTP (Browser Console)
\`\`\`javascript
fetch('/api/auth/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@gmail.com' })
})
.then(r => r.json())
.then(d => console.log(d))
\`\`\`

### Verify OTP (Browser Console)
\`\`\`javascript
fetch('/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@gmail.com', otp: '123456' })
})
.then(r => r.json())
.then(d => console.log(d))
\`\`\`

---

## 🚨 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Email service not configured" | Missing env vars | Set GMAIL_USER & GMAIL_APP_PASSWORD in Vercel |
| "Invalid app password" | Wrong password format | Check Gmail → Security → App passwords |
| OTP not arriving | Email spam filtered | Check Gmail spam folder, add to safe senders |
| "OTP not found" | Code expired (>5 min) | Request new OTP |
| "Invalid OTP code" | Wrong code | Check you copied all 6 digits |
| 500 error | Gmail connection failed | Check env vars, restart server, check Gmail status |

---

## ✅ Pre-Launch Checklist

\`\`\`
☐ Gmail account created
☐ 2FA enabled on Gmail
☐ App password generated (16 chars)
☐ GMAIL_USER set in Vercel
☐ GMAIL_APP_PASSWORD set in Vercel (with spaces!)
☐ GMAIL_FROM_NAME set in Vercel
☐ App redeployed after adding vars
☐ Deployment shows "Ready"
☐ Tested on production URL
☐ Emails arriving in inbox
☐ OTP code is 6 digits
☐ Code expires after 5 min
☐ Auto-login works
\`\`\`

---

## 📱 User Journey

\`\`\`
Homepage
  ↓
Click "Login" / "Sign In"
  ↓
See Login Modal/Page
  ↓
Choose: Password OR OTP Tab
  ↓
[OTP Flow]
  - Enter email
  - Click "Send OTP"
  - Check Gmail
  - Copy 6-digit code
  - Paste code
  - Click "Verify & Login"
  ↓
Auto-redirect to dashboard
  ↓
Virtual account with ₹10,00,000
\`\`\`

---

## 🔐 Architecture Overview

\`\`\`
Browser                 Vercel API           Gmail
│                          │                  │
├─→ Enter email ──────────→ /send-otp         │
│                          │                  │
│                          ├─→ Generate OTP   │
│                          │                  │
│                          ├─→ Store OTP      │
│                          │                  │
│                          ├────────────────→ Send Email
│                          │                  │
│   User copies code ←─────┴──────────────────┤
│   from Gmail             │                  │
│                          │                  │
├─→ Enter OTP ────────────→ /verify-otp       │
│                          │                  │
│                          ├─→ Validate OTP   │
│                          │                  │
│                          ├─→ Create session │
│                          │                  │
│   Auto-redirect ←────────┴─────────────────
│   to dashboard
\`\`\`

---

## 💡 Tips & Tricks

### Tip 1: Speed Up Gmail
- Gmail can take 5-10 seconds to deliver emails
- Check spam folder first
- Use the same Gmail for testing

### Tip 2: Debug Locally
- Set `NODE_ENV=development` in your dev server
- OTP will be logged to console
- You can see errors in the response

### Tip 3: Regenerate App Password
- If password leaks, regenerate immediately in Gmail
- Old password stops working instantly
- No need to update multiple places

### Tip 4: Multiple Test Accounts
- Create multiple Gmail accounts for testing
- Each gets its own app password
- Good for testing signup flow

### Tip 5: Monitor OTPs
- Check `/DEPLOY_OTP_LIVE.md` for production monitoring
- Vercel function logs show all OTP requests
- Can see success/failure rates

---

## 🎯 Next Steps

1. **Just starting?** → Read `/QUICK_START_OTP.md`
2. **Ready to deploy?** → Read `/DEPLOY_OTP_LIVE.md`
3. **Got errors?** → Read `/OTP_TROUBLESHOOTING.md`
4. **Want details?** → Read `/GMAIL_OTP_SETUP.md`

---

## 📞 Quick Help

**Q: Is it really free?**
A: Yes! Gmail SMTP is free, Nodemailer is free, no API costs.

**Q: How many OTPs can I send?**
A: Gmail allows ~500 emails/day from free accounts. For production, consider increasing.

**Q: What if user loses email access?**
A: They need to sign up with a different email or recover their Gmail account.

**Q: Can I customize the email template?**
A: Yes! Edit the HTML in `/app/api/auth/send-otp/route.ts` in the `generateEmailHTML()` function.

**Q: Does it work on mobile?**
A: Yes! Fully responsive. Works on all devices.

**Q: What about security?**
A: OTPs are 6-digit codes valid for 5 minutes. Industry standard security.

---

## 📊 Expected Performance

- **Email delivery:** 1-10 seconds (usually instant)
- **OTP verification:** <100ms
- **API response:** <500ms
- **User experience:** Smooth, no loading spinners needed

---

**Ready to go?** 🚀 → Start with `/QUICK_START_OTP.md`

Last updated: 2026-01-18
