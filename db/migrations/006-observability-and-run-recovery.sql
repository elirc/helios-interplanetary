CREATE TABLE request_spans (
  trace_id text NOT NULL, span_id text NOT NULL, organization_id text NOT NULL REFERENCES organizations(id),
  name text NOT NULL, request_id text NOT NULL, status_code integer NOT NULL,
  duration_ms double precision NOT NULL, started_at timestamptz NOT NULL,
  PRIMARY KEY(trace_id,span_id)
);
CREATE INDEX request_spans_tenant_time ON request_spans(organization_id,started_at DESC);
ALTER TABLE agent_approvals ADD COLUMN expires_at timestamptz NOT NULL DEFAULT(clock_timestamp()+interval '8 hours');
