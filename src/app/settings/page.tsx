import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("cv_markdown, search_queries, work_preferences, gmail_address, gmail_app_password_encrypted")
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsForm
        cv={data?.cv_markdown ?? ""}
        queries={data?.search_queries ?? []}
        preferences={data?.work_preferences ?? ""}
        gmailAddress={data?.gmail_address ?? ""}
        // Only whether a password is saved goes to the browser, never the password.
        hasGmailPassword={Boolean(data?.gmail_app_password_encrypted)}
      />
    </div>
  );
}
