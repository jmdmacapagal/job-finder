import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationForm } from "@/components/ApplicationForm";
import { createClient } from "@/lib/supabase/server";
import type { Application } from "@/lib/types";
import { deleteApplication } from "../actions";

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  const application = data as Application;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Applications
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{application.role}</h1>
        <p className="text-muted">{application.company}</p>
        {application.url && (
          <a href={application.url} target="_blank" rel="noreferrer" className="text-sm text-accent">
            Open job listing ↗
          </a>
        )}
      </div>
      <ApplicationForm application={application} />
      <form action={deleteApplication.bind(null, application.id)} className="border-t border-border pt-4">
        <button type="submit" className="text-sm text-red-600 hover:underline">
          Delete application
        </button>
      </form>
    </div>
  );
}
