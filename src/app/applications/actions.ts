"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseApplicationForm } from "@/lib/validation";

export type FormState = { errors: Record<string, string[]>; message?: string } | null;

export async function saveApplication(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseApplicationForm(form);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (errors[key] ??= []).push(issue.message);
    }
    return { errors };
  }

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("applications").update(parsed.data).eq("id", id)
    : await supabase.from("applications").insert(parsed.data);

  if (error) return { errors: {}, message: error.message };

  revalidatePath("/");
  redirect("/");
}

export async function deleteApplication(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}
