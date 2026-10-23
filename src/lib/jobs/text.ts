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
  /full[\s-]?stack|front[\s-]?end|back[\s-]?end|software (engineer|developer)|web (developer|engineer)|react|vue|nuxt|next\.?js|node|typescript|javascript/i;

export function isRelevantTitle(title: string): boolean {
  return RELEVANT_TITLE.test(title);
}
