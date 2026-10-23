import { describe, expect, it } from "vitest";
import { selectCandidates } from "./run";
import type { RawJob } from "./types";

const job = (overrides: Partial<RawJob>): RawJob => ({
  source: "Test",
  externalId: "x",
  title: "Full Stack Engineer",
  company: "Acme",
  url: "https://example.com/1",
  location: null,
  workMode: "remote",
  employmentType: null,
  salary: null,
  description: "",
  postedAt: null,
  applyEmail: null,
  ...overrides,
});

describe("selectCandidates", () => {
  it("drops known URLs, duplicates and irrelevant titles, newest first", () => {
    const result = selectCandidates(
      [
        job({ url: "https://a", postedAt: "2026-10-01" }),
        job({ url: "https://a", postedAt: "2026-10-02" }),
        job({ url: "https://b", postedAt: "2026-10-05" }),
        job({ url: "https://known" }),
        job({ url: "https://c", title: "Sales Manager" }),
      ],
      new Set(["https://known"]),
    );
    expect(result.map((j) => j.url)).toEqual(["https://b", "https://a"]);
  });
});
