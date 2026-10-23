import { extractApplyEmail, inferWorkMode, normalizeEmploymentType } from "../text";
import type { RawJob } from "../types";

// JSearch (RapidAPI) aggregates Google for Jobs, which includes LinkedIn,
// Indeed and company career pages.
type JSearchJob = {
  job_id: string;
  job_title: string;
  employer_name?: string;
  job_publisher?: string;
  job_apply_link?: string;
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

export function parseJSearch(json: { data?: JSearchJob[] }): RawJob[] {
  return (json.data ?? [])
    .filter((j) => j.job_apply_link)
    .map((j) => {
      const description = j.job_description ?? "";
      const location = [j.job_city, j.job_country].filter(Boolean).join(", ") || null;
      return {
        source: j.job_publisher ? `${j.job_publisher} (JSearch)` : "JSearch",
        externalId: `jsearch:${j.job_id}`,
        title: j.job_title,
        company: j.employer_name ?? "Unknown",
        url: j.job_apply_link!,
        location,
        workMode: j.job_is_remote ? "remote" : inferWorkMode(j.job_title, description),
        employmentType: normalizeEmploymentType(j.job_employment_type),
        salary: formatSalary(j),
        description,
        postedAt: j.job_posted_at_datetime_utc ?? null,
        applyEmail: extractApplyEmail(description),
      };
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
  const params = new URLSearchParams({ query, page: "1", num_pages: "1", date_posted: "week" });
  const country = countryFor(query);
  if (country) params.set("country", country);
  const res = await fetchImpl(`https://${host}/search?${params}`, {
    headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": host },
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`JSearch responded ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return parseJSearch(await res.json());
}
