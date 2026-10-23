"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { setSelectedMany } from "./actions";

type PageJob = { id: string; selected: boolean; byEmail: boolean };

type Selection = {
  isSelected: (id: string) => boolean;
  set: (ids: string[], selected: boolean) => void;
  pageIds: string[];
  /** Selected jobs across every page, and how many of those apply by email. */
  total: number;
  byEmail: number;
};

const SelectionContext = createContext<Selection | null>(null);

function useSelection(): Selection {
  const selection = useContext(SelectionContext);
  if (!selection) throw new Error("useSelection must be used inside SelectionProvider");
  return selection;
}

/**
 * Keeps ticks on this page in the browser so they show instantly, and saves
 * them in the background. Counts from other pages come from the server.
 */
export function SelectionProvider({
  jobs,
  selectedTotal,
  byEmailTotal,
  children,
}: {
  jobs: PageJob[];
  selectedTotal: number;
  byEmailTotal: number;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState(() => new Set(jobs.filter((j) => j.selected).map((j) => j.id)));
  const [, startTransition] = useTransition();

  // Server counts include this page's saved ticks; swap those for the live ones.
  const others = selectedTotal - jobs.filter((j) => j.selected).length;
  const othersByEmail = byEmailTotal - jobs.filter((j) => j.selected && j.byEmail).length;
  const onPage = jobs.filter((j) => selected.has(j.id));

  const set = (ids: string[], value: boolean) => {
    const previous = selected;
    const next = new Set(selected);
    ids.forEach((id) => (value ? next.add(id) : next.delete(id)));
    setSelected(next);
    startTransition(async () => {
      try {
        await setSelectedMany(ids, value);
      } catch {
        setSelected(previous);
      }
    });
  };

  return (
    <SelectionContext.Provider
      value={{
        isSelected: (id) => selected.has(id),
        set,
        pageIds: jobs.map((j) => j.id),
        total: others + onPage.length,
        byEmail: othersByEmail + onPage.filter((j) => j.byEmail).length,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function SelectableCard({ id, children }: { id: string; children: ReactNode }) {
  const { isSelected } = useSelection();
  return <li className={`card p-4 transition-shadow ${isSelected(id) ? "ring-2 ring-accent" : ""}`}>{children}</li>;
}

export function SelectCheckbox({ id, label }: { id: string; label: string }) {
  const { isSelected, set } = useSelection();
  return (
    <input
      type="checkbox"
      checked={isSelected(id)}
      aria-label={label}
      onChange={(e) => set([id], e.target.checked)}
      className="h-4 w-4 accent-accent"
    />
  );
}

/** Selects or clears every opening on the current page. */
export function SelectAllCheckbox() {
  const { isSelected, set, pageIds } = useSelection();
  return (
    // h-9 matches the Apply button's height so the two line up.
    <label className="flex h-9 cursor-pointer items-center gap-2 px-4 text-sm text-muted select-none">
      Select all on this page
      <input
        type="checkbox"
        checked={pageIds.length > 0 && pageIds.every(isSelected)}
        onChange={(e) => set(pageIds, e.target.checked)}
        className="h-4 w-4 accent-accent"
      />
    </label>
  );
}

export function useSelectionCounts() {
  const { total, byEmail } = useSelection();
  return { selected: total, byEmail };
}
