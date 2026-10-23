import { describe, expect, it } from "vitest";
import { computeStats } from "./stats";

describe("computeStats", () => {
  it("returns zeros for no applications", () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.active).toBe(0);
    expect(stats.responseRate).toBe(0);
  });

  it("counts by status and treats interviewing, offer and rejected as responses", () => {
    const stats = computeStats([
      { status: "applied" },
      { status: "applied" },
      { status: "interviewing" },
      { status: "rejected" },
      { status: "saved" },
    ]);
    expect(stats.total).toBe(5);
    expect(stats.byStatus.applied).toBe(2);
    expect(stats.active).toBe(3);
    // 2 responses out of 4 sent (saved is not sent yet)
    expect(stats.responseRate).toBe(50);
  });
});
