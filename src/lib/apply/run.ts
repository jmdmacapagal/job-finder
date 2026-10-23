import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapWithConcurrency } from "@/lib/concurrency";
import { createGmailSender, gmailAccountFor, type SendEmail } from "./gmail";
import { renderCvPdf } from "./pdf";
import { tailorApplication, type ListingForTailoring, type Tailored } from "./tailor";

// Each application takes Claude about half a minute, and the request has five minutes.
export const MAX_APPLY_PER_RUN = 10;
const APPLY_CONCURRENCY = 5;

export type ApplySummary = {
  emailed: string[];
  prepared: string[];
  remaining: number;
  errors: string[];
};

type Deps = {
  /** The signed-in user's email, which decides whether they may use the GMAIL_USER account. */
  userEmail?: string | null;
  tailor?: (cv: string, listing: ListingForTailoring) => Promise<Tailored>;
  /** Overrides the user's Gmail account; null turns sending off. */
  send?: SendEmail | null;
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
 * Applies to every selected opening: Claude tailors the CV and cover email,
 * listings with an email address get it sent through Gmail, and the rest are
 * saved as applications with the tailored CV ready to use on the company site.
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
  let send = deps.send ?? undefined;
  if (deps.send === undefined) {
    const account = gmailAccountFor(profile, deps.userEmail);
    // Recipients see the name from the CV unless the owner set GMAIL_FROM_NAME.
    if (account) send = createGmailSender({ ...account, fromName: account.fromName || cvName(cv) });
  }
  const today = deps.today ?? (() => new Date().toISOString().slice(0, 10));

  const summary: ApplySummary = { emailed: [], prepared: [], remaining: Math.max(0, (count ?? 0) - openings.length), errors: [] };

  await mapWithConcurrency(openings, APPLY_CONCURRENCY, async (job) => {
    const label = `${job.title} at ${job.company}`;
    try {
      if (job.apply_email && !send) {
        throw new Error("this one applies by email, but you haven't added your Gmail in Settings");
      }
      const tailored = await tailor(cv, job);

      let sentAt: string | null = null;
      if (job.apply_email && send) {
        const pdf = await renderCvPdf(tailored.cv_markdown, `${cvName(cv)} CV`);
        await send({
          to: job.apply_email,
          subject: tailored.subject,
          text: tailored.cover_email,
          attachment: { filename: attachmentName(cv, job.company), content: pdf },
        });
        sentAt = new Date().toISOString();
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
        notes: sentAt ? `Emailed to ${job.apply_email} by the agent.` : "Apply on the company site with the tailored CV.",
      });
      if (insertError) {
        throw new Error(
          sentAt ? `the email was sent, but saving the application failed: ${insertError.message}` : insertError.message,
        );
      }

      await supabase
        .from("job_openings")
        .update({ applied_at: new Date().toISOString(), selected: false })
        .eq("id", job.id);
      (sentAt ? summary.emailed : summary.prepared).push(label);
    } catch (e) {
      summary.errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  return summary;
}
