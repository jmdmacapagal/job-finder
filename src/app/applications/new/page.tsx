import Link from "next/link";
import { ApplicationForm } from "@/components/ApplicationForm";

export const dynamic = "force-dynamic";

export default function NewApplicationPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Applications
      </Link>
      <h1 className="text-2xl font-semibold">Add application</h1>
      <ApplicationForm defaultAppliedOn={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}
