import type { Principal } from "./contracts";
import type { WorkStatus } from "./operations";

export interface WorkView {
  id: string;
  number: number;
  incident_id: string;
  asset_id: string;
  title: string;
  status: WorkStatus;
  required_sku: string;
  quantity: number;
  crew_id: string | null;
  created_at: string;
  correlation_id: string;
}
export interface PurchaseView {
  id: string;
  number: number;
  work_order_id: string;
  vendor_id: string;
  sku: string;
  quantity: number;
  total_cents: number;
  status: string;
  approved_by: string | null;
}
export interface ShipmentView {
  id: string;
  number: number;
  purchase_id: string;
  vessel_id: string;
  status: string;
  route: string;
  eta: string;
  delay_minutes: number;
  origin_id: string;
  destination_id: string;
}
export interface HubSnapshot {
  requestMetrics: { samples: number; server_errors: number; p95_ms: number };
  requestSpans: {
    trace_id: string;
    request_id: string;
    status_code: number;
    duration_ms: number;
    started_at: string;
  }[];
  operator: Principal;
  assets: { id: string; designation: string; status: string; last_observed_at: string }[];
  incidents: { id: string; number: number; title: string; status: string; asset_id: string }[];
  workOrders: WorkView[];
  tasks: {
    work_order_id: string;
    task_key: string;
    title: string;
    ordinal: number;
    completed_at: string | null;
  }[];
  stock: {
    warehouse_id: string;
    warehouse_name: string;
    kind: string;
    sku: string;
    name: string;
    on_hand: number;
    reserved: number;
    available: number;
  }[];
  reservations: { work_order_id: string; status: string; quantity: number }[];
  purchases: PurchaseView[];
  shipments: ShipmentView[];
  docks: {
    shipment_id: string;
    dock: string;
    starts_at: string;
    ends_at: string;
    status: string;
  }[];
  vessels: { id: string; name: string; status: string; capacity: number }[];
  crew: {
    id: string;
    name: string;
    title: string;
    certification: string;
    certified_until: string;
    available: boolean;
  }[];
  workforce: { count: number; certified: number; available: number };
  budget: { name: string; limit_cents: number; committed_cents: number; spent_cents: number };
  postmortems: {
    id: string;
    incident_id: string;
    work_order_id: string;
    title: string;
    summary: string;
    evidence: { events: unknown[]; verificationAt: string };
    created_at: string;
  }[];
  events: {
    id: string;
    action: string;
    resource_id: string;
    actor_id: string;
    occurred_at: string;
    correlation_id: string;
    details: Record<string, unknown>;
  }[];
  fetchedAt: string;
  clock: { now_at: string; paused: boolean; speed: number; tick: number };
  energy: {
    name: string;
    solar_kw: number;
    critical_kw: number;
    industrial_kw: number;
    battery_kwh: number;
    capacity_kwh: number;
    load_shed: boolean;
    outage: boolean;
    repair_status: string;
  };
  energyReadings: {
    observed_at: string;
    generation_kw: number;
    demand_kw: number;
    battery_kwh: number;
  }[];
  projects: {
    id: string;
    name: string;
    status: string;
    target_units: number;
    completed_units: number;
  }[];
  queue: {
    pending: number;
    running: number;
    delivered: number;
    dead: number;
    oldest_seconds: number;
  };
  deliveries: {
    id: string;
    event_type: string;
    status: string;
    attempts: number;
    last_error: string | null;
    correlation_id: string;
    occurred_at: string;
    available_at: string;
  }[];
  workflows: {
    id: string;
    kind: string;
    status: string;
    resource_id: string;
    due_at: string | null;
    history: { type: string; status: string; occurredAt: string }[];
  }[];
  notifications: {
    id: string;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string;
  }[];
  worker: { seen_at: string; processed: number } | null;
  documents: {
    id: string;
    slug: string;
    title: string;
    version: number;
    status: string;
    body: string;
    created_at: string;
  }[];
  agentRuns: {
    id: string;
    agent: string;
    provider: string;
    model: string;
    prompt_version: string;
    status: string;
    output: import("./intelligence").Recommendation | null;
    error: string | null;
    duration_ms: number | null;
    input_tokens: number | null;
    output_tokens: number | null;
    started_at: string;
  }[];
  agentSteps: {
    run_id: string;
    ordinal: number;
    name: string;
    kind: string;
    input: Record<string, unknown>;
    output: unknown;
    status: string;
    duration_ms: number;
  }[];
  agentApprovals: {
    id: string;
    run_id: string;
    action: Record<string, unknown>;
    status: string;
    decided_by: string | null;
  }[];
  evaluations: {
    id: string;
    suite: string;
    provider: string;
    version: string;
    total: number;
    passed: number;
    results: { name: string; split: string; passed: boolean; expected: string; actual: string }[];
    created_at: string;
  }[];
  modelProvider: { provider: string; model: string };
  subscriptions: {
    id: string;
    plan: string;
    customer_name: string;
    base_cents: number;
    unit_cents: number;
  }[];
  invoices: {
    id: string;
    number: number;
    customer_id: string;
    period: string;
    status: string;
    amount_cents: number;
  }[];
  invoiceLines: { invoice_id: string; description: string; quantity: number; unit_cents: number }[];
  payments: {
    id: string;
    invoice_id: string;
    status: string;
    amount_cents: number;
    provider_key: string;
  }[];
  providerCharges: {
    provider_key: string;
    invoice_id: string;
    amount_cents: number;
    status: string;
  }[];
  journals: {
    id: string;
    reference: string;
    description: string;
    created_at: string;
    debits: number;
    credits: number;
    lines: { account: string; side: string; amount_cents: number }[];
  }[];
  tickets: {
    id: string;
    number: number;
    invoice_id: string | null;
    title: string;
    status: string;
    summary: string;
    resolution: string | null;
    due_at: string;
  }[];
  investigations: {
    id: string;
    number: number;
    title: string;
    status: string;
    signals: unknown[];
    finding: string | null;
  }[];
}
