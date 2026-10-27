import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { decryptSecret } from "@/lib/crypto";

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  attachment: { filename: string; content: Uint8Array };
};

export type SendEmail = (email: OutgoingEmail) => Promise<void>;

/** Saves the email in the account's Drafts folder without sending it. */
export type SaveDraft = (email: OutgoingEmail) => Promise<void>;

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

function mailOptions({ user, fromName }: GmailAccount, email: OutgoingEmail): Mail.Options {
  return {
    from: fromName ? `"${fromName.replace(/"/g, "")}" <${user}>` : user,
    to: email.to,
    subject: email.subject,
    text: email.text,
    attachments: [
      { filename: email.attachment.filename, content: Buffer.from(email.attachment.content), contentType: "application/pdf" },
    ],
  };
}

/** The complete email (headers, body and attachment) as Gmail would store it. */
export async function buildRawEmail(account: GmailAccount, email: OutgoingEmail): Promise<Buffer> {
  const composer = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "windows" });
  const info = await composer.sendMail(mailOptions(account, email));
  return info.message as Buffer;
}

/**
 * Sends over Gmail SMTP with an app password, and BCCs the sender so every
 * application also lands in their inbox.
 */
export function createGmailSender(account: GmailAccount): SendEmail {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    // App passwords are shown with spaces; Gmail accepts them either way.
    auth: { user: account.user, pass: account.pass.replace(/\s+/g, "") },
  });

  return async (email) => {
    await transport.sendMail({ ...mailOptions(account, email), bcc: account.user });
  };
}

/**
 * Saves emails to the account's Gmail Drafts over IMAP, using the same app
 * password as sending. Nothing is sent: the user reviews and sends from Gmail.
 */
export function createGmailDraftSaver(account: GmailAccount): SaveDraft {
  return async (email) => {
    const raw = await buildRawEmail(account, email);
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user: account.user, pass: account.pass.replace(/\s+/g, "") },
      logger: false,
    });
    await client.connect();
    try {
      // Gmail names the folder by the account's language, so find it by its role.
      const folders = await client.list();
      const drafts = folders.find((f) => f.specialUse === "\\Drafts")?.path ?? "[Gmail]/Drafts";
      await client.append(drafts, raw, ["\\Draft", "\\Seen"]);
    } finally {
      await client.logout().catch(() => {});
    }
  };
}
