import { STATUS_LABELS, type ApplicationStatus } from "@/lib/types";

const COLORS: Record<ApplicationStatus, string> = {
  saved: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  applied: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  interviewing: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  offer: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  ghosted: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  withdrawn: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
