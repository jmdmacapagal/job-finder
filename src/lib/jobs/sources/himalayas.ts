import { extractApplyEmail, normalizeEmploymentType, stripHtml } from "../text";
import type { RawJob } from "../types";
import { countryFor } from "./jsearch";

// Himalayas lists remote jobs posted by the employers themselves, with each job's
// countries spelled out. Its terms ask us to keep `applicationLink` unchanged and credit Himalayas.
type HimalayasJob = {
  guid?: string;
  title?: string;
  companyName?: string;
  applicationLink?: string;
  locationRestrictions?: string[];
  pubDate?: number;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string | null;
  employmentType?: string;
  description?: string;
};

function formatSalary(j: HimalayasJob): string | null {
  if (!j.minSalary && !j.maxSalary) return null;
  const fmt = (n: number) => `${Math.round(n / 1000)}k`;
  const range = [...new Set([j.minSalary, j.maxSalary].filter(Boolean).map((n) => fmt(n!)))].join("–");
  return `${j.currency ?? "USD"} ${range}/year`;
}

export function parseHimalayas(json: { jobs?: HimalayasJob[] }): RawJob[] {
  return (json.jobs ?? [])
    .filter((j) => j.title && j.applicationLink)
    .map((j) => {
      const description = stripHtml(j.description ?? "");
      return {
        source: "Himalayas",
        externalId: `himalayas:${j.guid ?? j.applicationLink}`,
        title: j.title!,
        company: j.companyName ?? "Unknown",
        url: j.applicationLink!,
        location: j.locationRestrictions?.length ? j.locationRestrictions.join(", ") : "Worldwide",
        workMode: "remote" as const,
        employmentType: normalizeEmploymentType(j.employmentType),
        salary: formatSalary(j),
        description,
        postedAt: j.pubDate ? new Date(j.pubDate * 1000).toISOString() : null,
        applyEmail: extractApplyEmail(description),
      };
    });
}

// Words that describe where or how, not the role. Himalayas filters those with parameters instead.
const NOT_KEYWORDS = /\b(remote|jobs?|worldwide|hybrid|on-?site|qatar|doha|philippines|manila|cebu|uae|dubai|abu dhabi)\b/gi;

/** Turns a saved search into Himalayas parameters: keywords, plus the country it names or worldwide-only. */
export function himalayasParams(query: string): URLSearchParams {
  const params = new URLSearchParams({ q: query.replace(NOT_KEYWORDS, " ").replace(/\s+/g, " ").trim(), sort: "recent" });
  const country = countryFor(query);
  if (country) params.set("country", country);
  else params.set("worldwide", "true");
  return params;
}

export async function fetchHimalayas(query: string, fetchImpl: typeof fetch = fetch): Promise<RawJob[]> {
  // A free key raises the limit from a shared public allowance to 10,000 requests a day.
  const key = process.env.HIMALAYAS_API_KEY;
  const res = await fetchImpl(`https://himalayas.app/jobs/api/search?${himalayasParams(query)}`, {
    headers: key ? { Authorization: `Bearer ${key}` } : undefined,
  });
  if (!res.ok) throw new Error(`Himalayas responded ${res.status}`);
  return parseHimalayas(await res.json());
}
