import { decodeEntities, extractApplyEmail, inferWorkMode, normalizeEmploymentType, stripHtml } from "../text";
import type { RawJob } from "../types";

// Greenhouse, Lever and Ashby publish each company's job board as a public JSON API,
// made for companies to show their jobs elsewhere. No key is needed. The user lists the
// boards they want in Settings, as the career page links they'd open in a browser.
export type CareerBoard = { ats: "greenhouse" | "lever" | "ashby"; slug: string };

const BOARD_URLS: [RegExp, CareerBoard["ats"]][] = [
  [/^(?:boards|job-boards)\.greenhouse\.io$/, "greenhouse"],
  [/^jobs\.lever\.co$/, "lever"],
  [/^jobs\.ashbyhq\.com$/, "ashby"],
];

/** Reads a career page link like `https://jobs.lever.co/acme`, or null if it isn't one we support. */
export function parseCareerBoard(input: string): CareerBoard | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const ats = BOARD_URLS.find(([host]) => host.test(url.hostname.toLowerCase()))?.[1];
  const slug = url.pathname.split("/").filter(Boolean)[0];
  if (!ats || !slug || !/^[\w.-]+$/.test(slug)) return null;
  return { ats, slug };
}

/** "acme-corp" → "Acme Corp", for boards whose API doesn't name the company. */
export function companyFromSlug(slug: string): string {
  return slug
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

const isoDate = (value: string | number | null | undefined): string | null => {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  company_name?: string;
  location?: { name?: string };
  first_published?: string;
  updated_at?: string;
  content?: string;
};

export function parseGreenhouse(json: { jobs?: GreenhouseJob[] }, slug: string): RawJob[] {
  return (json.jobs ?? []).map((j) => {
    // Greenhouse sends the description as escaped HTML.
    const description = stripHtml(decodeEntities(j.content ?? ""));
    const location = j.location?.name || null;
    return {
      source: "Greenhouse",
      externalId: `greenhouse:${slug}:${j.id}`,
      title: j.title,
      company: j.company_name || companyFromSlug(slug),
      url: j.absolute_url,
      location,
      workMode: inferWorkMode(j.title, location),
      employmentType: null,
      salary: null,
      description,
      postedAt: isoDate(j.first_published ?? j.updated_at),
      applyEmail: extractApplyEmail(description),
    };
  });
}

type LeverPosting = {
  id: string;
  text: string;
  hostedUrl: string;
  categories?: { location?: string; commitment?: string };
  workplaceType?: string;
  createdAt?: number;
  descriptionPlain?: string;
  lists?: { text?: string; content?: string }[];
  additionalPlain?: string;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
};

const LEVER_WORKPLACE: Record<string, RawJob["workMode"]> = { remote: "remote", hybrid: "hybrid", "on-site": "onsite", onsite: "onsite" };

function leverSalary(range: LeverPosting["salaryRange"]): string | null {
  if (!range?.min && !range?.max) return null;
  const amounts = [...new Set([range.min, range.max].filter(Boolean))].join("–");
  const period = range.interval?.replace(/^per-/, "").replace(/-.*$/, "");
  return [range.currency, amounts].filter(Boolean).join(" ") + (period ? `/${period}` : "");
}

export function parseLever(json: LeverPosting[], slug: string): RawJob[] {
  return (Array.isArray(json) ? json : []).map((j) => {
    const description = [
      j.descriptionPlain,
      ...(j.lists ?? []).map((l) => `${l.text ?? ""}\n${stripHtml(l.content ?? "")}`),
      j.additionalPlain,
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim();
    const location = j.categories?.location || null;
    return {
      source: "Lever",
      externalId: `lever:${slug}:${j.id}`,
      title: j.text,
      company: companyFromSlug(slug),
      url: j.hostedUrl,
      location,
      workMode: LEVER_WORKPLACE[j.workplaceType?.toLowerCase() ?? ""] ?? inferWorkMode(j.text, location),
      employmentType: normalizeEmploymentType(j.categories?.commitment),
      salary: leverSalary(j.salaryRange),
      description,
      postedAt: isoDate(j.createdAt),
      applyEmail: extractApplyEmail(description),
    };
  });
}

type AshbyJob = {
  id: string;
  title: string;
  location?: string;
  isRemote?: boolean;
  isListed?: boolean;
  workplaceType?: string;
  employmentType?: string;
  publishedAt?: string;
  jobUrl: string;
  descriptionPlain?: string;
  compensation?: { compensationTierSummary?: string | null };
};

const ASHBY_WORKPLACE: Record<string, RawJob["workMode"]> = { remote: "remote", hybrid: "hybrid", onsite: "onsite" };

export function parseAshby(json: { jobs?: AshbyJob[] }, slug: string): RawJob[] {
  return (json.jobs ?? [])
    .filter((j) => j.isListed !== false)
    .map((j) => {
      const description = j.descriptionPlain ?? "";
      const location = j.location || null;
      return {
        source: "Ashby",
        externalId: `ashby:${slug}:${j.id}`,
        title: j.title,
        company: companyFromSlug(slug),
        url: j.jobUrl,
        location,
        workMode:
          ASHBY_WORKPLACE[j.workplaceType?.toLowerCase() ?? ""] ?? (j.isRemote ? "remote" : inferWorkMode(j.title, location)),
        employmentType: normalizeEmploymentType(j.employmentType),
        salary: j.compensation?.compensationTierSummary || null,
        description,
        postedAt: isoDate(j.publishedAt),
        applyEmail: extractApplyEmail(description),
      };
    });
}

export async function fetchCareerBoard(board: CareerBoard, fetchImpl: typeof fetch = fetch): Promise<RawJob[]> {
  const slug = encodeURIComponent(board.slug);
  const url = {
    greenhouse: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
    lever: `https://api.lever.co/v0/postings/${slug}?mode=json`,
    ashby: `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`,
  }[board.ats];
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`responded ${res.status}${res.status === 404 ? " (check the link in Settings)" : ""}`);
  const json = await res.json();
  if (board.ats === "greenhouse") return parseGreenhouse(json, board.slug);
  if (board.ats === "lever") return parseLever(json, board.slug);
  return parseAshby(json, board.slug);
}
