import { Pagination } from "@/components/Pagination";
import { pageRange, parsePage, totalPages } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, type JobOpening } from "@/lib/types";
import { dismissOpening } from "./actions";
import { FindJobsButton } from "./FindJobsButton";

// "Find jobs now" scores listings with Claude, which can take a while.
export const maxDuration = 300;

export default async function OpeningsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = parsePage((await searchParams).page);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("job_openings")
    .select("*", { count: "exact" })
    .eq("dismissed", false)
    .order("fit_score", { ascending: false, nullsFirst: false })
    .order("discovered_at", { ascending: false })
    .range(from, to);

  if (error) return <p className="text-red-600">Couldn&apos;t load openings: {error.message}</p>;
  const openings = (data ?? []) as JobOpening[];
  const total = count ?? 0;
  const pages = totalPages(total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Openings</h1>
          <p className="text-sm text-muted">The agent checks for new matches every morning.</p>
        </div>
        <FindJobsButton />
      </div>

      {openings.length === 0 && total > 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          This page is empty. <a href="/openings" className="text-accent">Back to page 1</a>
        </div>
      ) : openings.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No openings yet. Add your CV in Settings, then press &quot;Find jobs now&quot;.
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

      <Pagination page={page} totalPages={pages} total={total} hrefFor={(p) => `/openings?page=${p}`} />
    </div>
  );
}
