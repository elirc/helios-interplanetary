import { z } from "zod";

export const readingSchema = z
  .object({
    id: z.uuid(),
    assetId: z.string().min(1).max(80),
    observedAt: z.iso.datetime({ offset: true }),
    pressureBar: z.number().finite().min(0).max(20),
    vibrationMms: z.number().finite().min(0).max(100),
    temperatureC: z.number().finite().min(-100).max(200),
    correlationId: z.uuid(),
  })
  .strict();
export type ReadingInput = z.infer<typeof readingSchema>;

export const scenarioSchema = z
  .object({
    runId: z.uuid(),
    assetId: z.string().min(1).max(80),
    kind: z.enum(["degradation", "recovery", "nominal"]),
    seed: z.number().int().min(0).max(4294967295).default(17),
  })
  .strict();
export type ScenarioInput = z.infer<typeof scenarioSchema>;
export type ScenarioKind = ScenarioInput["kind"];
export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface Principal {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: "operator" | "viewer";
}

export interface Reading {
  id: string;
  observedAt: string;
  pressureBar: number;
  vibrationMms: number;
  temperatureC: number;
  applied: boolean;
  breached: boolean;
  correlationId: string;
  incidentId: string | null;
}

export interface Incident {
  id: string;
  number: number;
  assetId: string;
  title: string;
  severity: string;
  status: IncidentStatus;
  openedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  triggerReadingId: string;
  correlationId: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  resourceId: string;
  correlationId: string;
  occurredAt: string;
  details: Record<string, unknown>;
}

export interface Snapshot {
  operator: Principal;
  station: { id: string; name: string; location: string; callsign: string };
  asset: {
    id: string;
    name: string;
    designation: string;
    status: "NOMINAL" | "DEGRADED";
    lastObservedAt: string | null;
  };
  readings: Reading[];
  incidents: Incident[];
  events: AuditEvent[];
  stats: { totalReadings: number; activeIncidents: number; scenarioRuns: number };
  fetchedAt: string;
}

export interface IngestResult {
  readingId: string;
  incidentId: string | null;
  disposition: "applied" | "stale" | "duplicate";
  incidentCreated: boolean;
}

export interface ScenarioResult {
  runId: string;
  kind: ScenarioKind;
  seed: number;
  readingsAdded: number;
  incidentId: string | null;
  replayed: boolean;
}
