import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for background jobs with no signed-in user (the daily cron).
 * It bypasses row-level security, so only use it on the server and always filter by user_id.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
