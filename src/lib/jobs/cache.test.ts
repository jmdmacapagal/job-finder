import { beforeEach, describe, expect, it, vi } from "vitest";
import { cached, clearSourceCache } from "./cache";

describe("cached", () => {
  beforeEach(clearSourceCache);

  it("reuses a result for an hour", async () => {
    const load = vi.fn(async () => [1]);
    await cached("feed", load, 0);
    await cached("feed", load, 59 * 60 * 1000);
    expect(load).toHaveBeenCalledTimes(1);
    await cached("feed", load, 61 * 60 * 1000);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("doesn't keep failures", async () => {
    const fail = vi.fn(async () => {
      throw new Error("down");
    });
    await expect(cached("feed", fail, 0)).rejects.toThrow("down");
    const ok = vi.fn(async () => [1]);
    await expect(cached("feed", ok, 1)).resolves.toEqual([1]);
  });
});
