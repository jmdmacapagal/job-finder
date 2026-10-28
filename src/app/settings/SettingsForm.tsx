"use client";

import { useActionState } from "react";
import { saveSettings, type SettingsState } from "./actions";

export function SettingsForm({
  cv,
  queries,
  preferences,
  careerBoards,
  readJobAlerts,
  gmailAddress,
  hasGmailPassword,
}: {
  cv: string;
  queries: string[];
  preferences: string;
  careerBoards: string[];
  readJobAlerts: boolean;
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
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Company career pages</span>
        <span className="mb-2 block text-xs text-muted">
          One link per line, for companies you&apos;d like to work at that list jobs on Greenhouse, Lever or Ashby. Open a
          company&apos;s Careers page and copy the link if it starts with boards.greenhouse.io, job-boards.greenhouse.io,
          jobs.lever.co or jobs.ashbyhq.com.
        </span>
        <textarea
          name="career_boards"
          rows={4}
          defaultValue={careerBoards.join("\n")}
          placeholder={"https://jobs.lever.co/acme\nhttps://job-boards.greenhouse.io/example\nhttps://jobs.ashbyhq.com/startup"}
          className="input"
        />
      </label>

      <fieldset className="card space-y-3 p-4">
        <legend className="px-1 text-sm font-medium">Gmail</legend>
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
        <label className="flex items-start gap-2">
          <input name="read_job_alerts" type="checkbox" defaultChecked={readJobAlerts} className="mt-0.5" />
          <span className="text-xs">
            <span className="block font-medium">Read job-alert emails</span>
            <span className="text-muted">
              Finds jobs in alert emails from LinkedIn, Indeed, OnlineJobs.ph and Bayt from the last two days. Set up job
              alerts on those sites first. Read-only: nothing in Gmail is changed.
            </span>
          </span>
        </label>
      </fieldset>

      {state && <p className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
