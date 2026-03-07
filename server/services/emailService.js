const nodemailer = require("nodemailer");
const env = require("../config/env");
const logger = require("../utils/logger");

let transporter = null;
let smtpVerified = false;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn("SMTP not configured — emails will not be sent");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || "smtp.gmail.com",
    port: Number(env.SMTP_PORT) || 587,
    secure: Number(env.SMTP_PORT) === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return transporter;
};

const verifySmtpConnection = async () => {
  const transport = getTransporter();
  if (!transport) return false;
  try {
    await transport.verify();
    smtpVerified = true;
    logger.info("SMTP connection verified successfully");
    return true;
  } catch (err) {
    logger.error(`SMTP connection verification failed: ${err.message}`);
    return false;
  }
};

const sendVerificationEmail = async (to, name, otp) => {
  const transport = getTransporter();
  if (!transport) {
    logger.warn(`Skipping verification email to ${to} — SMTP not configured`);
    return;
  }

  await transport.sendMail({
    from: `"VerifyHub" <${env.SMTP_USER}>`,
    to,
    subject: "Your VerifyHub OTP Code",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
        <h2 style="color: #1e293b;">Welcome, ${name}!</h2>
        <p style="color: #475569; line-height: 1.6;">
          Thanks for signing up for VerifyHub. Use this OTP to verify your email address.
        </p>
        <div style="margin-top: 16px; margin-bottom: 8px; font-size: 28px; letter-spacing: 6px; font-weight: 700; color: #0f172a;">
          ${otp}
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
          This OTP expires in 10 minutes. If you didn't create an account, ignore this email.
        </p>
      </div>
    `,
  });

  logger.info(`Verification email sent to ${to}`);
};

const sendDocumentAssignedEmail = async ({ to, receiverName, senderName, documentTitle, documentId }) => {
  const transport = getTransporter();
  if (!transport) return;

  const documentUrl = `${env.CLIENT_URL}/documents/${documentId}`;

  await transport.sendMail({
    from: `"VerifyHub" <${env.SMTP_USER}>`,
    to,
    subject: `New document assigned: ${documentTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: auto; padding: 24px;">
        <h2 style="margin: 0 0 12px; color: #0f172a;">Document assigned to you</h2>
        <p style="color: #334155; line-height: 1.6; margin: 0 0 12px;">
          Hi ${receiverName || "there"}, ${senderName || "A sender"} assigned the document
          <strong>${documentTitle}</strong> for your signature.
        </p>
        <a href="${documentUrl}" style="display:inline-block; margin-top: 10px; background:#2563eb; color:#fff; text-decoration:none; padding:10px 16px; border-radius:8px; font-weight:600;">
          Open Document
        </a>
      </div>
    `,
  });
};

const sendDocumentSignedEmail = async ({ to, senderName, signerName, documentTitle, documentId }) => {
  const transport = getTransporter();
  if (!transport) return;

  const documentUrl = `${env.CLIENT_URL}/documents/${documentId}`;

  await transport.sendMail({
    from: `"VerifyHub" <${env.SMTP_USER}>`,
    to,
    subject: `Document signed: ${documentTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: auto; padding: 24px;">
        <h2 style="margin: 0 0 12px; color: #0f172a;">Document signed</h2>
        <p style="color: #334155; line-height: 1.6; margin: 0 0 12px;">
          Hi ${senderName || "there"}, ${signerName || "A signer"} signed your document
          <strong>${documentTitle}</strong>.
        </p>
        <a href="${documentUrl}" style="display:inline-block; margin-top: 10px; background:#16a34a; color:#fff; text-decoration:none; padding:10px 16px; border-radius:8px; font-weight:600;">
          View Signed Document
        </a>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (to, name, otp) => {
  const transport = getTransporter();
  if (!transport) {
    logger.warn(`Skipping password reset email to ${to} — SMTP not configured`);
    return;
  }

  await transport.sendMail({
    from: `"VerifyHub" <${env.SMTP_USER}>`,
    to,
    subject: "Your VerifyHub Password Reset OTP",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
        <h2 style="color: #1e293b;">Hello ${name}!</h2>
        <p style="color: #475569; line-height: 1.6;">
          Use this OTP to reset your VerifyHub password.
        </p>
        <div style="margin-top: 16px; margin-bottom: 8px; font-size: 28px; letter-spacing: 6px; font-weight: 700; color: #0f172a;">
          ${otp}
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
          This OTP expires in 10 minutes. If you didn't request a reset, ignore this email.
        </p>
      </div>
    `,
  });

  logger.info(`Password reset email sent to ${to}`);
};

const sendIdentityVerificationOtpEmail = async (to, name, otp) => {
  const transport = getTransporter();
  if (!transport) {
    logger.warn(`Skipping identity verification OTP email to ${to} — SMTP not configured`);
    return;
  }

  await transport.sendMail({
    from: `"VerifyHub" <${env.SMTP_USER}>`,
    to,
    subject: "Your VerifyHub Identity Verification OTP",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
        <h2 style="color: #1e293b;">Identity verification request</h2>
        <p style="color: #475569; line-height: 1.6;">
          Hi ${name}, use this OTP to confirm your identity verification submission.
        </p>
        <div style="margin-top: 16px; margin-bottom: 8px; font-size: 28px; letter-spacing: 6px; font-weight: 700; color: #0f172a;">
          ${otp}
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
          This OTP expires in 10 minutes.
        </p>
      </div>
    `,
  });

  logger.info(`Identity verification OTP sent to ${to}`);
};

module.exports = {
  verifySmtpConnection,
  sendVerificationEmail,
  sendDocumentAssignedEmail,
  sendDocumentSignedEmail,
  sendPasswordResetEmail,
  sendIdentityVerificationOtpEmail,
};
