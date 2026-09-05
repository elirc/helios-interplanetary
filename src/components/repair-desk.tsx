import type { HubSnapshot } from "../domain/hub";
import { Action, Badge, Empty, Panel, label, simDate, type SendCommand } from "./hub-shared";

export function RepairDesk({ data, send }: { data: HubSnapshot; send: SendCommand }) {
  const candidates = data.incidents.filter(
    (i) => i.status !== "RESOLVED" && !data.workOrders.some((w) => w.incident_id === i.id),
  );
  return (
    <div className="hub-stack">
      {candidates.length > 0 && (
        <Panel title="Incidents awaiting a repair plan" kicker="01 / Respond">
          {candidates.map((i) => (
            <div className="hub-row" key={i.id}>
              <div>
                <strong>INC-{String(i.number).padStart(4, "0")}</strong>
                <p>{i.title}</p>
              </div>
              <Badge value={i.status} />
              {i.status === "OPEN" ? (
                <Action onClick={() => send("acknowledge", { id: i.id }, "incident")}>
                  Acknowledge incident
                </Action>
              ) : (
                <Action onClick={() => send("create_work_order", { incidentId: i.id })}>
                  Create work order
                </Action>
              )}
            </div>
          ))}
        </Panel>
      )}
      <Panel title="Maintenance work orders" kicker="02 / Plan · supply · repair · verify">
        {!data.workOrders.length && (
          <Empty>
            Inject a coolant degradation in Mission Control, then acknowledge the incident to begin
            the repair workflow.
          </Empty>
        )}
        {data.workOrders.map((work) => {
          const tasks = data.tasks.filter((t) => t.work_order_id === work.id);
          const purchase = data.purchases.find((p) => p.work_order_id === work.id);
          const crew = data.crew.find((c) => c.id === work.crew_id);
          return (
            <article className="hub-work" key={work.id} data-testid="work-order">
              <div className="hub-row">
                <div>
                  <span className="hub-kicker">
                    WO-{String(work.number).padStart(4, "0")} · {work.asset_id}
                  </span>
                  <h3>{work.title}</h3>
                </div>
                <Badge value={work.status} />
              </div>
              <div className="hub-lifecycle">
                {[
                  "PLANNED",
                  "AWAITING_PARTS",
                  "READY",
                  "IN_PROGRESS",
                  "VERIFYING",
                  "COMPLETED",
                ].map((s) => (
                  <span key={s} className={s === work.status ? "current" : ""}>
                    {label(s)}
                  </span>
                ))}
              </div>
              <div className="hub-work-grid">
                <div>
                  <p className="hub-muted">
                    Required: {work.quantity} × {work.required_sku}
                  </p>
                  <p className="hub-muted">Technician: {crew?.name ?? "Unassigned"}</p>
                  {purchase && (
                    <p className="hub-muted">
                      Procurement: <Badge value={purchase.status} />
                    </p>
                  )}
                  {["PLANNED", "AWAITING_PARTS", "READY"].includes(work.status) && (
                    <label className="hub-field">
                      Certified technician
                      <select
                        aria-label={`Technician for WO-${work.number}`}
                        value={work.crew_id ?? ""}
                        onChange={(e) => {
                          if (e.target.value)
                            void send("assign_crew", {
                              workOrderId: work.id,
                              crewId: e.target.value,
                            });
                        }}
                      >
                        <option value="">Select a technician</option>
                        {data.crew
                          .filter((c) => c.certification === "COOLANT_L2")
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ·{" "}
                              {new Date(c.certified_until) <
                              new Date(data.assets[0]?.last_observed_at)
                                ? "expired"
                                : c.available
                                  ? "available"
                                  : "busy"}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                </div>
                <ol className="hub-checklist">
                  {tasks.map((task) => (
                    <li key={task.task_key} className={task.completed_at ? "done" : ""}>
                      <span>{task.completed_at ? "✓" : task.ordinal + 1}</span>
                      <div>
                        {task.title}
                        {task.completed_at && (
                          <small>Recorded {simDate(task.completed_at)} SIM UTC</small>
                        )}
                      </div>
                      {work.status === "IN_PROGRESS" && !task.completed_at && (
                        <Action
                          secondary
                          onClick={() =>
                            send("complete_task", { workOrderId: work.id, taskKey: task.task_key })
                          }
                        >
                          Complete {task.task_key}
                        </Action>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="hub-actions">
                {["PLANNED", "AWAITING_PARTS"].includes(work.status) && (
                  <Action onClick={() => send("reserve_parts", { workOrderId: work.id })}>
                    Reserve parts
                  </Action>
                )}
                {work.status === "AWAITING_PARTS" && !purchase && (
                  <Action onClick={() => send("request_purchase", { workOrderId: work.id })}>
                    Request procurement
                  </Action>
                )}
                {work.status === "READY" && (
                  <Action
                    disabled={!work.crew_id}
                    onClick={() => send("start_repair", { workOrderId: work.id })}
                  >
                    Start repair
                  </Action>
                )}
                {work.status === "IN_PROGRESS" && (
                  <Action
                    disabled={tasks.some((t) => !t.completed_at)}
                    onClick={() => send("begin_verification", { workOrderId: work.id })}
                  >
                    Begin verification
                  </Action>
                )}
                {work.status === "VERIFYING" && (
                  <>
                    <Action
                      secondary
                      onClick={() => send("recovery", { assetId: work.asset_id }, "scenario")}
                    >
                      Record recovery telemetry
                    </Action>
                    <Action onClick={() => send("complete_repair", { workOrderId: work.id })}>
                      Complete verified repair
                    </Action>
                  </>
                )}
                {["PLANNED", "AWAITING_PARTS", "READY"].includes(work.status) && (
                  <Action
                    secondary
                    onClick={() => send("cancel_work_order", { workOrderId: work.id })}
                  >
                    Cancel work order
                  </Action>
                )}
              </div>
              {work.status === "VERIFYING" && (
                <p className="hub-note">
                  Completion requires nominal telemetry newer than the verification checkpoint.
                  Parts are consumed and the incident closes in the same transaction.
                </p>
              )}
            </article>
          );
        })}
      </Panel>
      {data.postmortems.length > 0 && (
        <Panel title="Recovery records" kicker="03 / Evidence">
          {data.postmortems.map((p) => (
            <article className="hub-work" key={p.id}>
              <h3>{p.title}</h3>
              <p>{p.summary}</p>
              <p className="hub-muted">
                {p.evidence.events.length} correlated events · verified{" "}
                {simDate(p.evidence.verificationAt)} SIM UTC
              </p>
              <details>
                <summary>Inspect recorded evidence</summary>
                <pre>{JSON.stringify(p.evidence, null, 2)}</pre>
              </details>
            </article>
          ))}
        </Panel>
      )}
    </div>
  );
}
