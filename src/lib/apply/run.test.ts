import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { buildRawEmail, type SaveDraft, type SendEmail } from "./gmail";
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
  it("saves a Gmail draft for listings with an address and sends nothing", async () => {
    const send = vi.fn<SendEmail>(async () => {});
    const saveDraft = vi.fn<SaveDraft>(async () => {});
    const db = fakeSupabase([opening({ id: "a", apply_email: "jobs@acme.test" }), opening({ id: "b", company: "Beta" })]);

    const summary = await applyToSelected(db.client, "u1", { tailor, send, saveDraft, today: () => "2026-10-23" });

    expect(summary.drafted).toEqual(["Full Stack Engineer at Acme"]);
    expect(summary.emailed).toEqual([]);
    expect(summary.prepared).toEqual(["Full Stack Engineer at Beta"]);
    expect(send).not.toHaveBeenCalled();
    expect(saveDraft).toHaveBeenCalledOnce();
    expect(saveDraft.mock.calls[0][0]).toMatchObject({ to: "jobs@acme.test", subject: "Full Stack Engineer - JM" });
    const drafted = db.inserted.find((r) => r.opening_id === "a")!;
    expect(drafted).toMatchObject({ status: "saved", applied_on: null, sent_at: null });
    expect(drafted.draft_saved_at).toEqual(expect.any(String));
  });

  it("emails listings with an address when sending is on, and prepares the rest", async () => {
    const send = vi.fn<SendEmail>(async () => {});
    const db = fakeSupabase([opening({ id: "a", apply_email: "jobs@acme.test" }), opening({ id: "b", company: "Beta" })]);

    const summary = await applyToSelected(db.client, "u1", { tailor, send, sendEmails: true, today: () => "2026-10-23" });

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

describe("buildRawEmail", () => {
  it("builds an email with the recipient, subject and PDF attached", async () => {
    const raw = (
      await buildRawEmail(
        { user: "jm@gmail.test", pass: "x", fromName: "JM Macapagal" },
        { to: "jobs@acme.test", subject: "Engineer - JM", text: "Hi", attachment: { filename: "JM CV.pdf", content: new Uint8Array([37, 80, 68, 70]) } },
      )
    ).toString();
    expect(raw).toMatch(/^To: jobs@acme\.test\r$/m);
    expect(raw).toMatch(/^Subject: Engineer - JM\r$/m);
    expect(raw).toMatch(/^From: "?JM Macapagal"? <jm@gmail\.test>\r$/m);
    expect(raw).toMatch(/Content-Type: application\/pdf; name="JM CV\.pdf"/);
  });
});

describe("attachmentName", () => {
  it("names the PDF after the candidate and company", () => {
    expect(attachmentName("# Juan Miguel Macapagal\n", "Acme, Inc.")).toBe("Juan Miguel Macapagal CV - Acme Inc..pdf");
  });
});
