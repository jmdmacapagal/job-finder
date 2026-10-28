"use client";

import Link from "next/link";
import { useActionState } from "react";
import { applySelected, type ApplyState } from "./actions";
import { useSelectionCounts } from "./Selection";

/** `sending` is APPLY_SEND_EMAILS; when off, email applications become Gmail drafts. */
export function ApplyButton({ sending }: { sending: boolean }) {
  const { selected, byEmail } = useSelectionCounts();
  const [state, action, pending] = useActionState<ApplyState>(applySelected, null);
  const onSite = selected - byEmail;

  return (
    <div className="space-y-2">
      <form action={action}>
        <button type="submit" disabled={pending || selected === 0} className="btn-success">
          {pending ? "Writing applications… (a few minutes)" : `Apply to selected (${selected})`}
        </button>
      </form>
      {selected > 0 && !pending && !state && (
        <p className="text-xs text-muted">
          {byEmail > 0 &&
            (sending
              ? `${byEmail} will be emailed from your Gmail with a tailored CV. `
              : `${byEmail} will be saved as Gmail drafts with a tailored CV for you to review. Nothing is sent. `)}
          {onSite > 0 && `${onSite} apply on the company site, so you'll get a tailored CV to upload.`}
        </p>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.summary && (
        <div className="space-y-1 text-sm text-muted">
          <p>
            {[
              state.summary.emailed.length > 0 && `Emailed ${state.summary.emailed.length}`,
              state.summary.drafted.length > 0 && `Saved ${state.summary.drafted.length} as Gmail drafts`,
              `prepared ${state.summary.prepared.length} for the company site`,
            ]
              .filter(Boolean)
              .join(", ")
              .replace(/^p/, "P")}
            .{" "}
            <Link href="/" className="text-accent">
              See applications
            </Link>
          </p>
          {state.summary.remaining > 0 && (
            <p>{state.summary.remaining} more are still selected. Press the button again to continue.</p>
          )}
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
