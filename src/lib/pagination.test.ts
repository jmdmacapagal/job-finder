import { describe, expect, it } from "vitest";
import { pageRange, parsePage, totalPages } from "./pagination";

describe("pagination", () => {
  it("parses page numbers safely", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });

  it("computes inclusive ranges", () => {
    expect(pageRange(1, 20)).toEqual([0, 19]);
    expect(pageRange(3, 20)).toEqual([40, 59]);
  });

  it("always has at least one page", () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(20, 20)).toBe(1);
    expect(totalPages(21, 20)).toBe(2);
  });
});
