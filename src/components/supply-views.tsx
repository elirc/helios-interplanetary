import type { HubSnapshot } from "../domain/hub";
import { Action, Badge, Empty, Panel, Stat, money, simDate, type SendCommand } from "./hub-shared";

export function SupplyView({ data, send }: { data: HubSnapshot; send: SendCommand }) {
  return (
    <div className="hub-stack">
      <div className="hub-stats">
        <Stat
          label="Maintenance budget"
          value={money(data.budget.limit_cents)}
          detail={data.budget.name}
        />
        <Stat
          label="Committed"
          value={money(data.budget.committed_cents)}
          detail="Approved, not yet received"
        />
        <Stat
          label="Received spend"
          value={money(data.budget.spent_cents)}
          detail="Recognized on receipt"
        />
        <Stat
          label="Remaining"
          value={money(
            data.budget.limit_cents - data.budget.committed_cents - data.budget.spent_cents,
          )}
        />
      </div>
      <Panel title="Inventory positions" kicker="Atlas / Stores">
        <div className="hub-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Warehouse / item</th>
                <th>On hand</th>
                <th>Reserved</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {data.stock.map((s) => (
                <tr key={`${s.warehouse_id}:${s.sku}`}>
                  <td>
                    <strong>{s.warehouse_name}</strong>
                    <small>
                      {s.name} · {s.sku}
                    </small>
                  </td>
                  <td>{s.on_hand}</td>
                  <td>{s.reserved}</td>
                  <td>
                    <span className={s.available === 0 ? "hub-warning" : "hub-positive"}>
                      {s.available}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hub-note">
          Available = on hand − reserved. Stock remains reserved while a repair or shipment is
          active.
        </p>
      </Panel>
      <Panel title="Purchase requests" kicker="Atlas / Approval desk">
        {!data.purchases.length && (
          <Empty>Repair shortages appear here after an operator requests procurement.</Empty>
        )}
        {data.purchases.map((p) => (
          <article className="hub-work" key={p.id}>
            <div className="hub-row">
              <div>
                <span className="hub-kicker">PR-{String(p.number).padStart(4, "0")}</span>
                <h3>{p.quantity} × coolant pump cartridge</h3>
                <p>{money(p.total_cents)} · Asterion Fluid Systems</p>
              </div>
              <Badge value={p.status} />
            </div>
            <div className="hub-actions">
              {p.status === "PENDING_APPROVAL" && (
                <>
                  <Action onClick={() => send("approve_purchase", { purchaseId: p.id })}>
                    Approve purchase
                  </Action>
                  <Action secondary onClick={() => send("reject_purchase", { purchaseId: p.id })}>
                    Reject purchase
                  </Action>
                </>
              )}
              {p.status === "APPROVED" && (
                <Action onClick={() => send("dispatch_purchase", { purchaseId: p.id })}>
                  Dispatch shipment
                </Action>
              )}
              {["PENDING_APPROVAL", "APPROVED"].includes(p.status) && (
                <Action secondary onClick={() => send("cancel_purchase", { purchaseId: p.id })}>
                  Cancel purchase
                </Action>
              )}
            </div>
            {p.approved_by && (
              <p className="hub-note">Approved by {p.approved_by}. This is a simulated purchase.</p>
            )}
          </article>
        ))}
      </Panel>
    </div>
  );
}

export function LogisticsView({ data, send }: { data: HubSnapshot; send: SendCommand }) {
  return (
    <div className="hub-stack">
      <div className="hub-stats">
        {data.vessels.map((v) => (
          <div className="hub-stat" key={v.id}>
            <span>Cargo vessel · {v.capacity} units</span>
            <strong>{v.name}</strong>
            <Badge value={v.status} />
          </div>
        ))}
      </div>
      <Panel title="Cargo movements" kicker="Odyssey / Logistics">
        {!data.shipments.length && (
          <Empty>Approve and dispatch a purchase to reserve a vessel and docking window.</Empty>
        )}
        {data.shipments.map((s) => {
          const dock = data.docks.find((d) => d.shipment_id === s.id);
          return (
            <article className="hub-work" key={s.id}>
              <div className="hub-row">
                <div>
                  <span className="hub-kicker">
                    SHP-{String(s.number).padStart(4, "0")} ·{" "}
                    {data.vessels.find((v) => v.id === s.vessel_id)?.name}
                  </span>
                  <h3>Replacement parts to station stores</h3>
                </div>
                <Badge value={s.status} />
              </div>
              <div className={`hub-route ${s.status === "DELAYED" ? "delayed" : ""}`}>
                <span>EARTH</span>
                <i />
                <span>LUNAR RELAY</span>
                <i />
                <span>STATION</span>
              </div>
              <p>{s.route}</p>
              <p className="hub-muted">
                ETA {simDate(s.eta)} SIM UTC · cumulative delay {s.delay_minutes} minutes
              </p>
              {dock && (
                <p className="hub-muted">
                  Dock {dock.dock} · {simDate(dock.starts_at)}–{simDate(dock.ends_at)} ·{" "}
                  {dock.status.toLowerCase()}
                </p>
              )}
              {s.status === "DELAYED" && (
                <p className="hub-callout">
                  The original docking window is missed. The linked repair remains awaiting parts;
                  reserve a priority route to reduce the delay.
                </p>
              )}
              <div className="hub-actions">
                {s.status === "IN_TRANSIT" && (
                  <>
                    <Action onClick={() => send("deliver_shipment", { shipmentId: s.id })}>
                      Receive shipment
                    </Action>
                    <Action secondary onClick={() => send("delay_shipment", { shipmentId: s.id })}>
                      Inject cargo delay
                    </Action>
                  </>
                )}
                {s.status === "DELAYED" && (
                  <Action onClick={() => send("reroute_shipment", { shipmentId: s.id })}>
                    Reserve priority route
                  </Action>
                )}
              </div>
            </article>
          );
        })}
      </Panel>
    </div>
  );
}

export function WorkforceView({ data }: { data: HubSnapshot }) {
  return (
    <div className="hub-stack">
      <div className="hub-stats">
        <Stat label="Personnel" value={data.workforce.count} detail="Seeded station workforce" />
        <Stat label="Available" value={data.workforce.available} />
        <Stat
          label="Coolant qualifications"
          value={data.workforce.certified}
          detail="Validity checked at assignment and start"
        />
      </div>
      <Panel title="Engineering roster" kicker="Atlas / Workforce">
        <div className="hub-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Technician</th>
                <th>Qualification</th>
                <th>Valid through</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {data.crew.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <small>{c.title}</small>
                  </td>
                  <td>{c.certification}</td>
                  <td>
                    {new Date(c.certified_until).toLocaleDateString("en-US", { timeZone: "UTC" })}
                  </td>
                  <td>
                    <Badge value={c.available ? "AVAILABLE" : "IN_PROGRESS"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hub-note">
          Showing {data.crew.length} personnel. Expired certifications remain visible and are
          rejected by the assignment service.
        </p>
      </Panel>
    </div>
  );
}
