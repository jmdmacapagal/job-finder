"use client";

import { useOptimistic, useTransition } from "react";
import { setSelected, setSelectedMany } from "./actions";

export function SelectCheckbox({ id, selected, label }: { id: string; selected: boolean; label: string }) {
  const [checked, setChecked] = useOptimistic(selected);
  const [, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      onChange={(e) => {
        const next = e.target.checked;
        startTransition(async () => {
          setChecked(next);
          await setSelected(id, next);
        });
      }}
      className="h-4 w-4 accent-accent"
    />
  );
}

/** Selects or clears every opening on the current page. */
export function SelectAllCheckbox({ ids, allSelected }: { ids: string[]; allSelected: boolean }) {
  const [checked, setChecked] = useOptimistic(allSelected);
  const [pending, startTransition] = useTransition();

  return (
    <label className="ml-auto flex w-fit cursor-pointer items-center gap-2 px-4 text-sm text-muted select-none">
      Select all on this page
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            setChecked(next);
            await setSelectedMany(ids, next);
          });
        }}
        className="h-4 w-4 accent-accent"
      />
    </label>
  );
}
