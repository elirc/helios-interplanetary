CREATE TABLE departments (
  id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id), name text NOT NULL,
  UNIQUE (organization_id,id)
);
CREATE TABLE crew_members (
  id text PRIMARY KEY, organization_id text NOT NULL, department_id text NOT NULL,
  name text NOT NULL, title text NOT NULL, station_id text NOT NULL,
  certification text NOT NULL, certified_until timestamptz NOT NULL,
  available boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id,id),
  FOREIGN KEY (organization_id,department_id) REFERENCES departments(organization_id,id),
  FOREIGN KEY (organization_id,station_id) REFERENCES stations(organization_id,id)
);
CREATE TABLE warehouses (
  id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id), name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ORIGIN','STATION')), UNIQUE (organization_id,id)
);
CREATE TABLE inventory_stock (
  organization_id text NOT NULL, warehouse_id text NOT NULL, sku text NOT NULL,
  name text NOT NULL, on_hand integer NOT NULL CHECK(on_hand >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK(reserved >= 0 AND reserved <= on_hand),
  PRIMARY KEY(organization_id,warehouse_id,sku),
  FOREIGN KEY(organization_id,warehouse_id) REFERENCES warehouses(organization_id,id)
);
CREATE TABLE work_orders (
  id uuid PRIMARY KEY, number integer GENERATED ALWAYS AS IDENTITY,
  organization_id text NOT NULL, incident_id uuid NOT NULL, asset_id text NOT NULL,
  status text NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED','AWAITING_PARTS','READY','IN_PROGRESS','VERIFYING','COMPLETED','CANCELLED')),
  title text NOT NULL, required_sku text NOT NULL DEFAULT 'PUMP-B17', quantity integer NOT NULL DEFAULT 1 CHECK(quantity > 0),
  crew_id text, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  started_at timestamptz, verification_after timestamptz, completed_at timestamptz,
  correlation_id uuid NOT NULL,
  UNIQUE(organization_id,id), UNIQUE(organization_id,incident_id),
  FOREIGN KEY(organization_id,incident_id) REFERENCES incidents(organization_id,id),
  FOREIGN KEY(organization_id,asset_id) REFERENCES assets(organization_id,id),
  FOREIGN KEY(organization_id,crew_id) REFERENCES crew_members(organization_id,id)
);
CREATE UNIQUE INDEX one_active_assignment ON work_orders(organization_id,crew_id) WHERE status IN ('IN_PROGRESS','VERIFYING');
CREATE TABLE work_order_tasks (
  organization_id text NOT NULL, work_order_id uuid NOT NULL, task_key text NOT NULL,
  title text NOT NULL, ordinal integer NOT NULL, completed_by text, completed_at timestamptz,
  PRIMARY KEY(organization_id,work_order_id,task_key),
  FOREIGN KEY(organization_id,work_order_id) REFERENCES work_orders(organization_id,id)
);
CREATE TABLE inventory_reservations (
  id uuid PRIMARY KEY, organization_id text NOT NULL, work_order_id uuid NOT NULL,
  warehouse_id text NOT NULL, sku text NOT NULL, quantity integer NOT NULL CHECK(quantity > 0),
  status text NOT NULL CHECK(status IN ('HELD','CONSUMED','RELEASED')),
  UNIQUE(organization_id,work_order_id),
  FOREIGN KEY(organization_id,work_order_id) REFERENCES work_orders(organization_id,id),
  FOREIGN KEY(organization_id,warehouse_id,sku) REFERENCES inventory_stock(organization_id,warehouse_id,sku)
);
CREATE TABLE vendors (
  id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id), name text NOT NULL,
  sku text NOT NULL, unit_price_cents integer NOT NULL CHECK(unit_price_cents > 0), UNIQUE(organization_id,id)
);
CREATE TABLE budgets (
  organization_id text PRIMARY KEY REFERENCES organizations(id), name text NOT NULL,
  limit_cents integer NOT NULL CHECK(limit_cents >= 0), committed_cents integer NOT NULL DEFAULT 0,
  spent_cents integer NOT NULL DEFAULT 0,
  CHECK(committed_cents >= 0 AND spent_cents >= 0 AND committed_cents + spent_cents <= limit_cents)
);
CREATE TABLE purchase_requests (
  id uuid PRIMARY KEY, number integer GENERATED ALWAYS AS IDENTITY,
  organization_id text NOT NULL, work_order_id uuid NOT NULL, vendor_id text NOT NULL,
  sku text NOT NULL, quantity integer NOT NULL CHECK(quantity > 0), total_cents integer NOT NULL CHECK(total_cents > 0),
  status text NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK(status IN ('PENDING_APPROVAL','APPROVED','IN_TRANSIT','RECEIVED','REJECTED','CANCELLED')),
  requested_by text NOT NULL, approved_by text, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  correlation_id uuid NOT NULL, UNIQUE(organization_id,id), UNIQUE(organization_id,work_order_id),
  FOREIGN KEY(organization_id,work_order_id) REFERENCES work_orders(organization_id,id),
  FOREIGN KEY(organization_id,vendor_id) REFERENCES vendors(organization_id,id)
);
CREATE TABLE vessels (
  id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id), name text NOT NULL,
  status text NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE','IN_TRANSIT','MAINTENANCE')),
  capacity integer NOT NULL CHECK(capacity > 0), UNIQUE(organization_id,id)
);
CREATE TABLE shipments (
  id uuid PRIMARY KEY, number integer GENERATED ALWAYS AS IDENTITY,
  organization_id text NOT NULL, purchase_id uuid NOT NULL, vessel_id text NOT NULL,
  origin_id text NOT NULL, destination_id text NOT NULL,
  status text NOT NULL DEFAULT 'IN_TRANSIT' CHECK(status IN ('IN_TRANSIT','DELAYED','DELIVERED')),
  route text NOT NULL DEFAULT 'Earth → lunar relay → station',
  eta timestamptz NOT NULL, departed_at timestamptz NOT NULL, delivered_at timestamptz,
  delay_minutes integer NOT NULL DEFAULT 0 CHECK(delay_minutes >= 0),
  correlation_id uuid NOT NULL, UNIQUE(organization_id,id), UNIQUE(organization_id,purchase_id),
  FOREIGN KEY(organization_id,purchase_id) REFERENCES purchase_requests(organization_id,id),
  FOREIGN KEY(organization_id,vessel_id) REFERENCES vessels(organization_id,id),
  FOREIGN KEY(organization_id,origin_id) REFERENCES warehouses(organization_id,id),
  FOREIGN KEY(organization_id,destination_id) REFERENCES warehouses(organization_id,id)
);
CREATE UNIQUE INDEX vessel_in_flight ON shipments(organization_id,vessel_id) WHERE status <> 'DELIVERED';
CREATE TABLE docking_reservations (
  organization_id text NOT NULL, shipment_id uuid NOT NULL, dock text NOT NULL,
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'RESERVED' CHECK(status IN ('RESERVED','MISSED','COMPLETED')),
  PRIMARY KEY(organization_id,shipment_id), CHECK(ends_at > starts_at),
  FOREIGN KEY(organization_id,shipment_id) REFERENCES shipments(organization_id,id)
);
CREATE TABLE postmortems (
  id uuid PRIMARY KEY, organization_id text NOT NULL, incident_id uuid NOT NULL, work_order_id uuid NOT NULL,
  title text NOT NULL, summary text NOT NULL, evidence jsonb NOT NULL,
  created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(organization_id,incident_id),
  FOREIGN KEY(organization_id,incident_id) REFERENCES incidents(organization_id,id),
  FOREIGN KEY(organization_id,work_order_id) REFERENCES work_orders(organization_id,id)
);
CREATE TABLE operation_commands (
  organization_id text NOT NULL REFERENCES organizations(id), id uuid NOT NULL,
  actor_id text NOT NULL, payload jsonb NOT NULL, result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(organization_id,id)
);
CREATE INDEX work_orders_tenant_status ON work_orders(organization_id,status,created_at DESC);
CREATE INDEX purchases_tenant_status ON purchase_requests(organization_id,status);
CREATE INDEX shipments_tenant_status ON shipments(organization_id,status);
