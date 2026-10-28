import { extractApplyEmail, inferWorkMode, normalizeEmploymentType } from "../text";
import type { RawJob } from "../types";

// JSearch (RapidAPI) aggregates Google for Jobs, which includes LinkedIn,
// Indeed and company career pages.
type ApplyOption = { publisher?: string; apply_link?: string; is_direct?: boolean };

type JSearchJob = {
  job_id: string;
  job_title: string;
  employer_name?: string;
  job_publisher?: string;
  job_apply_link?: string;
  job_apply_is_direct?: boolean;
  apply_options?: ApplyOption[];
  job_description?: string;
  job_is_remote?: boolean;
  job_employment_type?: string;
  job_posted_at_datetime_utc?: string;
  job_city?: string;
  job_country?: string;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_period?: string | null;
};

function formatSalary(j: JSearchJob): string | null {
  if (!j.job_min_salary && !j.job_max_salary) return null;
  const range = [...new Set([j.job_min_salary, j.job_max_salary].filter(Boolean))].join("–");
  return j.job_salary_period ? `${range}/${j.job_salary_period.toLowerCase()}` : range;
}

// The older API returns `data` as the job list; the cursor-based one nests it next to `data.cursor`.
type JSearchResponse = { data?: JSearchJob[] | { jobs?: JSearchJob[]; data?: JSearchJob[]; cursor?: string } };

function jobsIn(json: JSearchResponse): JSearchJob[] {
  const data = json.data;
  if (Array.isArray(data)) return data;
  return data?.jobs ?? data?.data ?? [];
}

// Sites that repost listings they don't own, often stale, behind a sign-up wall or a paid plan.
// Their links are never used, and a job only they carry is dropped.
export const BLOCKED_PUBLISHERS = [
  "JobLeads",
  "Lensa",
  "Jobsora",
  "Jobrapido",
  "Talent.com",
  "Jooble",
  "Learn4Good",
  "WhatJobs",
  "Jobilize",
  "Jobted",
];

// Boards and applicant tracking systems that carry the employer's own posting.
const TRUSTED_PUBLISHERS = [
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "Bayt",
  "GulfTalent",
  "Naukrigulf",
  "JobStreet",
  "Wellfound",
  "Greenhouse",
  "Lever",
  "Workable",
  "Ashby",
  "SmartRecruiters",
  "Workday",
  "BambooHR",
  "Recruitee",
  "Teamtailor",
];

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const matches = (list: string[], publisher = "") => list.some((name) => normalize(publisher).includes(normalize(name)));

export function isBlockedPublisher(publisher: string | null | undefined): boolean {
  return matches(BLOCKED_PUBLISHERS, publisher ?? "");
}

/** The best place to apply: the employer's own site, then a trusted board, then whatever is left that isn't blocked. */
export function pickApplyOption(j: JSearchJob): { publisher: string | null; link: string } | null {
  const options: ApplyOption[] = [
    { publisher: j.job_publisher, apply_link: j.job_apply_link, is_direct: j.job_apply_is_direct },
    ...(j.apply_options ?? []),
  ].filter((o) => o.apply_link && !isBlockedPublisher(o.publisher));
  const best =
    options.find((o) => o.is_direct) ?? options.find((o) => matches(TRUSTED_PUBLISHERS, o.publisher)) ?? options[0];
  return best ? { publisher: best.publisher ?? null, link: best.apply_link! } : null;
}

export function parseJSearch(json: JSearchResponse): RawJob[] {
  return jobsIn(json).flatMap((j) => {
    const apply = pickApplyOption(j);
    if (!apply) return [];
    const description = j.job_description ?? "";
    const location = [j.job_city, j.job_country].filter(Boolean).join(", ") || null;
    return [
      {
        source: apply.publisher ? `${apply.publisher} (JSearch)` : "JSearch",
        externalId: `jsearch:${j.job_id}`,
        title: j.job_title,
        company: j.employer_name ?? "Unknown",
        url: apply.link,
        location,
        workMode: j.job_is_remote ? "remote" : inferWorkMode(j.job_title, description),
        employmentType: normalizeEmploymentType(j.job_employment_type),
        salary: formatSalary(j),
        description,
        postedAt: j.job_posted_at_datetime_utc ?? null,
        applyEmail: extractApplyEmail(description),
      },
    ];
  });
}

// JSearch searches one country at a time and defaults to the US, so local searches must name theirs.
const COUNTRY_HINTS: [RegExp, string][] = [
  [/\b(qatar|doha)\b/i, "qa"],
  [/\b(philippines|manila|cebu)\b/i, "ph"],
  [/\b(uae|dubai|abu dhabi)\b/i, "ae"],
];

export function countryFor(query: string): string | null {
  return COUNTRY_HINTS.find(([pattern]) => pattern.test(query))?.[1] ?? null;
}

export async function fetchJSearch(
  query: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RawJob[]> {
  // RapidAPI routes by host, which must match the one shown in your RapidAPI code snippet.
  const host = process.env.JSEARCH_HOST || "jsearch.p.rapidapi.com";
  const path = process.env.JSEARCH_PATH || "/search-v2";
  const params = new URLSearchParams({
    query,
    num_pages: "1",
    date_posted: "week",
    // Asking JSearch to leave them out keeps the 10 results per request for real listings.
    exclude_job_publishers: BLOCKED_PUBLISHERS.join(","),
  });
  const country = countryFor(query);
  if (country) params.set("country", country);
  const res = await fetchImpl(`https://${host}${path}?${params}`, {
    headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": host },
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`JSearch responded ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return parseJSearch(await res.json());
}
