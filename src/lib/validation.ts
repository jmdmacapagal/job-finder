import { z } from "zod";
import { APPLICATION_STATUSES, EMPLOYMENT_TYPES, WORK_MODES } from "./types";

// Empty form fields arrive as "" and should be stored as null.
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .default(null);

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null);

export const applicationSchema = z.object({
  company: z.string().trim().min(1, "Company is required"),
  role: z.string().trim().min(1, "Role is required"),
  url: z
    .union([z.url("Enter a full link, starting with https://"), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
  source: optionalText,
  location: optionalText,
  work_mode: optionalEnum(WORK_MODES),
  employment_type: optionalEnum(EMPLOYMENT_TYPES),
  salary: optionalText,
  status: z.enum(APPLICATION_STATUSES).default("applied"),
  applied_on: z
    .union([z.iso.date("Use a valid date"), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
  feedback: optionalText,
  notes: optionalText,
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

export function parseApplicationForm(form: FormData) {
  const raw = Object.fromEntries(
    Object.keys(applicationSchema.shape).map((key) => [key, form.get(key) ?? undefined]),
  );
  return applicationSchema.safeParse(raw);
}
