// Pulls quick-scan details out of a listing's description for the Openings cards.

const TECH: [name: string, pattern: RegExp][] = [
  ["TypeScript", /\btypescript\b/i],
  ["JavaScript", /\bjavascript\b/i],
  ["React Native", /\breact[\s-]?native\b/i],
  ["React", /\breact(?:\.?js)?\b(?![\s-]?native)/i],
  ["Next.js", /\bnext\.?js\b/i],
  ["Vue", /\bvue(?:\.?js)?\b/i],
  ["Nuxt", /\bnuxt(?:\.?js)?\b/i],
  ["Angular", /\bangular\b/i],
  ["Svelte", /\bsvelte(?:kit)?\b/i],
  ["Tailwind", /\btailwind\b/i],
  ["Node.js", /\bnode(?:\.?js)?\b/i],
  ["Express", /\bexpress(?:\.?js)?\b/i],
  ["NestJS", /\bnest\.?js\b/i],
  ["GraphQL", /\bgraphql\b/i],
  ["Python", /\bpython\b/i],
  ["Django", /\bdjango\b/i],
  ["FastAPI", /\bfastapi\b/i],
  ["PHP", /\bphp\b/i],
  ["Laravel", /\blaravel\b/i],
  ["Ruby on Rails", /\b(?:ruby on rails|rails)\b/i],
  ["Java", /\bjava\b(?!\s?script)/i],
  ["Kotlin", /\bkotlin\b/i],
  ["Go", /\b(?:golang|go\s?lang)\b/i],
  ["Rust", /\brust\b/i],
  ["C#", /(?:^|[^\w])c#/i],
  [".NET", /\.net\b/i],
  ["Swift", /\bswift\b/i],
  ["Flutter", /\bflutter\b/i],
  ["PostgreSQL", /\bpostgres(?:ql)?\b/i],
  ["MySQL", /\bmysql\b/i],
  ["MongoDB", /\bmongo(?:db)?\b/i],
  ["Redis", /\bredis\b/i],
  ["Supabase", /\bsupabase\b/i],
  ["Firebase", /\bfirebase\b/i],
  ["AWS", /\baws\b|\bamazon web services\b/i],
  ["GCP", /\bgcp\b|\bgoogle cloud\b/i],
  ["Azure", /\bazure\b/i],
  ["Docker", /\bdocker\b/i],
  ["Kubernetes", /\bkubernetes\b|\bk8s\b/i],
  ["Terraform", /\bterraform\b/i],
  ["Contentful", /\bcontentful\b/i],
  ["Strapi", /\bstrapi\b/i],
  ["Shopify", /\bshopify\b/i],
  ["WordPress", /\bwordpress\b/i],
  ["Playwright", /\bplaywright\b/i],
  ["Cypress", /\bcypress\b/i],
  ["Jest", /\bjest\b/i],
  ["Vitest", /\bvitest\b/i],
  ["AI / LLM", /\b(?:llms?|openai|anthropic|claude|gpt-?\d?|gen(?:erative)?\s?ai|langchain)\b/i],
];

/** Technologies the text mentions, in the order they first appear. */
export function extractTechStack(text: string | null | undefined, limit = 10): string[] {
  if (!text) return [];
  return TECH.map(([name, pattern]) => ({ name, at: text.search(pattern) }))
    .filter((t) => t.at >= 0)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit)
    .map((t) => t.name);
}

const CURRENCY = String.raw`(?:US\$|\$|USD|€|EUR|£|GBP|QAR|AED|SAR|PHP|₱)`;
const AMOUNT = String.raw`\d[\d,]*(?:\.\d+)?\s?[kK]?`;
const PERIOD = String.raw`(?:\s?(?:\/|per|a|an)\s?(?:year|yr|annum|month|mo|hour|hr|day))`;
const SALARY = new RegExp(
  String.raw`${CURRENCY}\s?${AMOUNT}(?:\s?(?:-|–|—|to)\s?${CURRENCY}?\s?${AMOUNT})?${PERIOD}?`,
  "i",
);

/**
 * First pay figure in the text, like "$120k – $150k" or "QAR 15,000 per month".
 * Small bare amounts ("$5 credit") are ignored unless they come with a period.
 */
export function extractSalary(text: string | null | undefined): string | null {
  if (!text) return null;
  const global = new RegExp(SALARY.source, "gi");
  for (const match of text.matchAll(global)) {
    const found = match[0].trim();
    const first = found.match(/\d[\d,]*(?:\.\d+)?/)![0];
    const value = Number(first.replace(/,/g, "")) * (/^\D*[\d,.]+\s?k/i.test(found) ? 1000 : 1);
    const hasPeriod = new RegExp(PERIOD + "$", "i").test(found);
    if (value >= 1000 || hasPeriod) return found.replace(/\s+/g, " ");
  }
  return null;
}
