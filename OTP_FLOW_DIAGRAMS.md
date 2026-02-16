# Gmail OTP Flow Diagrams & Visual Guides

## 1️⃣ Setup Flow Diagram

\`\`\`
START
  │
  ├─→ [Gmail Account] ✓ (Have one? Yes!)
  │
  ├─→ [Enable 2FA]
  │   └─→ https://myaccount.google.com/
  │       └─→ Security
  │           └─→ 2-Step Verification
  │               └─→ Enable
  │
  ├─→ [Generate App Password]
  │   └─→ https://myaccount.google.com/
  │       └─→ Security
  │           └─→ App passwords
  │               └─→ Mail + Device
  │                   └─→ Generate → Copy: "abcd efgh ijkl mnop"
  │
  ├─→ [Add to Vercel]
  │   └─→ Vercel Dashboard
  │       └─→ Settings
  │           └─→ Environment Variables
  │               ├─→ GMAIL_USER = your@gmail.com
  │               ├─→ GMAIL_APP_PASSWORD = abcd efgh ijkl mnop
  │               └─→ GMAIL_FROM_NAME = Hrtik Stocks
  │
  ├─→ [Deploy]
  │   └─→ Deployments → Redeploy → Wait for "Ready"
  │
  └─→ [Test] ✓ DONE!
      └─→ Visit /login → OTP Tab → Enter email → Check Gmail
\`\`\`

---

## 2️⃣ User Login Journey

\`\`\`
┌─────────────────────────────────────┐
│        User at Login Page           │
└────────────┬────────────────────────┘
             │
             ├─ Sees two tabs:
             │  [Password] [OTP]
             │
             └─→ Chooses [OTP] Tab
                 │
                 ├─→ Enters Email
                 │   (abc@gmail.com)
                 │
                 ├─→ Clicks "Send OTP to Email"
                 │
                 ├─→ [BACKEND PROCESSING]
                 │   ├─ Generate 6-digit code (e.g., 123456)
                 │   ├─ Store with 5-min expiry
                 │   ├─ Send via Gmail SMTP
                 │   └─ Response: "Check your email"
                 │
                 ├─→ ⏳ User waits 5-10 seconds
                 │
                 ├─→ Checks Gmail Inbox
                 │   (or Spam/Promotions folder)
                 │
                 ├─→ Sees Email:
                 │   ┌─────────────────────────┐
                 │   │ 🚀 Hrtik Stocks         │
                 │   │                         │
                 │   │ Login Verification      │
                 │   │                         │
                 │   │ Enter this code:        │
                 │   │ 【 1 2 3 4 5 6 】       │
                 │   │                         │
                 │   │ Code expires: 5 min     │
                 │   └─────────────────────────┘
                 │
                 ├─→ Copies 6-digit code
                 │
                 ├─→ Returns to app
                 │   Pastes code: "123456"
                 │
                 ├─→ Clicks "Verify & Login"
                 │
                 ├─→ [BACKEND PROCESSING]
                 │   ├─ Check code matches
                 │   ├─ Check not expired
                 │   ├─ Delete code (one-time use)
                 │   ├─ Create session
                 │   └─ Response: "Success!"
                 │
                 ├─→ ✓ AUTO-LOGIN
                 │   (No password needed!)
                 │
                 └─→ Redirect to Dashboard
                     └─ Virtual ₹10,00,000 Ready!
\`\`\`

---

## 3️⃣ Technical Architecture

\`\`\`
┌─────────────────────────────────────��────────────────────────┐
│                        FRONTEND (Browser)                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ components/login-form.tsx                              │ │
│  │                                                        │ │
│  │  ┌─────────────────┬──────────────────┐              │ │
│  │  │  [Password Tab] │ 【OTP Tab】     │              │ │
│  │  └────────┬────────┴────────┬─────────┘              │ │
│  │           │                 │                        │ │
│  │           │                 └─→ Email Input          │ │
│  │           │                     Send Button          │ │
│  │           │                     (shows OTP screen)   │ │
│  │           │                         │                │ │
│  │           │                         └─→ OTP Input    │ │
│  │           │                             Verify Button│ │
│  │           │                                         │ │
│  └───────────┴─────────────────────────────────────────┘ │
│              │                                              │
└──────────────┼──────────────────────────────────────────────┘
               │
               ├─→ POST /api/auth/send-otp
               │   Body: { email: "abc@gmail.com" }
               │   Response: { success: true, message: "Check email" }
               │
               └─→ POST /api/auth/verify-otp
                   Body: { email: "abc@gmail.com", otp: "123456" }
                   Response: { success: true, sessionToken: "..." }

┌──────────────────────────────────────────────────────────────┐
│                  BACKEND (Next.js API Routes)               │
│                                                              │
│  /api/auth/send-otp                                        │
│  ├─ Validate email format                                  │
│  ├─ Generate 6-digit random OTP                            │
│  ├─ Store in memory: Map<email, OTP>                       │
│  ├─ Set expiry: NOW + 5 minutes                            │
│  └─ Call nodemailer.sendMail()                             │
│                                                              │
│  /api/auth/verify-otp                                      │
│  ├─ Get OTP from storage                                   │
│  ├─ Check if exists                                        │
│  ├─ Check if not expired                                   │
│  ├─ Check if matches                                       │
│  ├─ Delete OTP (one-time use)                              │
│  └─ Create session token                                   │
│                                                              │
│  contexts/auth-context.tsx                                 │
│  ├─ loginWithOTP(email)                                    │
│  ├─ Auto-create user if not exists                         │
│  ├─ Store session in localStorage                          │
│  └─ Update React state (user logged in)                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                   │
                   └─→ nodemailer.transport.sendMail()
                       │
                       ├─ Service: Gmail
                       ├─ Auth: GMAIL_USER + GMAIL_APP_PASSWORD
                       ├─ To: abc@gmail.com
                       ├─ Subject: "Your Hrtik Stocks Login Code"
                       └─ HTML: Beautiful email template
                           │
                           └─→ Gmail SMTP Server
                               │
                               └─→ 📧 Delivers to abc@gmail.com
\`\`\`

---

## 4️⃣ OTP Lifecycle Timeline

\`\`\`
Timeline:
T=0s    ├─ User clicks "Send OTP"
        ├─ OTP Generated: "123456"
        ├─ Stored in memory with expiry time
        │
T=0-1s  ├─ Email sent via Gmail SMTP
        │
T=1-10s ├─ Gmail delivers email
        │ ✉️ User receives email
        │
T=10s   ├─ User copies code "123456"
        ├─ User pastes in form
        ├─ User clicks "Verify & Login"
        │
T=10.5s ├─ Server receives: email + OTP
        ├─ Lookup OTP in memory
        ├─ Check: NOT EXPIRED? (< 5 min)
        ├─ Check: MATCHES? ("123456" == "123456")
        ├─ Delete OTP (one-time use)
        ├─ Create session
        ├─ Response: SUCCESS
        │
T=11s   ├─ User logged in! ✓
        ├─ Redirect to dashboard
        │
T=60s   ├─ (If another attempt)
        ├─ Same process repeats
        ├─ New OTP generated
        ├─ Old OTP is gone
        │
T=300s  ├─ (Unused OTP expires)
        ├─ OTP exists but expired
        ├─ User must request new OTP
        │
\`\`\`

---

## 5️⃣ Error Handling Flow

\`\`\`
User Action              Check                    Response
───────────────────────────────────────────────────────────────

Send OTP
  ├─ Invalid email? ──→ "Invalid email format"
  ├─ Gmail not set? ──→ "Email service not configured"
  │                    (with setup instructions)
  └─ Success ────────→ "OTP sent! Check your email"

Verify OTP
  ├─ No OTP stored? ──→ "OTP not found. Request new one."
  ├─ Code wrong? ────→ "Invalid OTP code"
  ├─ Expired? ───────→ "OTP expired. Request new one."
  ├─ Wrong format? ──→ "Enter 6 digits"
  └─ Success ────────→ "Success! Logging in..."
                        ↓
                      Auto-redirect to dashboard
\`\`\`

---

## 6️⃣ Database Structure (Future)

Currently OTPs stored in-memory. For production scaling:

\`\`\`sql
-- OTP Codes Table
CREATE TABLE otp_codes (
  email VARCHAR(255) PRIMARY KEY,
  code VARCHAR(6) NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  attempts INT DEFAULT 0
);

-- Users Table (existing)
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  balance DECIMAL(12, 2) DEFAULT 1000000,
  is_prediction_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Audit Log (optional)
CREATE TABLE login_audit (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255),
  method VARCHAR(20), -- 'password' or 'otp'
  success BOOLEAN,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

---

## 7️⃣ Environment Variables Flow

\`\`\`
Development                    Production
    │                              │
    ├─ .env.local ────────────→ Set Locally
    │  GMAIL_USER              npm run dev
    │  GMAIL_APP_PASSWORD      
    │  GMAIL_FROM_NAME         
    │                              │
    │                              ├─ Vercel Dashboard
    │                              │  ├─ Settings
    │                              │  ├─ Environment Variables
    │                              │  └─ Set:
    │                              │    GMAIL_USER
    │                              │    GMAIL_APP_PASSWORD
    │                              │    GMAIL_FROM_NAME
    │                              │
    │                              ├─ Redeploy
    │                              │  └─ Vercel builds new image
    │                              │     with env vars injected
    │                              │
    │                              └─ API routes can access
    │                                 via process.env.GMAIL_USER
    │
    └─────────────→ Available in both dev & prod ✓
\`\`\`

---

## 8️⃣ Security Validation Chain

\`\`\`
Request comes in
  │
  ├─→ [1] Valid email format?
  │   └─ Must contain "@"
  │   └─ Length reasonable
  │
  ├─→ [2] Gmail credentials exist?
  │   └─ GMAIL_USER set?
  │   └─ GMAIL_APP_PASSWORD set?
  │
  ├─→ [3] Can connect to Gmail SMTP?
  │   └─ Test connection
  │   └─ Verify credentials
  │
  ├─→ [4] Send email successful?
  │   └─ No network errors
  │   └─ Gmail accepted it
  │
  ├─→ [5] OTP generated correctly?
  │   └─ 6 digits, random
  │   └─ Expiry time set
  │
  ├─→ [6] OTP stored in memory?
  │   └─ Can be retrieved later
  │   └─ Doesn't expire yet
  │
  └─→ ✓ SUCCESS - User gets "Check your email"
\`\`\`

---

## 9️⃣ Rate Limiting (Vercel)

\`\`\`
Automatic Protection:
├─ Function Invocation: 50 requests/sec (per project)
├─ Concurrent Executions: Based on plan
├─ Memory: 3GB max
├─ Timeout: 60 seconds

OTP Specific:
├─ Email: 1 per 30 seconds per user (app-level)
├─ Verify: Unlimited attempts (6-digit = 1M combos)
│         (Consider adding retry limit in future)
└─ Total: Free tier easily handles thousands of users
\`\`\`

---

## 🔟 Deployment Pipeline

\`\`\`
Local Development
  │
  ├─ Git commit code
  │
  ├─ Git push to main
  │
  ├─ GitHub webhook triggers Vercel
  │
  ├─ Vercel builds project
  │  ├─ npm install
  │  ├─ npm run build
  │  └─ Generate serverless functions
  │
  ├─ Env vars injected
  │  ├─ GMAIL_USER
  │  ├─ GMAIL_APP_PASSWORD
  │  └─ GMAIL_FROM_NAME
  │
  ├─ Deploy to edge locations
  │
  ├─ DNS updated
  │
  └─ Live! ✓
     yourapp.vercel.app
\`\`\`

---

**All diagrams use ASCII art for clarity in markdown!**

For questions, check the other documentation files.
