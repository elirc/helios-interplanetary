CREATE TABLE organizations (
  id text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE stations (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  location text NOT NULL,
  callsign text NOT NULL,
  UNIQUE (organization_id, id)
);

CREATE TABLE assets (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  station_id text NOT NULL,
  name text NOT NULL,
  designation text NOT NULL,
  status text NOT NULL DEFAULT 'NOMINAL' CHECK (status IN ('NOMINAL','DEGRADED')),
  last_observed_at timestamptz,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, station_id) REFERENCES stations(organization_id, id)
);

CREATE TABLE telemetry_readings (
  id uuid NOT NULL,
  organization_id text NOT NULL,
  asset_id text NOT NULL,
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  pressure_bar double precision NOT NULL CHECK (pressure_bar >= 0 AND pressure_bar <= 20),
  vibration_mms double precision NOT NULL CHECK (vibration_mms >= 0 AND vibration_mms <= 100),
  temperature_c double precision NOT NULL CHECK (temperature_c >= -100 AND temperature_c <= 200),
  applied boolean NOT NULL,
  breached boolean NOT NULL,
  correlation_id uuid NOT NULL,
  incident_id uuid,
  PRIMARY KEY (organization_id, id),
  FOREIGN KEY (organization_id, asset_id) REFERENCES assets(organization_id, id)
);
CREATE INDEX readings_asset_time ON telemetry_readings (organization_id, asset_id, observed_at DESC);

CREATE TABLE incidents (
  id uuid PRIMARY KEY,
  number integer GENERATED ALWAYS AS IDENTITY,
  organization_id text NOT NULL,
  asset_id text NOT NULL,
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'P2' CHECK (severity IN ('P1','P2','P3','P4')),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
  trigger_reading_id uuid NOT NULL,
  correlation_id uuid NOT NULL,
  opened_at timestamptz NOT NULL,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, asset_id) REFERENCES assets(organization_id, id),
  FOREIGN KEY (organization_id, trigger_reading_id) REFERENCES telemetry_readings(organization_id, id)
);
CREATE UNIQUE INDEX one_active_incident_per_asset ON incidents (organization_id, asset_id) WHERE status <> 'RESOLVED';
ALTER TABLE telemetry_readings ADD CONSTRAINT reading_incident_fk FOREIGN KEY (organization_id, incident_id) REFERENCES incidents(organization_id, id);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  actor_id text NOT NULL,
  action text NOT NULL,
  resource_id text NOT NULL,
  correlation_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  details jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX audit_tenant_time ON audit_events (organization_id, occurred_at DESC);
CREATE INDEX audit_resource ON audit_events (organization_id, resource_id, occurred_at);

CREATE TABLE scenario_runs (
  id uuid NOT NULL,
  organization_id text NOT NULL,
  asset_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('degradation','recovery','nominal')),
  seed bigint NOT NULL,
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  result jsonb NOT NULL,
  PRIMARY KEY (organization_id, id),
  FOREIGN KEY (organization_id, asset_id) REFERENCES assets(organization_id, id)
);
