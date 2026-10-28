"use server";

import { revalidatePath } from "next/cache";
import { encryptSecret } from "@/lib/crypto";
import { parseCareerBoard } from "@/lib/jobs/sources/careers";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { ok: boolean; message: string } | null;

// Gmail or a Google Workspace address; both support app passwords.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function saveSettings(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const cv = String(form.get("cv_markdown") ?? "").trim();
  const preferences = String(form.get("work_preferences") ?? "").trim();
  const queries = String(form.get("search_queries") ?? "")
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean);
  const careerBoards = String(form.get("career_boards") ?? "")
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);
  const readJobAlerts = form.get("read_job_alerts") === "on";
  const gmailAddress = String(form.get("gmail_address") ?? "").trim().toLowerCase();
  const gmailPassword = String(form.get("gmail_app_password") ?? "").replace(/\s+/g, "");

  if (!cv) return { ok: false, message: "Paste your CV first." };
  if (queries.length === 0) return { ok: false, message: "Add at least one search." };
  const badBoard = careerBoards.find((b) => !parseCareerBoard(b));
  if (badBoard) {
    return {
      ok: false,
      message: `"${badBoard}" isn't a Greenhouse, Lever or Ashby career page. Use links like https://jobs.lever.co/acme.`,
    };
  }
  if (gmailAddress && !EMAIL.test(gmailAddress)) return { ok: false, message: "That Gmail address doesn't look right." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You're signed out." };

  const { data: current } = await supabase.from("profiles").select("gmail_address").eq("user_id", user.id).maybeSingle();
  if (gmailAddress && gmailAddress !== current?.gmail_address && !gmailPassword) {
    return { ok: false, message: "Add the app password for this Gmail address." };
  }

  const row: Record<string, unknown> = {
    user_id: user.id,
    cv_markdown: cv,
    search_queries: queries,
    work_preferences: preferences,
    career_boards: careerBoards,
    read_job_alerts: readJobAlerts,
    gmail_address: gmailAddress || null,
  };
  if (!gmailAddress) {
    row.gmail_app_password_encrypted = null;
  } else if (gmailPassword) {
    try {
      row.gmail_app_password_encrypted = encryptSecret(gmailPassword);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
  }

  const { error } = await supabase.from("profiles").upsert(row);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/settings");
  return { ok: true, message: "Saved." };
}
