"use client";

import { useActionState } from "react";
import { saveApplication, type FormState } from "@/app/applications/actions";
import {
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  SOURCES,
  STATUS_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
  type Application,
} from "@/lib/types";

type Props = { application?: Application; defaultAppliedOn?: string };

export function ApplicationForm({ application, defaultAppliedOn }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveApplication.bind(null, application?.id ?? null),
    null,
  );
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" name="company" error={errors.company}>
          <input name="company" required defaultValue={application?.company} className="input" />
        </Field>
        <Field label="Role" name="role" error={errors.role}>
          <input name="role" required defaultValue={application?.role} className="input" />
        </Field>
      </div>

      <Field label="Job link" name="url" error={errors.url}>
        <input name="url" type="url" placeholder="https://" defaultValue={application?.url ?? ""} className="input" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Status" name="status" error={errors.status}>
          <select name="status" defaultValue={application?.status ?? "applied"} className="input">
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Applied on" name="applied_on" error={errors.applied_on}>
          <input name="applied_on" type="date" defaultValue={application?.applied_on ?? defaultAppliedOn ?? ""} className="input" />
        </Field>
        <Field label="Source" name="source" error={errors.source}>
          <select name="source" defaultValue={application?.source ?? ""} className="input">
            <option value="">—</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Work mode" name="work_mode" error={errors.work_mode}>
          <select name="work_mode" defaultValue={application?.work_mode ?? ""} className="input">
            <option value="">—</option>
            {WORK_MODES.map((m) => (
              <option key={m} value={m}>
                {WORK_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type" name="employment_type" error={errors.employment_type}>
          <select name="employment_type" defaultValue={application?.employment_type ?? ""} className="input">
            <option value="">—</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EMPLOYMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location" name="location" error={errors.location}>
          <input name="location" defaultValue={application?.location ?? ""} className="input" />
        </Field>
      </div>

      <Field label="Salary" name="salary" error={errors.salary}>
        <input name="salary" placeholder="e.g. $4,000/month" defaultValue={application?.salary ?? ""} className="input" />
      </Field>

      <Field label="Feedback received" name="feedback" error={errors.feedback}>
        <textarea name="feedback" rows={3} defaultValue={application?.feedback ?? ""} className="input" />
      </Field>

      <Field label="Notes" name="notes" error={errors.notes}>
        <textarea name="notes" rows={3} defaultValue={application?.notes ?? ""} className="input" />
      </Field>

      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
        {pending ? "Saving…" : application ? "Save changes" : "Add application"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="block" htmlFor={name}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error[0]}</span>}
    </label>
  );
}
