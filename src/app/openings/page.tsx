import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { MIN_FIT_SCORE } from "@/lib/jobs/run";
import { pageRange, parsePage, totalPages } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, type JobOpening } from "@/lib/types";
import { dismissOpening } from "./actions";
import { FindJobsButton } from "./FindJobsButton";

// "Find jobs now" scores listings with Claude, which can take a while.
export const maxDuration = 300;

type View = "good" | "low";

export default async function OpeningsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string }>;
}) {
  const params = await searchParams;
  const view: View = params.view === "low" ? "low" : "good";
  const page = parsePage(params.page);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  const visible = () => supabase.from("job_openings").select("id", { count: "exact", head: true }).eq("dismissed", false);
  let query = supabase.from("job_openings").select("*", { count: "exact" }).eq("dismissed", false);
  query = view === "good" ? query.gte("fit_score", MIN_FIT_SCORE) : query.lt("fit_score", MIN_FIT_SCORE);

  const [{ data, error, count }, good, low] = await Promise.all([
    query
      .order("fit_score", { ascending: false, nullsFirst: false })
      .order("discovered_at", { ascending: false })
      .range(from, to),
    visible().gte("fit_score", MIN_FIT_SCORE),
    visible().lt("fit_score", MIN_FIT_SCORE),
  ]);

  if (error) return <p className="text-red-600">Couldn&apos;t load openings: {error.message}</p>;
  const openings = (data ?? []) as JobOpening[];
  const total = count ?? 0;
  const pages = totalPages(total);
  const hrefFor = (p: number) => `/openings?${new URLSearchParams({ ...(view === "low" && { view }), page: String(p) })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Openings</h1>
          <p className="text-sm text-muted">The agent checks for new matches every morning.</p>
        </div>
        <FindJobsButton />
      </div>

      <nav className="flex gap-2 text-sm">
        <Tab href="/openings" active={view === "good"} label={`Good matches (${good.count ?? 0})`} />
        <Tab href="/openings?view=low" active={view === "low"} label={`Below ${MIN_FIT_SCORE}% (${low.count ?? 0})`} />
      </nav>
      {view === "low" && (
        <p className="text-sm text-muted">
          Jobs the agent scored as weaker fits. They&apos;re kept here in case one is still worth a look.
        </p>
      )}

      {openings.length === 0 && total > 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          This page is empty.{" "}
          <Link href={hrefFor(1)} className="text-accent">
            Back to page 1
          </Link>
        </div>
      ) : openings.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          {view === "low"
            ? "No weaker matches yet."
            : "No openings yet. Add your CV in Settings, then press \"Find jobs now\"."}
        </div>
      ) : (
        <ul className="space-y-2">
          {openings.map((job) => (
            <li key={job.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <a href={job.url} target="_blank" rel="noreferrer" className="font-medium hover:text-accent">
                    {job.title}
                  </a>
                  <p className="text-sm text-muted">
                    {job.company}
                    {job.work_mode && ` · ${WORK_MODE_LABELS[job.work_mode]}`}
                    {job.location && ` · ${job.location}`}
                  </p>
                </div>
                {job.fit_score !== null && (
                  <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                    {job.fit_score}% fit
                  </span>
                )}
              </div>
              {job.fit_reason && <p className="mt-2 text-sm">{job.fit_reason}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span>via {job.source}</span>
                {job.employment_type && <span>{EMPLOYMENT_TYPE_LABELS[job.employment_type]}</span>}
                {job.salary && <span>{job.salary}</span>}
                {job.apply_email ? <span className="text-green-600">Can apply by email</span> : <span>Apply on site</span>}
                <form action={dismissOpening.bind(null, job.id)} className="ml-auto">
                  <button type="submit" className="hover:text-foreground">
                    Dismiss
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={pages} total={total} hrefFor={hrefFor} />
    </div>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 ${
        active ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted"
      }`}
    >
      {label}
    </Link>
  );
}
