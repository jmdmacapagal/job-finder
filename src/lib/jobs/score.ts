import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { fallbackParams } from "@/lib/anthropic";
import type { RawJob } from "./types";

export const FitSchema = z.object({
  score: z.number().int().min(0).max(100),
  reason: z.string(),
  work_mode: z.enum(["remote", "hybrid", "onsite", "unknown"]),
});
export type Fit = z.infer<typeof FitSchema>;

// Fit scoring is a simple judgment, so the fast, cheap model is enough.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
// Long descriptions add cost without changing the verdict much.
const MAX_DESCRIPTION_CHARS = 6000;

const SYSTEM = `You screen job listings for one candidate and score how well each fits them.

Score 0-100:
- 80-100: strong match on stack and seniority, and the work arrangement fits.
- 60-79: good match with one notable gap.
- 40-59: partial match; worth a look only if little else is available.
- 0-39: poor match.

The candidate's own work preferences are given with their CV. Weigh the work arrangement and location against them. A role whose arrangement or location they rule out (for example on-site in a city they won't work in) is a poor match, score at most 20, unless it offers remote work or relocation they'd accept. Treat a listing restricted to residents of countries the candidate can't work from as a poor match. If they state no preferences, assume they can work remotely or in the location on their CV. Some listings come from job-alert emails and have only a title, company, location and a line or two: judge those on what's there, and don't mark them down for the missing description.

Give "reason" as one or two plain sentences the candidate can skim: the main reasons it fits and the biggest gap. Address the candidate directly as "you" ("fits your Vue experience"), never in the third person. Set "work_mode" from the listing, or "unknown" if it doesn't say.`;

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

export type Candidate = { cv: string; preferences: string };

export function buildCandidateBlock({ cv, preferences }: Candidate): string {
  return [
    `<candidate_cv>\n${cv}\n</candidate_cv>`,
    `<work_preferences>\n${preferences.trim() || "Not stated."}\n</work_preferences>`,
  ].join("\n\n");
}

/** Returns null when the model declines or the output can't be parsed. */
export async function scoreJob(client: Anthropic, candidate: Candidate, job: RawJob): Promise<Fit | null> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    ...fallbackParams(MODEL),
    // The candidate is identical for every job in a run, so keep them in the cached prefix.
    system: [
      { type: "text", text: SYSTEM },
      { type: "text", text: buildCandidateBlock(candidate), cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: buildJobPrompt(job) }],
    output_config: { effort: "low", format: betaZodOutputFormat(FitSchema) },
  });

  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}
