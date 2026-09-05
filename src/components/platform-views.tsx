import type { HubSnapshot } from "../domain/hub";
import { energyBalance } from "../domain/energy";
import { Action, Badge, Empty, Panel, Stat, simDate, type SendCommand } from "./hub-shared";

export function ClockBar({ data, send }: { data: HubSnapshot; send: SendCommand }) {
  return (
    <div className="hub-clockbar">
      <div>
        <span className="hub-kicker">Simulation clock</span>
        <strong>
          {simDate(data.clock.now_at)} <small>SIM UTC</small>
        </strong>
      </div>
      <Badge value={data.clock.paused ? "PAUSED" : "RUNNING"} />
      <div className="hub-actions">
        <Action
          secondary
          onClick={() => send(data.clock.paused ? "resume" : "pause", {}, "simulation")}
        >
          {data.clock.paused ? "Resume clock" : "Pause clock"}
        </Action>
        <select
          aria-label="Simulation speed"
          value={data.clock.speed}
          onChange={(e) => void send("speed", { speed: Number(e.target.value) }, "simulation")}
        >
          {[1, 5, 10, 60].map((speed) => (
            <option key={speed} value={speed}>
              {speed}× speed
            </option>
          ))}
        </select>
        <Action secondary onClick={() => send("advance", { seconds: 900 }, "simulation")}>
          Advance 15 minutes
        </Action>
        <Action secondary onClick={() => send("advance", { seconds: 3600 }, "simulation")}>
          Advance 1 hour
        </Action>
      </div>
    </div>
  );
}
export function EnergyView({ data, send }: { data: HubSnapshot; send: SendCommand }) {
  const e = data.energy,
    balance = energyBalance(e, 0),
    level = (e.battery_kwh / e.capacity_kwh) * 100;
  return (
    <div className="hub-stack">
      <div className="hub-stats">
        <Stat
          label="Solar generation"
          value={`${balance.generationKw.toFixed(1)} kW`}
          detail={e.outage ? "Array outage · 12% output" : "Generation nominal"}
        />
        <Stat
          label="Demand"
          value={`${balance.demandKw} kW`}
          detail={e.load_shed ? "Critical loads only" : "Critical + industrial"}
        />
        <Stat
          label="Battery reserve"
          value={`${level.toFixed(0)}%`}
          detail={`${e.battery_kwh.toFixed(1)} / ${e.capacity_kwh} kWh`}
        />
        <Stat
          label="Estimated endurance"
          value={balance.reserveMinutes === null ? "Charging" : `${balance.reserveMinutes} min`}
          detail="Constant current load assumption"
        />
      </div>
      <div className="hub-overview-grid">
        <Panel title="Lunar solar microgrid" kicker="Scenario B / Energy cascade">
          <div className="hub-energy-graphic">
            <div>
              ☀<strong>{balance.generationKw.toFixed(1)} kW</strong>
              <small>SOLAR ARRAY</small>
            </div>
            <span>→</span>
            <div className="hub-battery">
              <i style={{ height: `${level}%` }} />
              <strong>{level.toFixed(0)}%</strong>
            </div>
            <span>→</span>
            <div>
              ⌂<strong>{balance.demandKw} kW</strong>
              <small>STATION LOAD</small>
            </div>
          </div>
          <div className="hub-actions">
            {!e.outage && (
              <Action onClick={() => send("solar_outage", {}, "simulation")}>
                Inject solar outage
              </Action>
            )}
            {!e.load_shed && (
              <Action secondary onClick={() => send("shed_load", {}, "simulation")}>
                Shed industrial load
              </Action>
            )}
            {e.outage && (
              <Action
                disabled={!e.load_shed}
                onClick={() => send("repair_solar", {}, "simulation")}
              >
                Repair isolated array
              </Action>
            )}
            {e.load_shed && (
              <Action disabled={e.outage} onClick={() => send("restore_load", {}, "simulation")}>
                Restore industrial load
              </Action>
            )}
          </div>
          <p className="hub-note">
            Advance the clock to observe battery drain. Life support retains priority; manufacturing
            pauses when industrial load is shed. Array repair requires load isolation.
          </p>
        </Panel>
        <Panel title="Downstream projects" kicker="Atlas / Manufacturing">
          {data.projects.map((p) => (
            <div key={p.id}>
              <h3>{p.name}</h3>
              <Badge value={p.status} />
              <p className="hub-muted">
                {p.completed_units.toFixed(1)} / {p.target_units} modules fabricated
              </p>
              <progress max={p.target_units} value={p.completed_units} />
              <p className="hub-note">8 modules per simulated hour while power is available.</p>
            </div>
          ))}
        </Panel>
      </div>
      <Panel title="Energy observations" kicker="Persisted samples">
        {data.energyReadings.length === 0 ? (
          <Empty>Advance virtual time to record the first energy sample.</Empty>
        ) : (
          <div className="hub-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SIM UTC</th>
                  <th>Generation</th>
                  <th>Demand</th>
                  <th>Battery</th>
                </tr>
              </thead>
              <tbody>
                {data.energyReadings
                  .slice(-8)
                  .reverse()
                  .map((r) => (
                    <tr key={r.observed_at}>
                      <td>{simDate(r.observed_at)}</td>
                      <td>{r.generation_kw.toFixed(1)} kW</td>
                      <td>{r.demand_kw.toFixed(1)} kW</td>
                      <td>{r.battery_kwh.toFixed(1)} kWh</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
export function PlatformView({ data, send }: { data: HubSnapshot; send: SendCommand }) {
  const live =
    data.worker &&
    new Date(data.fetchedAt).getTime() - new Date(data.worker.seen_at).getTime() < 15000;
  return (
    <div className="hub-stack">
      <div className="hub-stats">
        <Stat
          label="Pending deliveries"
          value={data.queue.pending}
          detail={`Oldest ${Math.round(data.queue.oldest_seconds)} seconds`}
        />
        <Stat label="Leased" value={data.queue.running} />
        <Stat label="Delivered" value={data.queue.delivered} />
        <Stat label="Dead letters" value={data.queue.dead} />
      </div>
      <Panel title="Durable delivery console" kicker="Platform / Outbox → consumer → receipt">
        <p className="hub-muted">
          Worker {live ? "online" : "offline"}.{" "}
          {live
            ? "Background processing and resumed simulation are active."
            : "Run npm run worker for continuous processing, or process a bounded batch below."}
        </p>
        <div className="hub-actions">
          <Action onClick={() => send("process_events", {}, "platform")}>
            Process pending events
          </Action>
          <Action secondary onClick={() => send("inject_backlog", {}, "platform")}>
            Inject queue backlog
          </Action>
          <Action secondary onClick={() => send("inject_poison", {}, "platform")}>
            Inject consumer failure
          </Action>
        </div>
        <p className="hub-note">
          A delivery receives a 30-second lease. Failures retry with 5/10-second backoff, then enter
          the dead-letter queue after three attempts. Consumer receipts prevent duplicate effects.
        </p>
        <div className="hub-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.deliveries.slice(0, 25).map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.event_type}</strong>
                    <small>
                      {e.id.slice(0, 8)} · {e.last_error ?? "No delivery error"}
                    </small>
                  </td>
                  <td>
                    <Badge value={e.status} />
                  </td>
                  <td>{e.attempts} / 3</td>
                  <td>
                    {e.status === "DEAD" ? (
                      <Action
                        secondary
                        onClick={() => send("redrive_event", { id: e.id }, "platform")}
                      >
                        Resolve and redrive
                      </Action>
                    ) : e.status === "DELIVERED" ? (
                      <Action
                        secondary
                        onClick={() => send("duplicate_event", { id: e.id }, "platform")}
                      >
                        Replay event
                      </Action>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel
        title="Request traces"
        kicker="OpenTelemetry / Authenticated requests in the last hour"
      >
        <div className="hub-stats">
          <Stat label="Recorded requests" value={data.requestMetrics.samples} />
          <Stat label="Server errors" value={data.requestMetrics.server_errors} />
          <Stat
            label="Observed p95"
            value={`${data.requestMetrics.p95_ms.toFixed(0)} ms`}
            detail="Local samples; not a production SLO claim"
          />
        </div>
        <p className="hub-note">
          Real request spans are exported to PostgreSQL with tenant scope, request IDs, duration and
          status. Export is best-effort; the worker retains seven days of samples.
        </p>
        <div className="hub-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Trace / request</th>
                <th>Status</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {data.requestSpans.slice(0, 8).map((s) => (
                <tr key={s.request_id}>
                  <td>
                    <span className="hub-mono">{s.trace_id}</span>
                    <small>{s.request_id}</small>
                  </td>
                  <td>{s.status_code}</td>
                  <td>{s.duration_ms.toFixed(1)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Workflow history" kicker="Version 1 / Authoritative state projections">
        {!data.workflows.length && (
          <Empty>
            Process domain events to materialize procurement, cargo, and maintenance workflows.
          </Empty>
        )}
        {data.workflows.map((w) => (
          <details className="hub-audit" key={w.id}>
            <summary>
              <span>
                {w.kind} · {w.resource_id.slice(0, 8)}
              </span>
              <Badge value={w.status} />
            </summary>
            {w.due_at && <p>Approval reminder due {new Date(w.due_at).toLocaleString()}</p>}
            <pre>{JSON.stringify(w.history, null, 2)}</pre>
          </details>
        ))}
      </Panel>
      <Panel title="Notifications" kicker="In-app / Latest 30">
        {!data.notifications.length && <Empty>No events have been delivered yet.</Empty>}
        {data.notifications.map((n) => (
          <div className="hub-row hub-work" key={n.id}>
            <div>
              <strong>{n.title}</strong>
              <p className="hub-mono">{n.body}</p>
            </div>
            {!n.read_at && (
              <Action secondary onClick={() => send("read_notification", { id: n.id }, "platform")}>
                Mark read
              </Action>
            )}
          </div>
        ))}
      </Panel>
    </div>
  );
}
