import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { RawJob } from "./types";

export const FitSchema = z.object({
  score: z.number().int().min(0).max(100),
  reason: z.string(),
  work_mode: z.enum(["remote", "hybrid", "onsite", "unknown"]),
});
export type Fit = z.infer<typeof FitSchema>;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
// Long descriptions add cost without changing the verdict much.
const MAX_DESCRIPTION_CHARS = 6000;

const SYSTEM = `You screen job listings for one candidate and score how well each fits them.

Score 0-100:
- 80-100: strong match on stack and seniority, and the work arrangement fits.
- 60-79: good match with one notable gap.
- 40-59: partial match; worth a look only if little else is available.
- 0-39: poor match.

The candidate's work-arrangement preferences, in order: remote (any country), then hybrid, then on-site in Qatar only. An on-site or hybrid role that requires living outside Qatar is a poor match (score at most 20) unless it offers relocation and remote work. Treat a listing restricted to residents of countries the candidate can't work from as a poor match.

Give "reason" as one or two plain sentences the candidate can skim: the main reasons it fits and the biggest gap. Set "work_mode" from the listing, or "unknown" if it doesn't say.`;

export function buildJobPrompt(job: RawJob): string {
  return [
    "<job_listing>",
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location ?? "not stated"}`,
    `Work mode (from source): ${job.workMode ?? "not stated"}`,
    `Employment type: ${job.employmentType ?? "not stated"}`,
    job.salary ? `Salary: ${job.salary}` : null,
    "",
    job.description.slice(0, MAX_DESCRIPTION_CHARS),
    "</job_listing>",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/** Returns null when the model declines or the output can't be parsed. */
export async function scoreJob(client: Anthropic, cv: string, job: RawJob): Promise<Fit | null> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    // The CV is identical for every job in a run, so keep it in the cached prefix.
    system: [
      { type: "text", text: SYSTEM },
      { type: "text", text: `<candidate_cv>\n${cv}\n</candidate_cv>`, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: buildJobPrompt(job) }],
    output_config: { effort: "low", format: betaZodOutputFormat(FitSchema) },
  });

  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}
