import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

const DEFAULT_QUERIES = [
  "full stack engineer",
  "full stack developer vue nuxt",
  "react typescript developer",
  "full stack developer Doha Qatar",
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("cv_markdown, search_queries").maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsForm cv={data?.cv_markdown ?? ""} queries={data?.search_queries ?? DEFAULT_QUERIES} />
    </div>
  );
}
