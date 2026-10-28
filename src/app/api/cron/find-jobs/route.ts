import { NextResponse } from "next/server";
import { isAllowedEmail } from "@/lib/auth";
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
  // Only invited accounts run, even if a stranger managed to sign up.
  const { data: users, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const invited = users.users.filter((u) => isAllowedEmail(u.email));

  const results = [];
  for (const { id: user_id, email } of invited) {
    try {
      results.push({ user_id, ...(await runJobSearch(supabase, user_id, { userEmail: email })) });
    } catch (e) {
      results.push({ user_id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ results });
}
