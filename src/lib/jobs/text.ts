import type { EmploymentType, WorkMode } from "@/lib/types";

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

export function stripHtml(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/h\d)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Addresses that are never a place to send an application.
const NOT_FOR_APPLYING = /^(no-?reply|donotreply|privacy|legal|abuse|unsubscribe)@/i;

/** First email in the text that looks like a place to apply. */
export function extractApplyEmail(text: string): string | null {
  for (const match of text.match(EMAIL) ?? []) {
    const email = match.replace(/\.$/, "").toLowerCase();
    if (!NOT_FOR_APPLYING.test(email)) return email;
  }
  return null;
}

export function inferWorkMode(...texts: (string | null | undefined)[]): WorkMode | null {
  const text = texts.filter(Boolean).join(" ").toLowerCase();
  if (/\bhybrid\b/.test(text)) return "hybrid";
  if (/\b(remote|work from home|wfh|anywhere)\b/.test(text)) return "remote";
  if (/\b(on-?site|in office|in-office)\b/.test(text)) return "onsite";
  return null;
}

export function normalizeEmploymentType(value: string | null | undefined): EmploymentType | null {
  const v = (value ?? "").toLowerCase().replace(/[\s-]/g, "_");
  if (v.includes("part")) return "part_time";
  if (v.includes("full")) return "full_time";
  if (v.includes("contract")) return "contract";
  if (v.includes("freelance")) return "freelance";
  return null;
}

// Cheap title filter so we only spend Claude calls on plausible roles.
const RELEVANT_TITLE =
  /full[\s-]?stack|front[\s-]?end|back[\s-]?end|software (engineer|developer)|web (developer|engineer)|(product|ui|application|applications|platform) (engineer|developer)|react|vue|nuxt|next\.?js|node|typescript|javascript/i;

export function isRelevantTitle(title: string): boolean {
  return RELEVANT_TITLE.test(title);
}

const COMPANY_SUFFIX = /\b(inc|llc|ltd|limited|gmbh|corp|corporation|co|plc|pte|bv|sa|wll)\b/g;
// "(Remote)", "- Remote, EMEA" and similar tails say where, not what, so the same job matches across boards.
const TITLE_TAIL = /\s*(\(.*?\)|\[.*?\]|\s[-–|]\s.*?\b(remote|hybrid|on-?site|anywhere|worldwide)\b.*)$/i;

/**
 * Company plus title, lowercased with punctuation, company suffixes and location tails removed.
 * The same job listed on several boards has different URLs but the same key.
 */
export function jobKey(company: string, title: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${clean(clean(company).replace(COMPANY_SUFFIX, ""))}|${clean(title.replace(TITLE_TAIL, ""))}`;
}

/** Undoes HTML escaping, for feeds that send their HTML as escaped text (Greenhouse, RSS). */
export function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/gi, "&");
}
