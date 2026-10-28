import { describe, expect, it, vi } from "vitest";
import {
  ALERT_SITES,
  alertSearch,
  alertText,
  canonicalAlertUrl,
  fetchJobAlerts,
  siteForSender,
  toRawJobs,
} from "./alerts";
import { companyFromSlug, parseAshby, parseCareerBoard, parseGreenhouse, parseLever } from "./careers";
import { parseWeWorkRemotely } from "./weworkremotely";

describe("parseCareerBoard", () => {
  it("reads Greenhouse, Lever and Ashby links", () => {
    expect(parseCareerBoard("https://boards.greenhouse.io/acme")).toEqual({ ats: "greenhouse", slug: "acme" });
    expect(parseCareerBoard("job-boards.greenhouse.io/acme/jobs/123")).toEqual({ ats: "greenhouse", slug: "acme" });
    expect(parseCareerBoard("https://jobs.lever.co/beta-co?team=eng")).toEqual({ ats: "lever", slug: "beta-co" });
    expect(parseCareerBoard("https://jobs.ashbyhq.com/Gamma")).toEqual({ ats: "ashby", slug: "Gamma" });
  });

  it("rejects other sites", () => {
    expect(parseCareerBoard("https://acme.com/careers")).toBeNull();
    expect(parseCareerBoard("https://jobs.lever.co/")).toBeNull();
    expect(parseCareerBoard("not a link")).toBeNull();
  });
});

describe("companyFromSlug", () => {
  it("makes a readable name", () => {
    expect(companyFromSlug("acme-corp")).toBe("Acme Corp");
  });
});

describe("parseGreenhouse", () => {
  it("unescapes the description and uses first_published", () => {
    const [job] = parseGreenhouse(
      {
        jobs: [
          {
            id: 1,
            title: "Senior Frontend Engineer",
            absolute_url: "https://boards.greenhouse.io/acme/jobs/1",
            company_name: "Acme",
            location: { name: "Remote - EMEA" },
            first_published: "2026-10-20T10:00:00-04:00",
            content: "&lt;p&gt;Vue &amp;amp; Nuxt&lt;/p&gt;",
          },
        ],
      },
      "acme",
    );
    expect(job).toMatchObject({
      source: "Greenhouse",
      externalId: "greenhouse:acme:1",
      company: "Acme",
      location: "Remote - EMEA",
      workMode: "remote",
      description: "Vue & Nuxt",
      postedAt: "2026-10-20T14:00:00.000Z",
    });
  });
});

describe("parseLever", () => {
  it("joins the description lists and reads workplace and pay", () => {
    const [job] = parseLever(
      [
        {
          id: "abc",
          text: "Full Stack Developer",
          hostedUrl: "https://jobs.lever.co/beta/abc",
          categories: { location: "Doha", commitment: "Full-time" },
          workplaceType: "hybrid",
          createdAt: 1761609600000,
          descriptionPlain: "About us",
          lists: [{ text: "You have", content: "<li>React</li>" }],
          salaryRange: { min: 10000, max: 15000, currency: "QAR", interval: "per-month-salary" },
        },
      ],
      "beta",
    );
    expect(job).toMatchObject({
      company: "Beta",
      workMode: "hybrid",
      employmentType: "full_time",
      salary: "QAR 10000–15000/month",
      description: "About us\n\nYou have\nReact",
    });
  });
});

describe("parseAshby", () => {
  it("skips unlisted jobs and maps OnSite", () => {
    const jobs = parseAshby(
      {
        jobs: [
          {
            id: "1",
            title: "Software Engineer",
            jobUrl: "https://jobs.ashbyhq.com/gamma/1",
            workplaceType: "OnSite",
            employmentType: "FullTime",
            isListed: true,
          },
          { id: "2", title: "Hidden", jobUrl: "https://jobs.ashbyhq.com/gamma/2", isListed: false },
        ],
      },
      "gamma",
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ workMode: "onsite", employmentType: "full_time" });
  });
});

