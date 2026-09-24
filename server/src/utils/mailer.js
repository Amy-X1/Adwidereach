// Minimal mailer: uses SMTP when configured, otherwise logs to console
// (so password-reset stays functional in local dev without email credentials).
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) { nodemailer = null; }

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!nodemailer || !isSmtpConfigured()) return null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail({ to, subject, text, html }) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@adwidereach.com';
  if (!transporter) {
    // Dev fallback — log instead of sending so the flow can still be tested.
    console.log(`[mailer:dev] To: ${to} | Subject: ${subject} | Text: ${text}`);
    return { delivered: false, reason: 'SMTP not configured' };
  }
  await transporter.sendMail({ from, to, subject, text, html });
  return { delivered: true };
}

function resetCodeEmail(code) {
  const text = `Your AdWideReach password reset code is: ${code}

It expires in 10 minutes. If you did not request this, ignore this email.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
      <h2 style="margin:0 0 8px">Reset your password</h2>
      <p style="color:#555">Use this code to reset your password. It expires in <strong>10 minutes</strong>.</p>
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;background:#f4f6ff;border-radius:8px;padding:16px;margin:16px 0">${code}</div>
      <p style="color:#888;font-size:13px">If you did not request this, you can safely ignore this email.</p>
    </div>`;
  return { text, html };
}

function verifyCodeEmail(code) {
  const text = `Welcome to AdWideReach! Your email verification code is: ${code}

It expires in 30 minutes. Enter it on the verification screen to activate your account.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
      <h2 style="margin:0 0 8px">Verify your email</h2>
      <p style="color:#555">Welcome to AdWideReach! Enter this code to verify your email and activate your account. It expires in <strong>30 minutes</strong>.</p>
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;background:#f4f6ff;border-radius:8px;padding:16px;margin:16px 0">${code}</div>
      <p style="color:#888;font-size:13px">If you did not create this account, you can safely ignore this email.</p>
    </div>`;
  return { text, html };
}

module.exports = { sendMail, resetCodeEmail, verifyCodeEmail, isSmtpConfigured };