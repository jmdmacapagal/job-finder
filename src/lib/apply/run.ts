import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapWithConcurrency } from "@/lib/concurrency";
import { createGmailDraftSaver, createGmailSender, gmailAccountFor, type OutgoingEmail, type SaveDraft, type SendEmail } from "./gmail";
import { renderCvPdf } from "./pdf";
import { tailorApplication, type ListingForTailoring, type Tailored } from "./tailor";

// Each application takes Claude about half a minute, and the request has five minutes.
export const MAX_APPLY_PER_RUN = 10;
const APPLY_CONCURRENCY = 5;

/**
 * Off by default: applications are saved as Gmail drafts for the user to
 * review and send themselves. Set APPLY_SEND_EMAILS=true to send directly.
 */
export function sendingEnabled(): boolean {
  return process.env.APPLY_SEND_EMAILS === "true";
}

export type ApplySummary = {
  emailed: string[];
  drafted: string[];
  prepared: string[];
  remaining: number;
  errors: string[];
};

type Deps = {
  /** The signed-in user's email, which decides whether they may use the GMAIL_USER account. */
  userEmail?: string | null;
  tailor?: (cv: string, listing: ListingForTailoring) => Promise<Tailored>;
  /** Overrides the user's Gmail account; null means no Gmail is set up. */
  send?: SendEmail | null;
  saveDraft?: SaveDraft | null;
  /** Overrides APPLY_SEND_EMAILS. */
  sendEmails?: boolean;
  today?: () => string;
};

type Opening = ListingForTailoring & {
  id: string;
  url: string;
  source: string;
  work_mode: string | null;
  employment_type: string | null;
  salary: string | null;
  apply_email: string | null;
};

/** "# Jane Doe" on the CV's first heading line, or "CV" if there isn't one. */
export function cvName(cv: string): string {
  return cv.match(/^#\s+(.+)$/m)?.[1].trim() ?? "CV";
}

export function attachmentName(cv: string, company: string): string {
  const clean = (s: string) => s.replace(/[^\p{L}\p{N} .&-]+/gu, "").replace(/\s+/g, " ").trim();
  return `${clean(cvName(cv))} CV - ${clean(company) || "Application"}.pdf`;
}

/**
 * Applies to every selected opening: Claude tailors the CV and cover email.
 * Listings with an email address get a Gmail draft (or, with sending turned
 * on, a sent email), and the rest are saved with the tailored CV ready to use
 * on the company site.
 */
export async function applyToSelected(supabase: SupabaseClient, userId: string, deps: Deps = {}): Promise<ApplySummary> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("cv_markdown, gmail_address, gmail_app_password_encrypted")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  const cv: string = profile?.cv_markdown ?? "";
  if (!cv.trim()) throw new Error("Add your CV in Settings before applying.");

  if (!deps.tailor && !process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set, so applications can't be written.");
  }

  const { data, error, count } = await supabase
    .from("job_openings")
    .select("id, title, company, location, description, url, source, work_mode, employment_type, salary, apply_email", {
      count: "exact",
    })
    .eq("user_id", userId)
    .eq("selected", true)
    .is("applied_at", null)
    .order("fit_score", { ascending: false, nullsFirst: false })
    .limit(MAX_APPLY_PER_RUN);
  if (error) throw new Error(error.message);
  const openings = (data ?? []) as Opening[];

  const anthropic = deps.tailor ? null : new Anthropic();
  const tailor = deps.tailor ?? ((c: string, l: ListingForTailoring) => tailorApplication(anthropic!, c, l));
  const sendEmails = deps.sendEmails ?? sendingEnabled();
  const account = gmailAccountFor(profile, deps.userEmail);
  // Recipients see the name from the CV unless the owner set GMAIL_FROM_NAME.
  const named = account && { ...account, fromName: account.fromName || cvName(cv) };
  const deliver: ((email: OutgoingEmail) => Promise<void>) | null = sendEmails
    ? (deps.send !== undefined ? deps.send : named && createGmailSender(named))
    : (deps.saveDraft !== undefined ? deps.saveDraft : named && createGmailDraftSaver(named));
  const today = deps.today ?? (() => new Date().toISOString().slice(0, 10));

  const summary: ApplySummary = { emailed: [], drafted: [], prepared: [], remaining: Math.max(0, (count ?? 0) - openings.length), errors: [] };

  await mapWithConcurrency(openings, APPLY_CONCURRENCY, async (job) => {
    const label = `${job.title} at ${job.company}`;
    try {
      if (job.apply_email && !deliver) {
        throw new Error("this one applies by email, but you haven't added your Gmail in Settings");
      }
      const tailored = await tailor(cv, job);

      let sentAt: string | null = null;
      let draftSavedAt: string | null = null;
      if (job.apply_email && deliver) {
        const pdf = await renderCvPdf(tailored.cv_markdown, `${cvName(cv)} CV`);
        await deliver({
          to: job.apply_email,
          subject: tailored.subject,
          text: tailored.cover_email,
          attachment: { filename: attachmentName(cv, job.company), content: pdf },
        });
        if (sendEmails) sentAt = new Date().toISOString();
        else draftSavedAt = new Date().toISOString();
      }

      const { error: insertError } = await supabase.from("applications").insert({
        user_id: userId,
        opening_id: job.id,
        company: job.company,
        role: job.title,
        url: job.url,
        source: job.source,
        location: job.location,
        work_mode: job.work_mode,
        employment_type: job.employment_type,
        salary: job.salary,
        status: sentAt ? "applied" : "saved",
        applied_on: sentAt ? today() : null,
        contact_email: job.apply_email,
        email_subject: tailored.subject,
        cover_email: tailored.cover_email,
        tailored_cv: tailored.cv_markdown,
        sent_at: sentAt,
        draft_saved_at: draftSavedAt,
        notes: sentAt
          ? `Emailed to ${job.apply_email} by the agent.`
          : draftSavedAt
            ? `Draft to ${job.apply_email} saved in Gmail. Review and send it there, then mark it as sent here.`
            : "Apply on the company site with the tailored CV.",
      });
      if (insertError) {
        const done = sentAt ? "the email was sent" : draftSavedAt ? "the Gmail draft was saved" : null;
        throw new Error(done ? `${done}, but saving the application failed: ${insertError.message}` : insertError.message);
      }

      await supabase
        .from("job_openings")
        .update({ applied_at: new Date().toISOString(), selected: false })
        .eq("id", job.id);
      (sentAt ? summary.emailed : draftSavedAt ? summary.drafted : summary.prepared).push(label);
    } catch (e) {
      summary.errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  return summary;
}
