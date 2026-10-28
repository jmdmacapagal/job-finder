import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapWithConcurrency } from "@/lib/concurrency";
import { gmailAccountFor } from "@/lib/apply/gmail";
import { cached } from "./cache";
import { scoreJob, type Candidate, type Fit } from "./score";
import { fetchJobAlerts } from "./sources/alerts";
import { fetchCareerBoard, parseCareerBoard } from "./sources/careers";
import { fetchHimalayas } from "./sources/himalayas";
import { fetchJobicy } from "./sources/jobicy";
import { fetchJSearch } from "./sources/jsearch";
import { fetchRemoteOk } from "./sources/remoteok";
import { fetchRemotive } from "./sources/remotive";
import { fetchWeWorkRemotely } from "./sources/weworkremotely";
import { isRelevantTitle, jobKey } from "./text";
import type { RawJob } from "./types";

// Caps per run keep Claude spend and function time predictable.
const MAX_SCORED_PER_RUN = 150;
const SCORE_CONCURRENCY = 10;
// Listings scoring below this are saved (so they're never re-scored) but hidden from Openings.
export const MIN_FIT_SCORE = 40;
// Older listings are usually filled already. Jobs with no date are kept.
const MAX_AGE_DAYS = 30;
// A saved job hides a same-company, same-title listing from another board for this long.
const SAME_JOB_WINDOW_DAYS = 30;

export type RunSummary = {
  fetched: number;
  newCandidates: number;
  scored: number;
  saved: number;
  errors: string[];
};

export type SourceInput = {
  queries: string[];
  careerBoards: string[];
  /** Reads the user's job-alert emails, or null when they haven't turned that on. */
  alerts: (() => Promise<RawJob[]>) | null;
};

type Deps = {
  anthropic?: Anthropic;
  /** The signed-in user's email, so the owner's environment Gmail account can be used for job alerts. */
  userEmail?: string | null;
  fetchSources?: (input: SourceInput) => Promise<{ jobs: RawJob[]; errors: string[] }>;
  score?: (candidate: Candidate, job: RawJob) => Promise<Fit | null>;
};

