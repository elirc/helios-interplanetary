import type { Pool, PoolClient } from "pg";
import type { Principal } from "../domain/contracts";
import type { HubSnapshot } from "../domain/hub";
import { getPool, transaction } from "./db";
import { providerConfig } from "./model-gateway";

export async function rowsJson<T>(
  client: PoolClient,
  sql: string,
  values: unknown[],
): Promise<T[]> {
  return (
    await client.query<{ data: T[] }>(
      `SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb) AS data FROM (${sql}) t`,
      values,
    )
  ).rows[0].data;
}
export async function getHubSnapshot(p: Principal, pool: Pool = getPool()): Promise<HubSnapshot> {
  return transaction(pool, async (c) => {
    await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const q = <T>(sql: string) => rowsJson<T>(c, sql, [p.organizationId]);
    return {
      operator: p,
      requestMetrics: (
        await q<HubSnapshot["requestMetrics"]>(
          "SELECT count(*)::int AS samples,count(*) FILTER(WHERE status_code>=500)::int AS server_errors,COALESCE(percentile_cont(.95) WITHIN GROUP(ORDER BY duration_ms),0) AS p95_ms FROM request_spans WHERE organization_id=$1 AND started_at>clock_timestamp()-interval '1 hour'",
        )
      )[0],
      requestSpans: await q(
        "SELECT trace_id,request_id,status_code,duration_ms,started_at FROM request_spans WHERE organization_id=$1 ORDER BY started_at DESC LIMIT 20",
      ),
      assets: await q(
        "SELECT id,designation,status,last_observed_at FROM assets WHERE organization_id=$1 ORDER BY id",
      ),
      incidents: await q(
        "SELECT id,number,title,status,asset_id FROM incidents WHERE organization_id=$1 ORDER BY opened_at DESC LIMIT 40",
      ),
      workOrders: await q(
        "SELECT * FROM work_orders WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 40",
      ),
      tasks: await q(
        "SELECT t.* FROM work_order_tasks t JOIN (SELECT id FROM work_orders WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 40) w ON t.work_order_id=w.id WHERE t.organization_id=$1 ORDER BY t.ordinal",
      ),
      stock: await q(
        "SELECT s.*,w.name AS warehouse_name,w.kind,s.on_hand-s.reserved AS available FROM inventory_stock s JOIN warehouses w ON w.organization_id=s.organization_id AND w.id=s.warehouse_id WHERE s.organization_id=$1 ORDER BY w.kind DESC,w.id,s.sku",
      ),
      reservations: await q(
        "SELECT work_order_id,status,quantity FROM inventory_reservations WHERE organization_id=$1 ORDER BY id LIMIT 100",
      ),
      purchases: await q(
        "SELECT * FROM purchase_requests WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 40",
      ),
      shipments: await q(
        "SELECT * FROM shipments WHERE organization_id=$1 ORDER BY departed_at DESC LIMIT 40",
      ),
      docks: await q(
        "SELECT * FROM docking_reservations WHERE organization_id=$1 ORDER BY starts_at DESC LIMIT 40",
      ),
      vessels: await q(
        "SELECT id,name,status,capacity FROM vessels WHERE organization_id=$1 ORDER BY id",
      ),
      crew: await q(
        "SELECT id,name,title,certification,certified_until,available FROM crew_members WHERE organization_id=$1 ORDER BY (certification='COOLANT_L2') DESC,id LIMIT 24",
      ),
      workforce: (
        await q<HubSnapshot["workforce"]>(
          "SELECT count(*)::int AS count,count(*) FILTER(WHERE certification='COOLANT_L2')::int AS certified,count(*) FILTER(WHERE available)::int AS available FROM crew_members WHERE organization_id=$1",
        )
      )[0],
      budget: (
        await q<HubSnapshot["budget"]>(
          "SELECT name,limit_cents,committed_cents,spent_cents FROM budgets WHERE organization_id=$1",
        )
      )[0],
      postmortems: await q(
        "SELECT * FROM postmortems WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 20",
      ),
      events: await q(
        "SELECT * FROM audit_events WHERE organization_id=$1 AND action<>'TelemetryRecorded' ORDER BY occurred_at DESC,id LIMIT 60",
      ),
      fetchedAt: new Date().toISOString(),
      clock: (
        await q<HubSnapshot["clock"]>(
          "SELECT GREATEST(now_at,(SELECT max(last_observed_at) FROM assets WHERE organization_id=$1)) AS now_at,paused,speed,tick FROM simulation_state WHERE organization_id=$1",
        )
      )[0],
      energy: (
        await q<HubSnapshot["energy"]>("SELECT * FROM energy_grids WHERE organization_id=$1")
      )[0],
      energyReadings: await q(
        "SELECT * FROM (SELECT observed_at,generation_kw,demand_kw,battery_kwh FROM energy_readings WHERE organization_id=$1 ORDER BY observed_at DESC LIMIT 40) r ORDER BY observed_at",
      ),
      projects: await q(
        "SELECT id,name,status,target_units,completed_units FROM projects WHERE organization_id=$1 ORDER BY id",
      ),
      queue: (
        await q<HubSnapshot["queue"]>(
          "SELECT count(*) FILTER(WHERE status='PENDING')::int AS pending,count(*) FILTER(WHERE status='RUNNING')::int AS running,count(*) FILTER(WHERE status='DELIVERED')::int AS delivered,count(*) FILTER(WHERE status='DEAD')::int AS dead,COALESCE(EXTRACT(EPOCH FROM clock_timestamp()-min(occurred_at) FILTER(WHERE status='PENDING')),0)::float AS oldest_seconds FROM outbox_events WHERE organization_id=$1",
        )
      )[0],
      deliveries: await q(
        "SELECT id,event_type,status,attempts,last_error,correlation_id,occurred_at,available_at FROM outbox_events WHERE organization_id=$1 ORDER BY (status='DEAD') DESC,(status='PENDING') DESC,occurred_at DESC LIMIT 60",
      ),
      workflows: await q(
        "SELECT * FROM workflow_instances WHERE organization_id=$1 ORDER BY updated_at DESC LIMIT 40",
      ),
      notifications: await q(
        "SELECT * FROM notifications WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 30",
      ),
      worker:
        (
          await rowsJson<NonNullable<HubSnapshot["worker"]>>(
            c,
            "SELECT seen_at,processed FROM worker_heartbeats ORDER BY seen_at DESC LIMIT 1",
            [],
          )
        )[0] ?? null,
      documents: await q(
        "SELECT id,slug,title,version,status,body,created_at FROM knowledge_documents WHERE organization_id=$1 ORDER BY slug,version DESC LIMIT 50",
      ),
      agentRuns: await q(
        "SELECT id,agent,provider,model,prompt_version,status,output,error,duration_ms,input_tokens,output_tokens,started_at FROM agent_runs WHERE organization_id=$1 ORDER BY started_at DESC LIMIT 20",
      ),
      agentSteps: await q(
        "SELECT s.run_id,s.ordinal,s.name,s.kind,s.input,s.output,s.status,s.duration_ms FROM agent_steps s JOIN (SELECT id FROM agent_runs WHERE organization_id=$1 ORDER BY started_at DESC LIMIT 20) r ON r.id=s.run_id WHERE s.organization_id=$1 ORDER BY s.run_id,s.ordinal",
      ),
      agentApprovals: await q(
        "SELECT id,run_id,action,status,decided_by FROM agent_approvals WHERE organization_id=$1 ORDER BY id LIMIT 100",
      ),
      evaluations: await q(
        "SELECT * FROM evaluation_runs WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 10",
      ),
      modelProvider: providerConfig(),
      subscriptions: await q(
        "SELECT s.id,s.plan,s.base_cents,s.unit_cents,c.name AS customer_name FROM subscriptions s JOIN customers c ON c.organization_id=s.organization_id AND c.id=s.customer_id WHERE s.organization_id=$1 ORDER BY s.id",
      ),
      invoices: await q(
        "SELECT id,number,customer_id,period,status,amount_cents FROM invoices WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 40",
      ),
      invoiceLines: await q(
        "SELECT invoice_id,description,quantity,unit_cents FROM invoice_lines WHERE organization_id=$1 ORDER BY invoice_id,line_key LIMIT 100",
      ),
      payments: await q(
        "SELECT id,invoice_id,status,amount_cents,provider_key FROM payment_attempts WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 40",
      ),
      providerCharges: await q(
        "SELECT provider_key,invoice_id,amount_cents,status FROM provider_charges WHERE organization_id=$1 ORDER BY charged_at DESC LIMIT 40",
      ),
      journals: await q(
        "SELECT e.id,e.reference,e.description,e.created_at,COALESCE(sum(l.amount_cents) FILTER(WHERE l.side='DEBIT'),0)::int AS debits,COALESCE(sum(l.amount_cents) FILTER(WHERE l.side='CREDIT'),0)::int AS credits,jsonb_agg(jsonb_build_object('account',l.account,'side',l.side,'amount_cents',l.amount_cents) ORDER BY l.side,l.account) AS lines FROM journal_entries e JOIN journal_lines l ON l.organization_id=e.organization_id AND l.entry_id=e.id WHERE e.organization_id=$1 GROUP BY e.id ORDER BY e.created_at DESC LIMIT 40",
      ),
      tickets: await q(
        "SELECT id,number,invoice_id,title,status,summary,resolution,due_at FROM support_tickets WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 30",
      ),
      investigations: await q(
        "SELECT id,number,title,status,signals,finding FROM security_investigations WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 30",
      ),
    };
  });
}
