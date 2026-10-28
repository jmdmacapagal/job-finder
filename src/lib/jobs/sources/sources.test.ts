import { describe, expect, it } from "vitest";
import { himalayasParams, parseHimalayas } from "./himalayas";
import { parseJobicy } from "./jobicy";
import { countryFor, isBlockedPublisher, parseJSearch } from "./jsearch";
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

  it("shows a single figure when min and max match", () => {
    const [job] = parseRemoteOk([
      { id: "2", url: "https://remoteok.com/2", position: "Vue Developer", salary_min: 10000, salary_max: 10000 },
    ]);
    expect(job.salary).toBe("$10k/year");
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

describe("parseJSearch with the cursor-based response", () => {
  it("reads jobs nested next to the cursor", () => {
    const jobs = parseJSearch({
      data: {
        cursor: "abc",
        jobs: [{ job_id: "1", job_title: "Vue Developer", job_apply_link: "https://example.com/1" }],
      },
    });
    expect(jobs.map((j) => j.externalId)).toEqual(["jsearch:1"]);
  });
});

describe("countryFor", () => {
  it("picks the country named in the search", () => {
    expect(countryFor("full stack developer Doha Qatar")).toBe("qa");
    expect(countryFor("react developer Manila")).toBe("ph");
    expect(countryFor("full stack engineer")).toBeNull();
  });
});

describe("parseJSearch apply links", () => {
  it("skips blocked publishers and prefers the employer's own site", () => {
    const [job] = parseJSearch({
      data: {
        jobs: [
          {
            job_id: "1",
            job_title: "Vue Developer",
            job_publisher: "JobLeads",
            job_apply_link: "https://www.jobleads.com/job/1",
            apply_options: [
              { publisher: "Lensa", apply_link: "https://lensa.com/1" },
              { publisher: "LinkedIn", apply_link: "https://linkedin.com/jobs/1" },
              { publisher: "Acme Careers", apply_link: "https://acme.com/careers/1", is_direct: true },
            ],
          },
        ],
      },
    });
    expect(job).toMatchObject({ source: "Acme Careers (JSearch)", url: "https://acme.com/careers/1" });
  });

  it("falls back to a trusted board", () => {
    const [job] = parseJSearch({
      data: [
        {
          job_id: "2",
          job_title: "React Developer",
          job_publisher: "JobLeads",
          job_apply_link: "https://www.jobleads.com/job/2",
          apply_options: [
            { publisher: "Some Board", apply_link: "https://someboard.example/2" },
            { publisher: "Indeed", apply_link: "https://indeed.com/2" },
          ],
        },
      ],
    });
    expect(job.url).toBe("https://indeed.com/2");
  });

  it("drops jobs that only blocked publishers carry", () => {
    const jobs = parseJSearch({
      data: [{ job_id: "3", job_title: "Node Developer", job_publisher: "JobLeads", job_apply_link: "https://www.jobleads.com/3" }],
    });
    expect(jobs).toEqual([]);
  });
});

describe("isBlockedPublisher", () => {
  it("ignores case and punctuation", () => {
    expect(isBlockedPublisher("jobleads.com")).toBe(true);
    expect(isBlockedPublisher("Talent.com")).toBe(true);
    expect(isBlockedPublisher("LinkedIn")).toBe(false);
    expect(isBlockedPublisher(null)).toBe(false);
  });
});

describe("parseHimalayas", () => {
  it("keeps the application link and lists the allowed countries", () => {
    const [job] = parseHimalayas({
      jobs: [
        {
          guid: "https://himalayas.app/companies/acme/jobs/vue-dev",
          title: "Vue Developer",
          companyName: "Acme",
          applicationLink: "https://acme.com/apply",
          locationRestrictions: ["Qatar", "Philippines"],
          pubDate: 1761609600,
          minSalary: 60000,
          maxSalary: 90000,
          currency: "USD",
          employmentType: "Full Time",
          description: "<p>Remote role</p>",
        },
        { title: "No link" },
      ],
    });
    expect(job).toMatchObject({
      source: "Himalayas",
      url: "https://acme.com/apply",
      location: "Qatar, Philippines",
      workMode: "remote",
      employmentType: "full_time",
      salary: "USD 60k–90k/year",
      postedAt: "2025-10-28T00:00:00.000Z",
      description: "Remote role",
    });
  });
});

describe("himalayasParams", () => {
  it("moves the location out of the keywords", () => {
    expect(Object.fromEntries(himalayasParams("full stack developer Doha Qatar"))).toEqual({
      q: "full stack developer",
      sort: "recent",
      country: "qa",
    });
    expect(Object.fromEntries(himalayasParams("remote react developer"))).toEqual({
      q: "react developer",
      sort: "recent",
      worldwide: "true",
    });
  });
});

describe("parseJobicy", () => {
  it("uses the Jobicy job URL and region", () => {
    const [job] = parseJobicy({
      jobs: [
        {
          id: 9,
          url: "https://jobicy.com/jobs/9-vue-developer",
          jobTitle: "Vue Developer",
          companyName: "Beta",
          jobType: ["Full-Time"],
          jobGeo: "EMEA",
          salaryMin: 50000,
          salaryMax: 70000,
          salaryCurrency: "USD",
          salaryPeriod: "year",
        },
      ],
    });
    expect(job).toMatchObject({
      externalId: "jobicy:9",
      url: "https://jobicy.com/jobs/9-vue-developer",
      location: "EMEA",
      employmentType: "full_time",
      salary: "USD 50000–70000/year",
    });
  });
});
