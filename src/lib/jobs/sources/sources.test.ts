import { describe, expect, it } from "vitest";
import { parseJSearch } from "./jsearch";
import { parseRemoteOk } from "./remoteok";
import { parseRemotive } from "./remotive";

describe("parseRemotive", () => {
  it("normalizes a listing", () => {
    const [job] = parseRemotive({
      jobs: [
        {
          id: 7,
          url: "https://remotive.com/jobs/7",
          title: "Full Stack Engineer",
          company_name: "Acme",
          job_type: "full_time",
          candidate_required_location: "",
          description: "<p>Email cv@acme.io</p>",
          publication_date: "2026-10-20T10:00:00",
        },
      ],
    });
    expect(job).toMatchObject({
      externalId: "remotive:7",
      workMode: "remote",
      employmentType: "full_time",
      location: "Worldwide",
      applyEmail: "cv@acme.io",
    });
  });
});

describe("parseRemoteOk", () => {
  it("skips the legal notice and formats salary", () => {
    const jobs = parseRemoteOk([
      { legal: "notice" } as never,
      { id: "1", url: "https://remoteok.com/1", position: "Vue Developer", company: "Beta", salary_min: 60000, salary_max: 90000 },
    ]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].salary).toBe("$60k–$90k/year");
  });
});

describe("parseJSearch", () => {
  it("uses the apply link, publisher and remote flag", () => {
    const [job] = parseJSearch({
      data: [
        {
          job_id: "abc",
          job_title: "React Developer",
          employer_name: "Gamma",
          job_publisher: "LinkedIn",
          job_apply_link: "https://linkedin.com/jobs/abc",
          job_is_remote: false,
          job_description: "Hybrid, Doha",
          job_employment_type: "FULLTIME",
          job_city: "Doha",
          job_country: "QA",
        },
        { job_id: "no-link", job_title: "Dropped" },
      ],
    });
    expect(job).toMatchObject({
      source: "LinkedIn (JSearch)",
      url: "https://linkedin.com/jobs/abc",
      workMode: "hybrid",
      location: "Doha, QA",
      employmentType: "full_time",
    });
  });
});
