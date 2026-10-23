import { describe, expect, it } from "vitest";
import { extractSalary, extractTechStack } from "./listing";

describe("extractTechStack", () => {
  it("lists technologies in the order they appear, without false matches", () => {
    const text =
      "We use Vue 3 and Nuxt with TypeScript, a Node.js API on AWS, and PostgreSQL. JavaScript experience is a plus. React Native is not needed.";
    expect(extractTechStack(text)).toEqual(["Vue", "Nuxt", "TypeScript", "Node.js", "AWS", "PostgreSQL", "JavaScript", "React Native"]);
  });

  it("doesn't read JavaScript as Java or Go from ordinary words", () => {
    expect(extractTechStack("JavaScript developers who go the extra mile")).toEqual(["JavaScript"]);
  });

  it("handles missing text", () => {
    expect(extractTechStack(null)).toEqual([]);
  });
});

describe("extractSalary", () => {
  it.each([
    ["Pay: $120,000 - $150,000 per year, plus equity", "$120,000 - $150,000 per year"],
    ["Compensation $80k–$100k", "$80k–$100k"],
    ["Salary QAR 15,000 per month", "QAR 15,000 per month"],
    ["Rate: $45/hour", "$45/hour"],
    ["USD 4,000 to 5,000 a month", "USD 4,000 to 5,000 a month"],
  ])("finds the salary in %j", (text, expected) => {
    expect(extractSalary(text)).toBe(expected);
  });

  it("ignores small amounts that aren't pay", () => {
    expect(extractSalary("Get a $5 coffee voucher and $500 learning budget")).toBeNull();
  });
});
