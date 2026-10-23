import { extractApplyEmail, normalizeEmploymentType, stripHtml } from "../text";
import type { RawJob } from "../types";

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
};

export function parseRemotive(json: { jobs?: RemotiveJob[] }): RawJob[] {
  return (json.jobs ?? []).map((j) => {
    const description = stripHtml(j.description ?? "");
    return {
      source: "Remotive",
      externalId: `remotive:${j.id}`,
      title: j.title,
      company: j.company_name,
      url: j.url,
      location: j.candidate_required_location || "Worldwide",
      workMode: "remote",
      employmentType: normalizeEmploymentType(j.job_type),
      salary: j.salary || null,
      description,
      postedAt: j.publication_date ?? null,
      applyEmail: extractApplyEmail(description),
    };
  });
}

// Remotive asks for at most a few requests a day, so fetch the whole
// software-dev category once and filter locally.
export async function fetchRemotive(fetchImpl: typeof fetch = fetch): Promise<RawJob[]> {
  const res = await fetchImpl("https://remotive.com/api/remote-jobs?category=software-dev&limit=150");
  if (!res.ok) throw new Error(`Remotive responded ${res.status}`);
  return parseRemotive(await res.json());
}