export async function fetchAllSources({
  queries,
  careerBoards,
  alerts,
}: SourceInput): Promise<{ jobs: RawJob[]; errors: string[] }> {
  const jsearchKey = process.env.JSEARCH_API_KEY;
  const boards = careerBoards.flatMap((link) => {
    const board = parseCareerBoard(link);
    return board ? [board] : [];
  });
  const tasks: [string, Promise<RawJob[]>][] = [
    ["Remotive", cached("remotive", () => fetchRemotive())],
    ["RemoteOK", cached("remoteok", () => fetchRemoteOk())],
    ["Jobicy", cached("jobicy", () => fetchJobicy())],
    ["We Work Remotely", cached("weworkremotely", () => fetchWeWorkRemotely())],
    ...boards.map((b): [string, Promise<RawJob[]>] => [
      `Career page ${b.ats}/${b.slug}`,
      cached(`${b.ats}:${b.slug.toLowerCase()}`, () => fetchCareerBoard(b)),
    ]),
    ...(alerts ? [["Job alert emails", alerts()] as [string, Promise<RawJob[]>]] : []),
    ...queries.map((q): [string, Promise<RawJob[]>] => [
      `Himalayas "${q}"`,
      cached(`himalayas:${q.toLowerCase()}`, () => fetchHimalayas(q)),
    ]),
    ...(jsearchKey
      ? queries.map((q): [string, Promise<RawJob[]>] => [
          `JSearch "${q}"`,
          cached(`jsearch:${q.toLowerCase()}`, () => fetchJSearch(q, jsearchKey)),
        ])
      : []),
  ];

  const results = await Promise.allSettled(tasks.map(([, p]) => p));
  const jobs: RawJob[] = [];
  const errors: string[] = jsearchKey ? [] : ["JSEARCH_API_KEY is not set, so LinkedIn and Indeed listings were skipped"];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") jobs.push(...r.value);
    else errors.push(`${tasks[i][0]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
  });
  return { jobs, errors };
}

/** A key for spotting the same job on another board, or null when the company is unknown. */
function sameJobKey(company: string | null | undefined, title: string | null | undefined): string | null {
  if (!company || !title || /^unknown$/i.test(company.trim())) return null;
  return jobKey(company, title);
}

/**
 * Removes jobs already seen (by URL, or by company and title from another board),
 * stale listings, and titles that clearly aren't relevant.
 */
export function selectCandidates(
  jobs: RawJob[],
  knownUrls: Set<string>,
  knownKeys: Set<string> = new Set(),
  now = new Date(),
): RawJob[] {
  const seenUrls = new Set(knownUrls);
  const seenKeys = new Set(knownKeys);
  const oldest = now.getTime() - MAX_AGE_DAYS * 86_400_000;
  const out: RawJob[] = [];
  for (const job of jobs) {
    if (seenUrls.has(job.url) || !isRelevantTitle(job.title)) continue;
    if (job.postedAt && new Date(job.postedAt).getTime() < oldest) continue;
    const key = sameJobKey(job.company, job.title);
    if (key && seenKeys.has(key)) continue;
    seenUrls.add(job.url);
    if (key) seenKeys.add(key);
    out.push(job);
  }
  // Newest first, so the cap keeps the freshest listings.
  return out.sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
}

export async function runJobSearch(supabase: SupabaseClient, userId: string, deps: Deps = {}): Promise<RunSummary> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("cv_markdown, search_queries, work_preferences, career_boards, read_job_alerts, gmail_address, gmail_app_password_encrypted")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile?.cv_markdown?.trim()) throw new Error("Add your CV in Settings before searching for jobs.");

  if (!deps.score && !deps.anthropic && !process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set, so jobs can't be scored.");
  }
  const anthropic = deps.anthropic ?? new Anthropic();
  const score = deps.score ?? ((candidate: Candidate, job: RawJob) => scoreJob(anthropic, candidate, job));
  const candidate: Candidate = { cv: profile.cv_markdown, preferences: profile.work_preferences ?? "" };
  let alerts: SourceInput["alerts"] = null;
  const alertErrors: string[] = [];
  if (profile.read_job_alerts) {
    try {
      const account = gmailAccountFor(profile, deps.userEmail);
      if (account) alerts = () => fetchJobAlerts(account, anthropic);
      else alertErrors.push("Job alert emails are on, but no Gmail account is set up in Settings");
    } catch (e) {
      // A bad CREDENTIALS_KEY shouldn't stop the other sources.
      alertErrors.push(`Job alert emails: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const fetched = await (deps.fetchSources ?? fetchAllSources)({
    queries: profile.search_queries ?? [],
    careerBoards: profile.career_boards ?? [],
    alerts,
  });
  const { jobs } = fetched;
  const errors = [...alertErrors, ...fetched.errors];

  // Skip listings already saved or already applied to.
  const since = new Date(Date.now() - SAME_JOB_WINDOW_DAYS * 86_400_000).toISOString();
  const [{ data: openings }, { data: applications }] = await Promise.all([
    supabase.from("job_openings").select("url, company, title, discovered_at").eq("user_id", userId),
    supabase.from("applications").select("url, company, role").eq("user_id", userId),
  ]);
  const knownUrls = new Set(
    [...(openings ?? []), ...(applications ?? [])].map((r) => r.url as string | null).filter((u): u is string => !!u),
  );
  // Recent openings and every application, so a job applied to never comes back from another board.
  const knownKeys = new Set(
    [
      ...(openings ?? []).filter((o) => o.discovered_at >= since).map((o) => sameJobKey(o.company, o.title)),
      ...(applications ?? []).map((a) => sameJobKey(a.company, a.role)),
    ].filter((k): k is string => !!k),
  );

  const candidates = selectCandidates(jobs, knownUrls, knownKeys).slice(0, MAX_SCORED_PER_RUN);
  const fits = await mapWithConcurrency(candidates, SCORE_CONCURRENCY, async (job) => {
    try {
      return await score(candidate, job);
    } catch (e) {
      errors.push(`Scoring "${job.title}": ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  });

  const rows = candidates.flatMap((job, i) => {
    const fit = fits[i];
    if (!fit) return [];
    return [
      {
        user_id: userId,
        external_id: job.externalId,
        title: job.title,
        company: job.company,
        url: job.url,
        source: job.source,
        location: job.location,
        work_mode: fit.work_mode === "unknown" ? job.workMode : fit.work_mode,
        employment_type: job.employmentType,
        salary: job.salary,
        description: job.description,
        apply_email: job.applyEmail,
        posted_at: job.postedAt,
        fit_score: fit.score,
        fit_reason: fit.reason,
      },
    ];
  });

  if (rows.length > 0) {
    const { error } = await supabase.from("job_openings").upsert(rows, { onConflict: "user_id,url", ignoreDuplicates: true });
    if (error) errors.push(`Saving openings: ${error.message}`);
  }

  return {
    fetched: jobs.length,
    newCandidates: candidates.length,
    scored: fits.filter(Boolean).length,
    saved: rows.filter((r) => r.fit_score >= MIN_FIT_SCORE).length,
    errors,
  };
}
