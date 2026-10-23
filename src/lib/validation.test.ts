import { describe, expect, it } from "vitest";
import { parseApplicationForm } from "./validation";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("parseApplicationForm", () => {
  it("turns empty optional fields into null", () => {
    const result = parseApplicationForm(
      form({ company: "Acme", role: "Fullstack Engineer", url: "", work_mode: "", notes: "  " }),
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      company: "Acme",
      url: null,
      work_mode: null,
      notes: null,
      status: "applied",
    });
  });

  it("requires company and role", () => {
    const result = parseApplicationForm(form({ company: "", role: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects an invalid link and status", () => {
    expect(parseApplicationForm(form({ company: "A", role: "B", url: "not a url" })).success).toBe(false);
    expect(parseApplicationForm(form({ company: "A", role: "B", status: "hired" })).success).toBe(false);
  });
});
