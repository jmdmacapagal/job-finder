"use client";

import { useActionState } from "react";
import { saveSettings, type SettingsState } from "./actions";

export function SettingsForm({ cv, queries }: { cv: string; queries: string[] }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, null);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Master CV</span>
        <span className="mb-2 block text-xs text-muted">
          Paste your CV as plain text or Markdown. The agent scores every job against it.
        </span>
        <textarea name="cv_markdown" rows={16} defaultValue={cv} className="input font-mono text-xs" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Job searches</span>
        <span className="mb-2 block text-xs text-muted">
          One per line. Used for LinkedIn and Indeed listings via JSearch. Add a city to search on-site roles.
        </span>
        <textarea name="search_queries" rows={5} defaultValue={queries.join("\n")} className="input" />
      </label>
      {state && <p className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
