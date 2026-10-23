import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { computeStats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  WORK_MODE_LABELS,
  type Application,
  type ApplicationStatus,
} from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = APPLICATION_STATUSES.includes(status as ApplicationStatus)
    ? (status as ApplicationStatus)
    : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("applied_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return <p className="text-red-600">Couldn&apos;t load applications: {error.message}</p>;

  const apps = (data ?? []) as Application[];
  const stats = computeStats(apps);
  const shown = filter ? apps.filter((a) => a.status === filter) : apps;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <Link href="/applications/new" className="btn-primary">
          Add
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Interviewing" value={stats.byStatus.interviewing} />
        <Stat label="Response rate" value={`${stats.responseRate}%`} />
      </section>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm">
        <FilterChip href="/" active={!filter} label={`All (${stats.total})`} />
        {APPLICATION_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={`/?status=${s}`}
            active={filter === s}
            label={`${STATUS_LABELS[s]} (${stats.byStatus[s]})`}
          />
        ))}
      </nav>

      {shown.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          {apps.length === 0 ? "No applications yet. Add the first one." : "Nothing with this status."}
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((app) => (
            <li key={app.id}>
              <Link href={`/applications/${app.id}`} className="card block p-4 hover:border-accent">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{app.role}</p>
                    <p className="truncate text-sm text-muted">
                      {app.company}
                      {app.work_mode && ` · ${WORK_MODE_LABELS[app.work_mode]}`}
                      {app.location && ` · ${app.location}`}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted">
                  {app.applied_on && <span>Applied {app.applied_on}</span>}
                  {app.source && <span>via {app.source}</span>}
                  {app.feedback && <span className="text-foreground">Has feedback</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1 ${
        active ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted"
      }`}
    >
      {label}
    </Link>
  );
}
