import { describe, expect, it } from "vitest";
import { extractApplyEmail, inferWorkMode, isRelevantTitle, jobKey, normalizeEmploymentType, stripHtml } from "./text";

describe("stripHtml", () => {
  it("removes tags, decodes entities and puts paragraphs on new lines", () => {
    expect(stripHtml("<p>Build &amp; ship</p><p>Vue&nbsp;3</p>")).toBe("Build & ship\nVue 3");
  });
});

describe("extractApplyEmail", () => {
  it("finds the first usable address and skips no-reply ones", () => {
    expect(extractApplyEmail("Questions: noreply@acme.io. Send your CV to Jobs@Acme.io.")).toBe("jobs@acme.io");
  });

  it("returns null when there is no address", () => {
    expect(extractApplyEmail("Apply through our careers page")).toBeNull();
  });
});

describe("inferWorkMode", () => {
  it("prefers hybrid, then remote, then on-site", () => {
    expect(inferWorkMode("Hybrid role, 2 days remote")).toBe("hybrid");
    expect(inferWorkMode("Fully remote")).toBe("remote");
    expect(inferWorkMode("On-site in Doha")).toBe("onsite");
    expect(inferWorkMode("Doha office", null)).toBeNull();
  });
});

describe("normalizeEmploymentType", () => {
  it("maps source spellings", () => {
    expect(normalizeEmploymentType("FULLTIME")).toBe("full_time");
    expect(normalizeEmploymentType("part_time")).toBe("part_time");
    expect(normalizeEmploymentType("CONTRACTOR")).toBe("contract");
    expect(normalizeEmploymentType(undefined)).toBeNull();
  });
});

describe("isRelevantTitle", () => {
  it("keeps engineering roles and drops others", () => {
    expect(isRelevantTitle("Senior Full-Stack Engineer")).toBe(true);
    expect(isRelevantTitle("Vue.js Developer")).toBe(true);
    expect(isRelevantTitle("Product Engineer")).toBe(true);
    expect(isRelevantTitle("UI Developer")).toBe(true);
    expect(isRelevantTitle("Account Executive")).toBe(false);
  });
});

describe("jobKey", () => {
  it("matches the same job across boards", () => {
    expect(jobKey("Acme, Inc.", "Senior Full-Stack Engineer (Remote)")).toBe("acme|senior full stack engineer");
    expect(jobKey("ACME", "Senior Full Stack Engineer - Remote, LATAM")).toBe("acme|senior full stack engineer");
    expect(jobKey("Acme", "Senior Vue Developer")).not.toBe(jobKey("Acme", "Junior Vue Developer"));
  });
});
