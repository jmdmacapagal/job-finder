"use client";

import { useActionState } from "react";
import { saveSettings, type SettingsState } from "./actions";

export function SettingsForm({
  cv,
  queries,
  preferences,
  gmailAddress,
  hasGmailPassword,
}: {
  cv: string;
  queries: string[];
  preferences: string;
  gmailAddress: string;
  hasGmailPassword: boolean;
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, null);

  return (
    <form action={action} className="space-y-6">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Master CV</span>
        <span className="mb-2 block text-xs text-muted">
          Paste your CV as plain text or Markdown. The agent scores every job against it.
        </span>
        <textarea name="cv_markdown" rows={16} defaultValue={cv} className="input font-mono text-xs" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Work preferences</span>
        <span className="mb-2 block text-xs text-muted">
          Where and how you want to work, in your own words. Jobs that don&apos;t fit score lower.
        </span>
        <textarea
          name="work_preferences"
          rows={3}
          defaultValue={preferences}
          placeholder="Remote anywhere first, then hybrid. On-site only in Manila. Full time, no contracts."
          className="input"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Job searches</span>
        <span className="mb-2 block text-xs text-muted">
          One per line. Used for LinkedIn and Indeed listings via JSearch. Add a city to search on-site roles.
        </span>
        <textarea
          name="search_queries"
          rows={5}
          defaultValue={queries.join("\n")}
          placeholder={"full stack developer\nreact developer remote\nsoftware engineer Manila"}
          className="input"
        />
      </label>

      <fieldset className="card space-y-3 p-4">
        <legend className="px-1 text-sm font-medium">Sending applications</legend>
        <p className="text-xs text-muted">
          Applications are emailed from your own Gmail, and you get a copy of each one. Create an app password at{" "}
          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-accent">
            myaccount.google.com/apppasswords
          </a>{" "}
          (2-Step Verification must be on). It&apos;s stored encrypted.
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium">Gmail address</span>
          <input
            name="gmail_address"
            type="email"
            defaultValue={gmailAddress}
            placeholder="you@gmail.com"
            autoComplete="email"
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium">App password</span>
          <input
            name="gmail_app_password"
            type="password"
            placeholder={hasGmailPassword ? "Saved. Leave blank to keep it." : "abcd efgh ijkl mnop"}
            autoComplete="new-password"
            className="input"
          />
        </label>
        <p className="text-xs text-muted">To stop sending from Gmail, clear the address and save.</p>
      </fieldset>

      {state && <p className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
