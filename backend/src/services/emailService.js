const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Setup Nodemailer transporter if SMTP environment variables are present
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send an OTP verification email
 * @param {string} toEmail - Recipient email address
 * @param {string} code - 6-digit OTP code
 * @param {'SIGNUP' | 'PASSWORD_RESET'} type - Verification purpose
 */
async function sendOTPEmail(toEmail, code, type = 'SIGNUP') {
  const isSignup = type === 'SIGNUP';
  const subject = isSignup
    ? `${code} is your Drivora verification code`
    : `${code} is your Drivora password reset code`;

  const heading = isSignup
    ? 'Verify your email address'
    : 'Reset your Drivora password';

  const message = isSignup
    ? 'Thank you for choosing Drivora. Please enter this 6-digit verification code to confirm your email and activate your 15 GB encrypted cloud storage.'
    : 'We received a request to reset your Drivora account password. Please enter this 6-digit verification code to proceed.';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 36px 32px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 28px;">
      <div style="display: inline-block; background: #eff6ff; padding: 12px; border-radius: 16px; margin-bottom: 12px;">
        <span style="font-size: 26px;">☁️</span>
      </div>
      <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px;">Drivora</h1>
      <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0; font-weight: 500;">Secure Cloud Storage • 15 GB Free Quota</p>
    </div>

    <!-- Title -->
    <h2 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 12px 0; text-align: center;">${heading}</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; text-align: center;">${message}</p>

    <!-- OTP Display Box -->
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Your 6-Digit Verification Code</span>
      <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8;">${code}</div>
      <span style="font-size: 11px; color: #64748b; display: block; margin-top: 8px;">Valid for 10 minutes</span>
    </div>

    <!-- Security Notice -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 14px 16px; border: 1px solid #f1f5f9; margin-bottom: 24px;">
      <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
        🔒 <strong>Security Warning:</strong> Never share this code with anyone. Drivora staff will never ask you for your verification code. If you did not request this, you can safely disregard this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">
        © ${new Date().getFullYear()} Drivora Cloud Storage. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
  `;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Drivora Security" <${process.env.SMTP_USER || 'security@drivora.com'}>`,
        to: toEmail,
        subject,
        html: htmlContent,
      });
      console.log(`📧 [EMAIL SENT] Successfully sent ${type} OTP to ${toEmail}. Message ID: ${info.messageId}`);
      return { success: true, delivered: true };
    } catch (err) {
      console.warn(`⚠️ [SMTP ERROR] Could not send via SMTP (${err.message}). Logging code locally.`);
    }
  }

  // Fallback: log code to server console
  console.log(`\n======================================================`);
  console.log(`📧 [DRIVORA VERIFICATION CODE]`);
  console.log(`To: ${toEmail}`);
  console.log(`Type: ${type}`);
  console.log(`Code: >>> ${code} <<<`);
  console.log(`Valid: 10 minutes`);
  console.log(`======================================================\n`);

  return { success: true, delivered: false, code };
}

module.exports = {
  generateOTP,
  sendOTPEmail,
};
