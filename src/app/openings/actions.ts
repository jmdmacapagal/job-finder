"use server";

import { revalidatePath } from "next/cache";
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
