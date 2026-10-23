import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreJob, type Fit } from "./score";
import { fetchJSearch } from "./sources/jsearch";
import { fetchRemoteOk } from "./sources/remoteok";
import { fetchRemotive } from "./sources/remotive";
import { isRelevantTitle } from "./text";
import type { RawJob } from "./types";

// Caps per run keep Claude spend and function time predictable.
const MAX_SCORED_PER_RUN = 150;
const SCORE_CONCURRENCY = 10;
// Listings scoring below this aren't worth showing.
export const MIN_FIT_SCORE = 40;

export type RunSummary = {
  fetched: number;
  newCandidates: number;
  scored: number;
  saved: number;
  errors: string[];
};

type Deps = {
  anthropic?: Anthropic;
  fetchSources?: (queries: string[]) => Promise<{ jobs: RawJob[]; errors: string[] }>;
  score?: (cv: string, job: RawJob) => Promise<Fit | null>;
};

export async function fetchAllSources(queries: string[]): Promise<{ jobs: RawJob[]; errors: string[] }> {
  const jsearchKey = process.env.JSEARCH_API_KEY;
  const tasks: [string, Promise<RawJob[]>][] = [
    ["Remotive", fetchRemotive()],
    ["RemoteOK", fetchRemoteOk()],
    ...(jsearchKey
      ? queries.map((q): [string, Promise<RawJob[]>] => [`JSearch "${q}"`, fetchJSearch(q, jsearchKey)])
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

/** Removes duplicates by URL and drops titles that clearly aren't relevant. */
export function selectCandidates(jobs: RawJob[], knownUrls: Set<string>): RawJob[] {
  const seen = new Set(knownUrls);
  const out: RawJob[] = [];
  for (const job of jobs) {
    if (seen.has(job.url) || !isRelevantTitle(job.title)) continue;
    seen.add(job.url);
    out.push(job);
  }
  // Newest first, so the cap keeps the freshest listings.
  return out.sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

export async function runJobSearch(supabase: SupabaseClient, userId: string, deps: Deps = {}): Promise<RunSummary> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("cv_markdown, search_queries")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile?.cv_markdown?.trim()) throw new Error("Add your CV in Settings before searching for jobs.");

  if (!deps.score && !deps.anthropic && !process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set, so jobs can't be scored.");
  }
  const anthropic = deps.anthropic ?? new Anthropic();
  const score = deps.score ?? ((cv: string, job: RawJob) => scoreJob(anthropic, cv, job));
  const { jobs, errors } = await (deps.fetchSources ?? fetchAllSources)(profile.search_queries ?? []);

  // Skip listings already saved or already applied to.
  const [{ data: openings }, { data: applications }] = await Promise.all([
    supabase.from("job_openings").select("url").eq("user_id", userId),
    supabase.from("applications").select("url").eq("user_id", userId).not("url", "is", null),
  ]);
  const known = new Set([...(openings ?? []), ...(applications ?? [])].map((r) => r.url as string));

  const candidates = selectCandidates(jobs, known).slice(0, MAX_SCORED_PER_RUN);
  const fits = await mapWithConcurrency(candidates, SCORE_CONCURRENCY, async (job) => {
    try {
      return await score(profile.cv_markdown, job);
    } catch (e) {
      errors.push(`Scoring "${job.title}": ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  });

  const rows = candidates.flatMap((job, i) => {
    const fit = fits[i];
    if (!fit || fit.score < MIN_FIT_SCORE) return [];
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
    saved: rows.length,
    errors,
  };
}
