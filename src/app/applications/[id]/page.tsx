import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationForm } from "@/components/ApplicationForm";
import { createClient } from "@/lib/supabase/server";
import type { Application } from "@/lib/types";
import { deleteApplication, markDraftSent } from "../actions";

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
      {application.tailored_cv && <TailoredMaterials application={application} />}
      <ApplicationForm application={application} />
      <form action={deleteApplication.bind(null, application.id)} className="border-t border-border pt-4">
        <button type="submit" className="text-sm text-red-600 hover:underline">
          Delete application
        </button>
      </form>
    </div>
  );
}

function TailoredMaterials({ application }: { application: Application }) {
  const draftOnly = !!application.draft_saved_at && !application.sent_at;
  return (
    <section className="card space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          {application.sent_at
            ? `Emailed to ${application.contact_email} on ${new Date(application.sent_at).toLocaleDateString()}`
            : draftOnly
              ? `Draft to ${application.contact_email} saved in Gmail on ${new Date(application.draft_saved_at!).toLocaleDateString()}`
              : "Ready to apply on the company site"}
        </h2>
        <a href={`/applications/${application.id}/cv`} target="_blank" rel="noreferrer" className="btn-secondary text-sm">
          Tailored CV (PDF)
        </a>
      </div>
      {draftOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            Nothing has been sent. Open Drafts in Gmail, check the email and attached CV, and send it from there.
          </p>
          <div className="flex gap-2">
            <a href="https://mail.google.com/mail/u/0/#drafts" target="_blank" rel="noreferrer" className="btn-secondary text-sm">
              Open Gmail drafts ↗
            </a>
            <form action={markDraftSent.bind(null, application.id)}>
              <button type="submit" className="btn-success text-sm">
                Mark as sent
              </button>
            </form>
          </div>
        </div>
      ) : (
        !application.sent_at && (
          <p className="text-sm text-muted">
            Open the listing, upload the tailored CV and paste the cover note below. Then set the status to Applied.
          </p>
        )
      )}
      {application.cover_email && (
        <details open={!application.sent_at}>
          <summary className="cursor-pointer text-sm font-medium">
            {application.sent_at || draftOnly ? "Email" : "Cover note"}: {application.email_subject}
          </summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{application.cover_email}</pre>
        </details>
      )}
    </section>
  );
}
