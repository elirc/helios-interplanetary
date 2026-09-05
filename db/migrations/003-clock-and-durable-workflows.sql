CREATE TABLE simulation_state (
  organization_id text PRIMARY KEY REFERENCES organizations(id), now_at timestamptz NOT NULL,
  paused boolean NOT NULL DEFAULT true, speed integer NOT NULL DEFAULT 1 CHECK(speed IN (1,5,10,60)),
  seed bigint NOT NULL DEFAULT 17, tick bigint NOT NULL DEFAULT 0,
  wall_tick_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE energy_grids (
  organization_id text PRIMARY KEY REFERENCES organizations(id), name text NOT NULL,
  solar_kw double precision NOT NULL DEFAULT 140 CHECK(solar_kw >= 0),
  critical_kw double precision NOT NULL DEFAULT 65 CHECK(critical_kw > 0),
  industrial_kw double precision NOT NULL DEFAULT 55 CHECK(industrial_kw >= 0),
  battery_kwh double precision NOT NULL DEFAULT 300 CHECK(battery_kwh >= 0),
  capacity_kwh double precision NOT NULL DEFAULT 300 CHECK(capacity_kwh > 0 AND battery_kwh <= capacity_kwh),
  load_shed boolean NOT NULL DEFAULT false, outage boolean NOT NULL DEFAULT false,
  repair_status text NOT NULL DEFAULT 'NONE' CHECK(repair_status IN ('NONE','PLANNED','REPAIRED')),
  updated_at timestamptz NOT NULL
);
CREATE TABLE energy_readings (
  id uuid PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
  observed_at timestamptz NOT NULL, generation_kw double precision NOT NULL,
  demand_kw double precision NOT NULL, battery_kwh double precision NOT NULL,
  correlation_id uuid NOT NULL
);
CREATE INDEX energy_history ON energy_readings(organization_id,observed_at DESC);
CREATE TABLE projects (
  id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id), name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','BLOCKED_ENERGY','COMPLETE')),
  target_units double precision NOT NULL DEFAULT 1000, completed_units double precision NOT NULL DEFAULT 0,
  rate_per_hour double precision NOT NULL DEFAULT 8, UNIQUE(organization_id,id)
);
CREATE TABLE outbox_events (
  id uuid PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
  event_type text NOT NULL, event_version integer NOT NULL DEFAULT 1,
  aggregate_type text NOT NULL DEFAULT 'operation', aggregate_id text NOT NULL,
  correlation_id uuid NOT NULL, causation_id uuid,
  producer text NOT NULL DEFAULT 'helios-domain', payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(), available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','RUNNING','DELIVERED','DEAD')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0), max_attempts integer NOT NULL DEFAULT 3 CHECK(max_attempts BETWEEN 1 AND 10),
  lease_token uuid, lease_until timestamptz, delivered_at timestamptz, last_error text,
  UNIQUE(organization_id,id)
);
CREATE INDEX outbox_claim ON outbox_events(status,available_at,lease_until);
CREATE TABLE event_receipts (
  organization_id text NOT NULL, event_id uuid NOT NULL, consumer text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(organization_id,event_id,consumer),
  FOREIGN KEY(organization_id,event_id) REFERENCES outbox_events(organization_id,id)
);
CREATE TABLE notifications (
  id uuid PRIMARY KEY, organization_id text NOT NULL, event_id uuid NOT NULL,
  title text NOT NULL, body text NOT NULL, read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(organization_id,event_id),
  FOREIGN KEY(organization_id,event_id) REFERENCES outbox_events(organization_id,id)
);
CREATE TABLE workflow_instances (
  id uuid PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
  kind text NOT NULL, version integer NOT NULL DEFAULT 1, resource_id text NOT NULL,
  status text NOT NULL, due_at timestamptz, history jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(organization_id,kind,resource_id)
);
CREATE TABLE worker_heartbeats (
  id text PRIMARY KEY, seen_at timestamptz NOT NULL DEFAULT clock_timestamp(), processed integer NOT NULL DEFAULT 0
);
CREATE TABLE exercise_overrides (
  organization_id text NOT NULL, event_id uuid NOT NULL, resolved_by text NOT NULL,
  resolved_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(organization_id,event_id),
  FOREIGN KEY(organization_id,event_id) REFERENCES outbox_events(organization_id,id)
);
