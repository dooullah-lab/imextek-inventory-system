// utils/mailer.js
// Sends emails using Gmail SMTP (same approach as the corporate site).
// Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file.

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendPasswordResetEmail(toEmail, resetLink, name) {
  await transporter.sendMail({
    from: `"ImEx-Tek Inventory" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Reset your ImEx-Tek password",
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #014260; margin-bottom: 8px;">Password Reset</h2>
        <p style="color: #555; line-height: 1.6;">Hi ${name || "there"},</p>
        <p style="color: #555; line-height: 1.6;">
          Someone requested a password reset for your ImEx-Tek account.
          Click the button below to set a new password. This link expires in <strong>30 minutes</strong>.
        </p>
        <a href="${resetLink}" style="display:inline-block;margin:20px 0;background:#014260;color:#fff;
          text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">
          Reset Password
        </a>
        <p style="color: #aaa; font-size: 12px;">
          If you didn't request this, you can safely ignore this email.<br/>
          ImEx-Tek Global Ltd &middot; Cloud Services Division
        </p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
