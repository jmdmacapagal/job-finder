import { decodeEntities, extractApplyEmail, normalizeEmploymentType, stripHtml } from "../text";
import type { RawJob } from "../types";

// We Work Remotely publishes an RSS feed per category. Item titles read "Company: Job title".
const CATEGORIES = [
  "remote-full-stack-programming-jobs",
  "remote-front-end-programming-jobs",
  "remote-back-end-programming-jobs",
];

function tag(item: string, name: string): string | null {
  const match = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  if (!match) return null;
  return match[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").trim();
}

export function parseWeWorkRemotely(xml: string): RawJob[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].flatMap(([, item]) => {
    const heading = decodeEntities(tag(item, "title") ?? "");
    const link = tag(item, "link") ?? tag(item, "guid");
    if (!heading || !link) return [];
    const split = heading.indexOf(": ");
    const company = split > 0 ? heading.slice(0, split) : "Unknown";
    const title = split > 0 ? heading.slice(split + 2) : heading;
    const description = stripHtml(decodeEntities(tag(item, "description") ?? ""));
    const posted = new Date(tag(item, "pubDate") ?? "");
    return [
      {
        source: "We Work Remotely",
        externalId: `wwr:${link}`,
        title,
        company,
        url: link,
        location: decodeEntities(tag(item, "region") ?? "") || "Worldwide",
        workMode: "remote" as const,
        employmentType: normalizeEmploymentType(tag(item, "type")),
        salary: null,
        description,
        postedAt: Number.isNaN(posted.getTime()) ? null : posted.toISOString(),
        applyEmail: extractApplyEmail(description),
      },
    ];
  });
}

export async function fetchWeWorkRemotely(fetchImpl: typeof fetch = fetch): Promise<RawJob[]> {
  const feeds = await Promise.all(
    CATEGORIES.map(async (category) => {
      const res = await fetchImpl(`https://weworkremotely.com/categories/${category}.rss`);
      if (!res.ok) throw new Error(`We Work Remotely responded ${res.status}`);
      return parseWeWorkRemotely(await res.text());
    }),
  );
  return feeds.flat();
}
