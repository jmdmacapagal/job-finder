export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "freelance"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const SOURCES = ["LinkedIn", "Indeed", "OnlineJobs.ph", "Company site", "Referral", "Other"] as const;

export type Application = {
  id: string;
  company: string;
  role: string;
  url: string | null;
  source: string | null;
  location: string | null;
  work_mode: WorkMode | null;
  employment_type: EmploymentType | null;
  salary: string | null;
  status: ApplicationStatus;
  applied_on: string | null;
  feedback: string | null;
  notes: string | null;
  opening_id: string | null;
  contact_email: string | null;
  email_subject: string | null;
  cover_email: string | null;
  tailored_cv: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type JobOpening = {
  id: string;
  title: string;
  company: string;
  url: string;
  source: string;
  location: string | null;
  work_mode: WorkMode | null;
  employment_type: EmploymentType | null;
  salary: string | null;
  description: string | null;
  apply_email: string | null;
  fit_score: number | null;
  fit_reason: string | null;
  posted_at: string | null;
  selected: boolean;
  applied_at: string | null;
  discovered_at: string;
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "No response",
  withdrawn: "Withdrawn",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  freelance: "Freelance",
};
