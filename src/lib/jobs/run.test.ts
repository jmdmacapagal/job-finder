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

const now = new Date("2026-10-28T00:00:00Z");

describe("selectCandidates", () => {
  it("drops known URLs, duplicates and irrelevant titles, newest first", () => {
    const result = selectCandidates(
      [
        job({ url: "https://a", postedAt: "2026-10-01" }),
        job({ url: "https://a", postedAt: "2026-10-02" }),
        job({ url: "https://b", company: "Beta", postedAt: "2026-10-05" }),
        job({ url: "https://known", company: "Gamma" }),
        job({ url: "https://c", title: "Sales Manager" }),
      ],
      new Set(["https://known"]),
      new Set(),
      now,
    );
    expect(result.map((j) => j.url)).toEqual(["https://b", "https://a"]);
  });

  it("drops the same job from another board", () => {
    const result = selectCandidates(
      [
        job({ url: "https://remotive/1", company: "Acme Inc.", title: "Senior Vue Developer" }),
        job({ url: "https://linkedin/1", company: "ACME", title: "Senior Vue Developer (Remote)" }),
        job({ url: "https://jobicy/1", company: "Acme", title: "Senior Vue Developer - Remote, EMEA" }),
        job({ url: "https://applied", company: "Beta LLC", title: "React Engineer" }),
        job({ url: "https://other", company: "Acme", title: "Junior Vue Developer" }),
      ],
      new Set(),
      new Set(["beta|react engineer"]),
      now,
    );
    expect(result.map((j) => j.url)).toEqual(["https://remotive/1", "https://other"]);
  });

  it("keeps same-titled jobs when the company is unknown", () => {
    const result = selectCandidates(
      [job({ url: "https://1", company: "Unknown" }), job({ url: "https://2", company: "Unknown" })],
      new Set(),
      new Set(),
      now,
    );
    expect(result).toHaveLength(2);
  });

  it("drops listings older than 30 days but keeps undated and unparseable ones", () => {
    const result = selectCandidates(
      [
        job({ url: "https://old", company: "A", postedAt: "2026-09-01" }),
        job({ url: "https://new", company: "B", postedAt: "2026-10-20" }),
        job({ url: "https://undated", company: "C", postedAt: null }),
        job({ url: "https://bad", company: "D", postedAt: "not a date" }),
      ],
      new Set(),
      new Set(),
      now,
    );
    expect(result.map((j) => j.url).sort()).toEqual(["https://bad", "https://new", "https://undated"]);
  });
});
