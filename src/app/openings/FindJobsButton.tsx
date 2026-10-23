"use client";

import { useActionState } from "react";
import { findJobsNow, type FindState } from "./actions";

export function FindJobsButton() {
  const [state, action, pending] = useActionState<FindState>(findJobsNow, null);

  return (
    <div className="space-y-2">
      <form action={action}>
        <button type="submit" disabled={pending} className="btn-success">
          {pending ? "Searching… (up to a few minutes)" : "Find jobs now"}
        </button>
      </form>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.summary && (
        <div className="text-sm text-muted">
          <p>
            Checked {state.summary.newCandidates} new listings out of {state.summary.fetched} and added{" "}
            {state.summary.saved} good matches.
          </p>
          {state.summary.errors.map((e) => (
            <p key={e} className="text-xs text-amber-600">
              {e}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
