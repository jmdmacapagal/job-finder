import nodemailer from "nodemailer";
import { decryptSecret } from "@/lib/crypto";

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  attachment: { filename: string; content: Uint8Array };
};

export type SendEmail = (email: OutgoingEmail) => Promise<void>;

export type GmailAccount = { user: string; pass: string; fromName?: string };

export type GmailProfile = {
  gmail_address: string | null;
  gmail_app_password_encrypted: string | null;
};

/**
 * The Gmail account a user sends from: the one saved in their Settings, or,
 * for the owner, GMAIL_USER and GMAIL_APP_PASSWORD from the environment.
 * Returns null when the user hasn't set one up.
 */
export function gmailAccountFor(profile: GmailProfile | null, userEmail: string | null | undefined): GmailAccount | null {
  if (profile?.gmail_address && profile.gmail_app_password_encrypted) {
    return { user: profile.gmail_address, pass: decryptSecret(profile.gmail_app_password_encrypted) };
  }
  const envUser = process.env.GMAIL_USER?.trim();
  const envPass = process.env.GMAIL_APP_PASSWORD;
  // The environment account belongs to one person, so only they can send through it.
  if (envUser && envPass && userEmail?.trim().toLowerCase() === envUser.toLowerCase()) {
    return { user: envUser, pass: envPass, fromName: process.env.GMAIL_FROM_NAME };
  }
  return null;
}

/**
 * Sends over Gmail SMTP with an app password, and BCCs the sender so every
 * application also lands in their inbox.
 */
export function createGmailSender({ user, pass, fromName }: GmailAccount): SendEmail {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    // App passwords are shown with spaces; Gmail accepts them either way.
    auth: { user, pass: pass.replace(/\s+/g, "") },
  });
  const from = fromName ? `"${fromName.replace(/"/g, "")}" <${user}>` : user;

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
