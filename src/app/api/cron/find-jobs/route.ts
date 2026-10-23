import { NextResponse } from "next/server";
import { runJobSearch } from "@/lib/jobs/run";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

// Vercel Cron calls this daily (see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: profiles, error } = await supabase.from("profiles").select("user_id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const { user_id } of profiles ?? []) {
    try {
      results.push({ user_id, ...(await runJobSearch(supabase, user_id)) });
    } catch (e) {
      results.push({ user_id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ results });
}
