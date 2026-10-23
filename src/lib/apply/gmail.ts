import nodemailer from "nodemailer";

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  attachment: { filename: string; content: Uint8Array };
};

export type SendEmail = (email: OutgoingEmail) => Promise<void>;

export function gmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/**
 * Sends from your own Gmail account over SMTP with an app password, and BCCs
 * you so every application also lands in your inbox.
 */
export function createGmailSender(): SendEmail {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set to send applications.");

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    // App passwords are shown with spaces; Gmail accepts them either way.
    auth: { user, pass: pass.replace(/\s+/g, "") },
  });
  const from = process.env.GMAIL_FROM_NAME ? `"${process.env.GMAIL_FROM_NAME}" <${user}>` : user;

  return async (email) => {
    await transport.sendMail({
      from,
      to: email.to,
      bcc: user,
      subject: email.subject,
      text: email.text,
      attachments: [
        { filename: email.attachment.filename, content: Buffer.from(email.attachment.content), contentType: "application/pdf" },
      ],
    });
  };
}
