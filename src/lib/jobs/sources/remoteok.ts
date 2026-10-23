import { extractApplyEmail, normalizeEmploymentType, stripHtml } from "../text";
import type { RawJob } from "../types";

type RemoteOkJob = {
  id?: string | number;
  url?: string;
  position?: string;
  company?: string;
  location?: string;
  date?: string;
  description?: string;
  salary_min?: number;
  salary_max?: number;
  tags?: string[];
};

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)}–${fmt(max)}/year`;
  return `${fmt((min || max)!)}/year`;
}

export function parseRemoteOk(json: RemoteOkJob[]): RawJob[] {
  // The first element is a legal notice, not a job.
  return json
    .filter((j) => j.id && j.position && j.url)
    .map((j) => {
      const description = stripHtml(j.description ?? "");
      return {
        source: "RemoteOK",
        externalId: `remoteok:${j.id}`,
        title: j.position!,
        company: j.company ?? "Unknown",
        url: j.url!,
        location: j.location || "Worldwide",
        workMode: "remote" as const,
        employmentType: normalizeEmploymentType(j.tags?.find((t) => /time|contract|freelance/i.test(t))),
        salary: formatSalary(j.salary_min, j.salary_max),
        description,
        postedAt: j.date ?? null,
        applyEmail: extractApplyEmail(description),
      };
    });
}

export async function fetchRemoteOk(fetchImpl: typeof fetch = fetch): Promise<RawJob[]> {
  const res = await fetchImpl("https://remoteok.com/api", {
    headers: { "User-Agent": "job-finder (personal job search app)" },
  });
  if (!res.ok) throw new Error(`RemoteOK responded ${res.status}`);
  return parseRemoteOk(await res.json());
}
