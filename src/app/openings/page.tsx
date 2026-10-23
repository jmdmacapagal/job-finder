import { createClient } from "@/lib/supabase/server";
import { WORK_MODE_LABELS, type JobOpening } from "@/lib/types";

export default async function OpeningsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_openings")
    .select("*")
    .eq("dismissed", false)
    .order("fit_score", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) return <p className="text-red-600">Couldn&apos;t load openings: {error.message}</p>;
  const openings = (data ?? []) as JobOpening[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Openings</h1>
      {openings.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No openings yet. The job-finding agent will fill this list with roles that match your CV.
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
                    {job.company} · {job.source}
                    {job.work_mode && ` · ${WORK_MODE_LABELS[job.work_mode]}`}
                  </p>
                </div>
                {job.fit_score !== null && (
                  <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                    {job.fit_score}% fit
                  </span>
                )}
              </div>
              {job.fit_reason && <p className="mt-2 text-sm text-muted">{job.fit_reason}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
