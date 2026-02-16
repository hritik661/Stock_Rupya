import { NextResponse, type NextRequest } from "next/server"
import { generateOTP, storeOTP } from "@/lib/otp-store"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const emailRaw = body.email
    const email = emailRaw.toLowerCase().trim()

    console.log("[OTP-SEND] Raw email input:", emailRaw)
    console.log("[OTP-SEND] Normalized email:", email)

    if (!email || !email.includes("@")) {
      console.log("[OTP-SEND] ❌ Invalid email format")
      return NextResponse.json({ success: false, error: "Valid email is required" }, { status: 400 })
    }

    // Generate OTP
    const otp = generateOTP()
    await storeOTP(email, otp)

    console.log("[OTP-SEND] ✅ Generated OTP:", otp, "for email:", email)
    console.log("[OTP-SEND] Expires at:", new Date(Date.now() + 15 * 60 * 1000).toISOString())

    let emailSent = false
    let emailError = ""

    // Check Gmail credentials
    console.log("[OTP-SEND] 🔍 Environment Check:")
    console.log("[OTP-SEND] GMAIL_USER exists:", !!process.env.GMAIL_USER)
    console.log("[OTP-SEND] GMAIL_USER value:", process.env.GMAIL_USER ? "✓ Set" : "✗ Missing")
    console.log("[OTP-SEND] GMAIL_APP_PASSWORD exists:", !!process.env.GMAIL_APP_PASSWORD)
    console.log("[OTP-SEND] GMAIL_APP_PASSWORD value:", process.env.GMAIL_APP_PASSWORD ? "✓ Set" : "✗ Missing")
    console.log("[OTP-SEND] All env vars:", Object.keys(process.env).filter(k => k.includes("GMAIL") || k.includes("DATABASE")).sort())
    
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error(
        "[OTP-SEND] ❌ Gmail not configured. GMAIL_USER:", !!process.env.GMAIL_USER,
        "GMAIL_APP_PASSWORD:", !!process.env.GMAIL_APP_PASSWORD
      )
      console.error("[OTP-SEND] ❌ Available environment variables:", Object.keys(process.env).filter(k => k.startsWith("GMAIL") || k.startsWith("DATABASE")).sort())
      console.error("[OTP-SEND] See /GMAIL_OTP_SETUP.md for instructions")
      return NextResponse.json(
        {
          success: false,
          error: "Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables. See GMAIL_OTP_SETUP.md for help.",
        },
        { status: 500 }
      )
    }

    try {
      console.log("[OTP-SEND] 📧 Attempting to send OTP via Gmail SMTP...")
      console.log("[OTP-SEND] Gmail user:", process.env.GMAIL_USER)

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      })

      // Test connection
      await transporter.verify()
      console.log("[OTP-SEND] ✅ Gmail connection verified")

      const mailOptions = {
        from: process.env.GMAIL_FROM_NAME
          ? `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`
          : process.env.GMAIL_USER,
        to: email,
        subject: "Your StockAI Login Code",
        html: generateEmailHTML(otp),
      }

      await transporter.sendMail(mailOptions)
      emailSent = true
      console.log("[OTP-SEND] ✅ OTP email sent successfully via Gmail to:", email)
    } catch (gmailError) {
      console.error("[OTP-SEND] ❌ Error sending via Gmail:", gmailError)
      emailError = gmailError instanceof Error ? gmailError.message : "Gmail error"
    }

    if (!emailSent) {
      console.error("[OTP-SEND] ❌ Failed to send OTP email. Error:", emailError)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to send OTP: ${emailError}. Check that Gmail credentials are correct and 2FA is enabled.`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email. Please check your inbox and spam folder.",
    })
  } catch (error) {
    console.error("[OTP-SEND] ❌ Error in send-otp:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send OTP",
      },
      { status: 500 },
    )
  }
}

function generateEmailHTML(otp: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .email-box { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 40px 20px; text-align: center; }
          .content h2 { margin: 0 0 10px 0; color: #333; font-size: 20px; }
          .otp-box { background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); padding: 30px 20px; border-radius: 8px; margin: 30px 0; border: 2px dashed #667eea; }
          .otp { font-size: 48px; font-weight: bold; letter-spacing: 12px; color: #667eea; font-family: 'Courier New', monospace; font-weight: 900; }
          .info { color: #666; font-size: 14px; margin: 20px 0 0 0; line-height: 1.6; }
          .warning { background: #fff3cd; padding: 12px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107; color: #856404; font-size: 13px; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-box">
            <div class="header">
              <h1>🚀 StockAI</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your OTP Code</p>
            </div>
            <div class="content">
              <h2>Login Verification</h2>
              <p style="color: #666; margin: 0 0 20px 0;">Enter this code to sign in to your StockAI account:</p>
              <div class="otp-box">
                <div class="otp">${otp}</div>
              </div>
              <div class="info">
                <strong>Code expires in 15 minutes</strong>
              </div>
              <div class="warning">
                ⚠️ Never share this code with anyone. We will never ask you for it.
              </div>
              <p style="color: #999; font-size: 13px; margin-top: 20px;">If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p style="margin: 0;">© 2026 StockAI. All rights reserved.</p>
              <p style="margin: 5px 0 0 0;">This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}
