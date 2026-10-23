"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { ok: boolean; message: string } | null;

export async function saveSettings(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const cv = String(form.get("cv_markdown") ?? "").trim();
  const queries = String(form.get("search_queries") ?? "")
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean);

  if (!cv) return { ok: false, message: "Paste your CV first." };
  if (queries.length === 0) return { ok: false, message: "Add at least one search." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You're signed out." };

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, cv_markdown: cv, search_queries: queries });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/settings");
  return { ok: true, message: "Saved." };
}
