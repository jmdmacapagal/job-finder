import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { SendEmail } from "./gmail";
import { applyToSelected, attachmentName } from "./run";

type Row = Record<string, unknown>;

/** Just enough of the Supabase query builder for applyToSelected. */
function fakeSupabase(openings: Row[], cv = "# JM Macapagal\nEngineer") {
  const inserted: Row[] = [];
  const updated: { values: Row; id: unknown }[] = [];
  const from = (table: string) => {
    let op: "select" | "insert" | "update" = "select";
    let values: Row = {};
    const filters: Record<string, unknown> = {};
    const builder = {
      select: () => builder,
      eq: (col: string, val: unknown) => ((filters[col] = val), builder),
      is: () => builder,
      order: () => builder,
      limit: () => builder,
      insert: (v: Row) => ((op = "insert"), (values = v), builder),
      update: (v: Row) => ((op = "update"), (values = v), builder),
      maybeSingle: () => Promise.resolve({ data: { cv_markdown: cv }, error: null }),
      then(resolve: (r: unknown) => void) {
        if (op === "insert") inserted.push(values);
        if (op === "update") updated.push({ values, id: filters.id });
        resolve(
          table === "job_openings" && op === "select"
            ? { data: openings, error: null, count: openings.length }
            : { data: null, error: null },
        );
      },
    };
    return builder;
  };
  return { client: { from } as unknown as SupabaseClient, inserted, updated };
}

const opening = (overrides: Row): Row => ({
  id: "o1",
  title: "Full Stack Engineer",
  company: "Acme",
  location: "Remote",
  description: "Vue and Node",
  url: "https://acme.test/jobs/1",
  source: "Remotive",
  work_mode: "remote",
  employment_type: "full_time",
  salary: null,
  apply_email: null,
  ...overrides,
});

const tailor = vi.fn(async () => ({ subject: "Full Stack Engineer - JM", cover_email: "Hi", cv_markdown: "# JM\n- Vue" }));

describe("applyToSelected", () => {
  it("emails listings with an address and prepares the rest", async () => {
    const send = vi.fn<SendEmail>(async () => {});
    const db = fakeSupabase([opening({ id: "a", apply_email: "jobs@acme.test" }), opening({ id: "b", company: "Beta" })]);

    const summary = await applyToSelected(db.client, "u1", { tailor, send, today: () => "2026-10-23" });

    expect(summary.emailed).toEqual(["Full Stack Engineer at Acme"]);
    expect(summary.prepared).toEqual(["Full Stack Engineer at Beta"]);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toMatchObject({ to: "jobs@acme.test", subject: "Full Stack Engineer - JM" });
    // Jobs run concurrently, so compare in a fixed order.
    const byId = (a: unknown[], b: unknown[]) => String(a[0]).localeCompare(String(b[0]));
    expect(db.inserted.map((r) => [r.opening_id, r.status, r.applied_on]).sort(byId)).toEqual([
      ["a", "applied", "2026-10-23"],
      ["b", "saved", null],
    ]);
    expect(db.updated.map((u) => [u.id, u.values.selected]).sort(byId)).toEqual([
      ["a", false],
      ["b", false],
    ]);
  });

  it("leaves an email listing selected when Gmail isn't set up", async () => {
    const db = fakeSupabase([opening({ apply_email: "jobs@acme.test" })]);
    const summary = await applyToSelected(db.client, "u1", { tailor });
    expect(summary.errors[0]).toMatch(/haven't added your Gmail/);
    expect(db.inserted).toEqual([]);
    expect(db.updated).toEqual([]);
  });
});

describe("attachmentName", () => {
  it("names the PDF after the candidate and company", () => {
    expect(attachmentName("# Juan Miguel Macapagal\n", "Acme, Inc.")).toBe("Juan Miguel Macapagal CV - Acme Inc..pdf");
  });
});