describe("parseWeWorkRemotely", () => {
  it("splits company from title and reads the region", () => {
    const xml = `<rss><channel>
      <item>
        <title>Acme Inc: Senior Full-Stack Engineer</title>
        <region>Anywhere in the World</region>
        <type>Full-Time</type>
        <description><![CDATA[<p>Vue &amp; Node</p>]]></description>
        <pubDate>Mon, 27 Oct 2026 12:00:00 +0000</pubDate>
        <link>https://weworkremotely.com/remote-jobs/acme-senior-full-stack-engineer</link>
      </item>
    </channel></rss>`;
    const [job] = parseWeWorkRemotely(xml);
    expect(job).toMatchObject({
      company: "Acme Inc",
      title: "Senior Full-Stack Engineer",
      location: "Anywhere in the World",
      employmentType: "full_time",
      description: "Vue & Node",
      postedAt: "2026-10-27T12:00:00.000Z",
    });
  });
});

const linkedIn = ALERT_SITES.find((s) => s.site === "LinkedIn")!;
const indeed = ALERT_SITES.find((s) => s.site === "Indeed")!;

describe("job alerts", () => {
  it("searches Gmail for alert senders from the last two days", () => {
    expect(alertSearch()).toMatch(/^newer_than:2d from:\(jobalerts-noreply@linkedin\.com OR .*onlinejobs\.ph.*\)$/);
  });

  it("knows the site from the sender", () => {
    expect(siteForSender("LinkedIn Job Alerts <jobalerts-noreply@linkedin.com>")?.site).toBe("LinkedIn");
    expect(siteForSender("OnlineJobs.ph <noreply@onlinejobs.ph>")?.site).toBe("OnlineJobs.ph");
    expect(siteForSender("someone@example.com")).toBeNull();
  });

  it("writes links next to their text", () => {
    const text = alertText('<p><a href="https://x.com/1?a=1&amp;b=2"><b>Vue Developer</b></a> Acme</p><a href="https://x.com/img"><img/></a>', "");
    expect(text).toBe("Vue Developer [https://x.com/1?a=1&b=2] Acme");
  });

  it("keeps only links to the alert's own site, without tracking", () => {
    expect(canonicalAlertUrl("https://www.linkedin.com/comm/jobs/view/4012345678/?trackingId=abc", linkedIn.host)).toBe(
      "https://www.linkedin.com/jobs/view/4012345678/",
    );
    expect(canonicalAlertUrl("https://qa.indeed.com/rc/clk?jk=ab12&from=ja", indeed.host)).toBe(
      "https://qa.indeed.com/viewjob?jk=ab12",
    );
    expect(canonicalAlertUrl("https://evil.example/linkedin.com/jobs/view/1", linkedIn.host)).toBeNull();
    expect(canonicalAlertUrl("http://www.linkedin.com/jobs/view/1", linkedIn.host)).toBeNull();
    expect(canonicalAlertUrl("https://www.onlinejobs.ph/jobseekers/job/vue-dev-123?utm_source=email", /(^|\.)onlinejobs\.ph$/)).toBe(
      "https://www.onlinejobs.ph/jobseekers/job/vue-dev-123",
    );
  });

  it("turns extracted jobs into listings and drops off-site links", () => {
    const jobs = toRawJobs(
      [
        { title: "React Developer", company: "Acme", location: "Doha (Hybrid)", url: "https://www.linkedin.com/jobs/view/1/", summary: null },
        { title: "Phish", company: "Bad", location: null, url: "https://bad.example/1", summary: null },
      ],
      linkedIn,
      new Date("2026-10-27T05:00:00Z"),
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      source: "LinkedIn alert",
      url: "https://www.linkedin.com/jobs/view/1/",
      workMode: "hybrid",
      postedAt: "2026-10-27T05:00:00.000Z",
    });
    expect(jobs[0].description).toContain("job alert email");
  });

  it("skips emails from senders it doesn't know", async () => {
    const parse = vi.fn(async () => ({
      stop_reason: "end_turn",
      parsed_output: {
        jobs: [{ title: "Vue Dev", company: "Acme", location: null, url: "https://www.linkedin.com/jobs/view/9/", summary: null }],
      },
    }));
    const client = { beta: { messages: { parse } } } as never;
    const jobs = await fetchJobAlerts({ user: "me@gmail.com", pass: "x" }, client, async () => [
      { from: "jobalerts-noreply@linkedin.com", subject: "Vue Dev at Acme", body: "Vue Dev [https://www.linkedin.com/jobs/view/9/]", date: null },
      { from: "friend@example.com", subject: "hi", body: "", date: null },
    ]);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(jobs.map((j) => j.url)).toEqual(["https://www.linkedin.com/jobs/view/9/"]);
  });
});
