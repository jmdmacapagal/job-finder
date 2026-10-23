"use server";

import { revalidatePath } from "next/cache";
import { applyToSelected, type ApplySummary } from "@/lib/apply/run";
import { runJobSearch, type RunSummary } from "@/lib/jobs/run";
import { createClient } from "@/lib/supabase/server";

export type FindState = { summary?: RunSummary; error?: string } | null;

export async function findJobsNow(): Promise<FindState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out." };

  try {
    const summary = await runJobSearch(supabase, user.id);
    revalidatePath("/openings");
    return { summary };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function dismissOpening(id: string) {
  const supabase = await createClient();
  await supabase.from("job_openings").update({ dismissed: true }).eq("id", id);
  revalidatePath("/openings");
}


export type ApplyState = { summary?: ApplySummary; error?: string } | null;

export async function applySelected(): Promise<ApplyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out." };

  try {
    const summary = await applyToSelected(supabase, user.id);
    revalidatePath("/openings");
    revalidatePath("/");
    return { summary };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// No revalidatePath: the page already shows the tick, and re-rendering it would make ticking feel slow.
export async function setSelectedMany(ids: string[], selected: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("job_openings").update({ selected }).in("id", ids);
  if (error) throw new Error(error.message);
}
