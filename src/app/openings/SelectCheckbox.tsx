"use client";

import { useOptimistic, useTransition } from "react";
import { setSelected } from "./actions";

export function SelectCheckbox({ id, selected }: { id: string; selected: boolean }) {
  const [checked, setChecked] = useOptimistic(selected);
  const [, startTransition] = useTransition();

  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            setChecked(next);
            await setSelected(id, next);
          });
        }}
        className="h-4 w-4 accent-accent"
      />
      Select
    </label>
  );
}
