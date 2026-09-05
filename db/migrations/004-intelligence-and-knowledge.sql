CREATE TABLE knowledge_documents (
  id uuid PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id), slug text NOT NULL,
  title text NOT NULL, version integer NOT NULL CHECK(version>0), body text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED')),
  created_by text NOT NULL, approved_by text, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(organization_id,id), UNIQUE(organization_id,slug,version)
);
CREATE TABLE knowledge_chunks (
  id uuid PRIMARY KEY, organization_id text NOT NULL, document_id uuid NOT NULL,
  ordinal integer NOT NULL, content text NOT NULL, embedding real[] NOT NULL,
  embedding_model text NOT NULL DEFAULT 'token-hash-128-v1',
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english',content)) STORED,
  UNIQUE(organization_id,document_id,ordinal),
  FOREIGN KEY(organization_id,document_id) REFERENCES knowledge_documents(organization_id,id)
);
CREATE INDEX knowledge_search ON knowledge_chunks USING gin(search_vector);
CREATE TABLE agent_runs (
  id uuid PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
  agent text NOT NULL, provider text NOT NULL, model text NOT NULL, prompt_version text NOT NULL,
  status text NOT NULL CHECK(status IN ('RUNNING','SUCCEEDED','BLOCKED','FAILED','CANCELLED')),
  requested_by text NOT NULL, incident_id uuid, input jsonb NOT NULL,
  output jsonb, error text, started_at timestamptz NOT NULL DEFAULT clock_timestamp(), finished_at timestamptz,
  input_tokens integer, output_tokens integer, duration_ms integer,
  UNIQUE(organization_id,id), FOREIGN KEY(organization_id,incident_id) REFERENCES incidents(organization_id,id)
);
CREATE TABLE agent_steps (
  id uuid PRIMARY KEY, organization_id text NOT NULL, run_id uuid NOT NULL, ordinal integer NOT NULL,
  name text NOT NULL, kind text NOT NULL, input jsonb NOT NULL, output jsonb,
  status text NOT NULL, duration_ms integer NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(organization_id,run_id,ordinal),
  FOREIGN KEY(organization_id,run_id) REFERENCES agent_runs(organization_id,id)
);
CREATE TABLE agent_approvals (
  id uuid PRIMARY KEY, organization_id text NOT NULL, run_id uuid NOT NULL,
  action jsonb NOT NULL, status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
  decided_by text, decided_at timestamptz, result jsonb,
  UNIQUE(organization_id,run_id), FOREIGN KEY(organization_id,run_id) REFERENCES agent_runs(organization_id,id)
);
CREATE TABLE evaluation_runs (
  id uuid PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
  suite text NOT NULL, provider text NOT NULL, version text NOT NULL,
  total integer NOT NULL, passed integer NOT NULL, results jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), created_by text NOT NULL,
  CHECK(passed>=0 AND passed<=total)
);
