import nodemailer from "nodemailer";

// Initialize transporter lazily to prevent crashing on load if env vars are missing
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn(
      "⚠️ MAILER WARNING: SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not defined. Sending emails will fallback to server console logs."
    );
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
    return transporter;
  } catch (error) {
    console.error("❌ Failed to initialize nodemailer transporter:", error);
    return null;
  }
}

/**
 * Sends a student verification email using configured SMTP or falling back to server logs
 */
export async function sendVerificationEmail(
  to: string,
  html: string,
  subject: string,
  otpCode: string // Kept for debugging / console fallback when SMTP is not configured
): Promise<{ success: boolean; delivered: boolean; error?: string }> {
  const mailTransporter = getTransporter();
  const from = process.env.EMAIL_FROM || '"UNI-SHARE" <noreply@uni-share.app>';

  if (!mailTransporter) {
    console.log("\n=======================================================");
    console.log(`✉️ FALLBACK EMAIL SENDING TO: ${to}`);
    console.log(`📌 Subject: ${subject}`);
    console.log(`🔑 Verification OTP Code: [ ${otpCode} ]`);
    console.log("=======================================================\n");
    return { success: true, delivered: false };
  }

  try {
    const info = await mailTransporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    console.log(`📧 Email delivered successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, delivered: true };
  } catch (error: any) {
    console.error(`❌ Error sending email to ${to} via SMTP:`, error.message);
    
    // In case SMTP fails, we still log the OTP to make sure the app can be used/tested safely
    console.log("\n⚠️ SMTP FAILED. OTP FALLBACK LOGGER FOR TESTING:");
    console.log(`🔑 Verification OTP Code for ${to}: [ ${otpCode} ]\n`);
    
    return { success: false, delivered: false, error: error.message };
  }
}
