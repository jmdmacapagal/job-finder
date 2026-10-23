import type { EmploymentType, WorkMode } from "@/lib/types";

/** A listing from any source, normalized before scoring. */
export type RawJob = {
  source: string;
  externalId: string;
  title: string;
  company: string;
  url: string;
  location: string | null;
  workMode: WorkMode | null;
  employmentType: EmploymentType | null;
  salary: string | null;
  description: string;
  postedAt: string | null;
  applyEmail: string | null;
};
