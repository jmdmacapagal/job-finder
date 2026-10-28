import { extractApplyEmail, normalizeEmploymentType, stripHtml } from "../text";
import type { RawJob } from "../types";

// Jobicy is a curated remote job board. Its fair-use terms ask us to keep the
// Jobicy job URL and to poll at most once an hour.
type JobicyJob = {
  id: number;
  url: string;
  jobTitle: string;
  companyName?: string;
  jobType?: string[] | string;
  jobGeo?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
};

function formatSalary(j: JobicyJob): string | null {
  if (!j.salaryMin && !j.salaryMax) return null;
  const range = [...new Set([j.salaryMin, j.salaryMax].filter(Boolean))].join("–");
  return [j.salaryCurrency, range].filter(Boolean).join(" ") + (j.salaryPeriod ? `/${j.salaryPeriod}` : "");
}

export function parseJobicy(json: { jobs?: JobicyJob[] }): RawJob[] {
  return (json.jobs ?? []).map((j) => {
    const description = stripHtml(j.jobDescription ?? "");
    return {
      source: "Jobicy",
      externalId: `jobicy:${j.id}`,
      title: j.jobTitle,
      company: j.companyName ?? "Unknown",
      url: j.url,
      location: j.jobGeo || "Worldwide",
      workMode: "remote" as const,
      employmentType: normalizeEmploymentType(Array.isArray(j.jobType) ? j.jobType[0] : j.jobType),
      salary: formatSalary(j),
      description,
      postedAt: j.pubDate ?? null,
      applyEmail: extractApplyEmail(description),
    };
  });
}

// One call per run for the whole engineering category, filtered locally like Remotive.
export async function fetchJobicy(fetchImpl: typeof fetch = fetch): Promise<RawJob[]> {
  const res = await fetchImpl("https://jobicy.com/api/v2/remote-jobs?count=100&industry=engineering");
  if (!res.ok) throw new Error(`Jobicy responded ${res.status}`);
  return parseJobicy(await res.json());
}
