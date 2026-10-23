import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { extractSalary, extractTechStack } from "@/lib/jobs/listing";
import { MIN_FIT_SCORE } from "@/lib/jobs/run";
import { pageRange, parsePage, totalPages } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, type JobOpening, type WorkMode } from "@/lib/types";
import { dismissOpening } from "./actions";
import { ApplyButton } from "./ApplyButton";
import { FindJobsButton } from "./FindJobsButton";
import { SelectableCard, SelectAllCheckbox, SelectCheckbox, SelectionProvider } from "./Selection";

// "Find jobs now" and "Apply to selected" call Claude, which can take a while.
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
  // Openings already applied to live on the Applications page instead.
  const visible = () =>
    supabase
      .from("job_openings")
      .select("id", { count: "exact", head: true })
      .eq("dismissed", false)
      .is("applied_at", null);
  let query = supabase
    .from("job_openings")
    .select("*", { count: "exact" })
    .eq("dismissed", false)
    .is("applied_at", null);
  query = view === "good" ? query.gte("fit_score", MIN_FIT_SCORE) : query.lt("fit_score", MIN_FIT_SCORE);

  const [{ data, error, count }, good, low, selected, selectedByEmail, { data: profile }] = await Promise.all([
    query
      .order("fit_score", { ascending: false, nullsFirst: false })
      .order("discovered_at", { ascending: false })
      .range(from, to),
    visible().gte("fit_score", MIN_FIT_SCORE),
    visible().lt("fit_score", MIN_FIT_SCORE),
    visible().eq("selected", true),
    visible().eq("selected", true).not("apply_email", "is", null),
    supabase.from("profiles").select("cv_markdown").maybeSingle(),
  ]);

  if (error) return <p className="text-red-600">Couldn&apos;t load openings: {error.message}</p>;
  const openings = (data ?? []) as JobOpening[];
  // Tech the CV also mentions is highlighted, so gaps stand out.
  const yourStack = new Set(extractTechStack(profile?.cv_markdown, Infinity));
  const total = count ?? 0;
  const pages = totalPages(total);
  const hrefFor = (p: number) =>
    `/openings?${new URLSearchParams({ ...(view === "low" && { view }), page: String(p) })}`;

  const pageJobs = openings.map((j) => ({
    id: j.id,
    selected: j.selected,
    byEmail: Boolean(j.apply_email),
  }));

  return (
    <SelectionProvider
      // Start fresh whenever the server sends new data, such as after applying.
      key={pageJobs.map((j) => `${j.id}:${j.selected}`).join(",") + `|${selected.count}|${selectedByEmail.count}`}
      jobs={pageJobs}
      selectedTotal={selected.count ?? 0}
      byEmailTotal={selectedByEmail.count ?? 0}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Openings</h1>
            <p className="text-sm text-muted">
              The agent checks for new matches every morning. Select the jobs you want, then apply in one go.
            </p>
          </div>
          <FindJobsButton />
        </div>

        <nav className="flex gap-2 text-sm">
          <Tab href="/openings" active={view === "good"} label={`Good matches (${good.count ?? 0})`} />
          <Tab
            href="/openings?view=low"
            active={view === "low"}
            label={`Below ${MIN_FIT_SCORE}% (${low.count ?? 0})`}
          />
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
              : 'No openings yet. Add your CV in Settings, then press "Find jobs now".'}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <ApplyButton />
              <SelectAllCheckbox />
            </div>
            <ul className="space-y-2">
              {openings.map((job) => (
                <SelectableCard key={job.id} id={job.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <a href={job.url} target="_blank" rel="noreferrer" className="font-medium hover:text-accent">
                        {job.title}
                      </a>
                      <p className="text-sm text-muted">
                        {job.company}
                        {job.location && ` · ${job.location}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {job.fit_score !== null && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                          {job.fit_score}% fit
                        </span>
                      )}
                      <SelectCheckbox id={job.id} label={`Select ${job.title} at ${job.company}`} />
                    </div>
                  </div>
                  <JobHighlights job={job} yourStack={yourStack} />
                  {job.fit_reason && <p className="mt-2 text-sm">{job.fit_reason}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span>via {job.source}</span>
                    {job.employment_type && <span>{EMPLOYMENT_TYPE_LABELS[job.employment_type]}</span>}
                    {job.apply_email ? (
                      <span className="text-green-600">Can apply by email</span>
                    ) : (
                      <span>Apply on site</span>
                    )}
                    <form action={dismissOpening.bind(null, job.id)} className="ml-auto">
                      <button type="submit" className="hover:text-foreground">
                        Dismiss
                      </button>
                    </form>
                  </div>
                </SelectableCard>
              ))}
            </ul>
          </div>
        )}

        <Pagination page={page} totalPages={pages} total={total} hrefFor={hrefFor} />
      </div>
    </SelectionProvider>
  );
}

const WORK_MODE_STYLES: Record<WorkMode, string> = {
  remote: "bg-green-600 text-white",
  hybrid: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  onsite: "bg-muted/15 text-muted",
};

function JobHighlights({ job, yourStack }: { job: JobOpening; yourStack: Set<string> }) {
  const salary = job.salary ?? extractSalary(job.description);
  const stack = extractTechStack(job.description);
  if (!job.work_mode && !salary && stack.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {(job.work_mode || salary) && (
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {job.work_mode && (
            <span className={`rounded-full px-2.5 py-0.5 uppercase tracking-wide ${WORK_MODE_STYLES[job.work_mode]}`}>
              {WORK_MODE_LABELS[job.work_mode]}
            </span>
          )}
          {salary && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-emerald-700 dark:text-emerald-400">
              💰 {salary}
            </span>
          )}
        </div>
      )}
      {stack.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tech stack">
          {stack.map((tech) => (
            <li
              key={tech}
              title={yourStack.has(tech) ? "On your CV" : "Not on your CV"}
              className={`rounded-full border px-2 py-0.5 text-xs ${
                yourStack.has(tech) ? "border-accent/40 bg-accent/10 text-accent" : "border-border text-muted"
              }`}
            >
              {tech}
            </li>
          ))}
        </ul>
      )}
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
