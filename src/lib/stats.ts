import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from "./types";

export type ApplicationStats = {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  active: number;
  responseRate: number;
};

const ACTIVE: ApplicationStatus[] = ["applied", "interviewing", "offer"];
// Statuses that mean the employer replied in some way.
const RESPONDED: ApplicationStatus[] = ["interviewing", "offer", "rejected"];

export function computeStats(apps: Pick<Application, "status">[]): ApplicationStats {
  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<
    ApplicationStatus,
    number
  >;
  for (const app of apps) byStatus[app.status]++;

  const sent = apps.length - byStatus.saved;
  const responded = RESPONDED.reduce((n, s) => n + byStatus[s], 0);

  return {
    total: apps.length,
    byStatus,
    active: ACTIVE.reduce((n, s) => n + byStatus[s], 0),
    responseRate: sent === 0 ? 0 : Math.round((responded / sent) * 100),
  };
}
