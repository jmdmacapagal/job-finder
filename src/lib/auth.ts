/**
 * Emails allowed to use the app, from ALLOWED_EMAILS (comma-separated) or the
 * older single ALLOWED_EMAIL.
 */
export function allowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS || process.env.ALLOWED_EMAIL || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** If no emails are configured, nobody is let in, so a misconfigured deploy fails closed. */
export function isAllowedEmail(email: string | null | undefined): boolean {
  return Boolean(email && allowedEmails().includes(email.trim().toLowerCase()));
}
