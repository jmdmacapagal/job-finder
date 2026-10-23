import { attachmentName, cvName } from "@/lib/apply/run";
import { renderCvPdf } from "@/lib/apply/pdf";
import { createClient } from "@/lib/supabase/server";

/** The tailored CV for one application, as the same PDF the agent emails. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: application }, { data: profile }] = await Promise.all([
    supabase.from("applications").select("company, tailored_cv").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("cv_markdown").maybeSingle(),
  ]);
  if (!application?.tailored_cv) return new Response("Not found", { status: 404 });

  const cv = profile?.cv_markdown ?? application.tailored_cv;
  const pdf = await renderCvPdf(application.tailored_cv, `${cvName(cv)} CV`);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${attachmentName(cv, application.company)}"`,
    },
  });
}
