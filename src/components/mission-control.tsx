"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Gauge,
  Layers3,
  LogOut,
  Radio,
  RefreshCw,
  RotateCcw,
  Satellite,
  ShieldCheck,
  Sun,
  Terminal,
  Thermometer,
  TriangleAlert,
  Waves,
  X,
} from "lucide-react";
import type {
  AuditEvent,
  Incident,
  Reading,
  ScenarioInput,
  ScenarioKind,
  ScenarioResult,
  Snapshot,
} from "@/domain/contracts";
import { Sparkline, TelemetryChart } from "./charts";
import { StationDiagram } from "./station-diagram";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      data.error?.message ?? "Connection unavailable. Try again.",
      response.status,
    );
  return data as T;
}

function time(value: string | null | undefined) {
  return value ? new Date(value).toISOString().slice(11, 19) : "—";
}
function incidentCode(incident: Incident) {
  return `INC-${String(incident.number).padStart(4, "0")}`;
}
function statusText(status: string) {
  return status === "ACKNOWLEDGED"
    ? "Acknowledged"
    : status === "RESOLVED"
      ? "Resolved"
      : status === "OPEN"
        ? "Open"
        : status;
}

const eventLabels: Record<string, string> = {
  StationCommissioned: "Station telemetry established",
  ScenarioCompleted: "Simulation sequence completed",
  IncidentOpened: "Coolant anomaly detected",
  IncidentAcknowledged: "Incident acknowledged by operator",
  IncidentResolved: "Incident resolved after recovery",
  TelemetryRecorded: "Sensor reading persisted",
};

function EventList({ events, detailed = false }: { events: AuditEvent[]; detailed?: boolean }) {
  if (!events.length)
    return (
      <div className="empty-state small">
        <Radio size={22} />
        <p>No operational events yet.</p>
      </div>
    );
  return (
    <ol className={`event-list ${detailed ? "detailed" : ""}`}>
      {events.map((event) => (
        <li key={event.id}>
          <span className={`event-dot ${event.action === "IncidentOpened" ? "warning" : ""}`} />
          <div className="event-content">
            <span>{eventLabels[event.action] ?? event.action}</span>
            <p>
              {event.action === "ScenarioCompleted"
                ? `${String(event.details.kind)} · ${String(event.details.readingsAdded)} readings · seed ${String(event.details.seed)}`
                : event.action === "TelemetryRecorded"
                  ? `${Number(event.details.pressureBar).toFixed(2)} bar · ${Number(event.details.vibrationMms).toFixed(2)} mm/s${event.details.applied === false ? " · historical only" : ""}`
                  : event.actorId}
            </p>
            {detailed && <code title={event.correlationId}>Correlation {event.correlationId}</code>}
          </div>
          <time title={event.occurredAt}>
            {time(event.occurredAt)}
            <small>UTC</small>
          </time>
        </li>
      ))}
    </ol>
  );
}

function IncidentDrawer({
  incidentId,
  snapshot,
  close,
  refresh,
}: {
  incidentId: string;
  snapshot: Snapshot;
  close: () => void;
  refresh: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [detail, setDetail] = useState<{
    incident: Incident;
    trigger: Reading;
    events: AuditEvent[];
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setDetail(await api(`/api/incidents/${incidentId}`));
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, [incidentId]);
  useEffect(() => {
    const element = dialog.current!;
    const controller = new AbortController();
    element.showModal();
    void api<{ incident: Incident; trigger: Reading; events: AuditEvent[] }>(
      `/api/incidents/${incidentId}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setDetail(data);
          setError("");
        }
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => {
      controller.abort();
      element.close();
    };
  }, [incidentId]);
  async function transition(action: "acknowledge" | "resolve") {
    setBusy(true);
    try {
      await api(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      await load();
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const incident = detail?.incident;
  const incidentStatus = incident?.status;
  useEffect(() => {
    if (incidentStatus) heading.current?.focus({ preventScroll: true });
  }, [incidentStatus]);
  return (
    <dialog
      ref={dialog}
      className="incident-drawer"
      onCancel={close}
      aria-labelledby="incident-heading"
    >
      <div className="drawer-top">
        <span className="eyebrow">INCIDENT COMMAND</span>
        <button className="icon-button" onClick={close} aria-label="Close incident">
          <X size={20} />
        </button>
      </div>
      {error && (
        <div className="alert-error" role="alert">
          {error}
          <button onClick={() => void load()}>Retry</button>
        </div>
      )}
      {!detail ? (
        <div className="loading-content">
          <RefreshCw className="spin" />
          <p>Retrieving incident evidence…</p>
        </div>
      ) : (
        <>
          <div className="incident-id-row">
            <span className="mono">{incidentCode(detail.incident)}</span>
            <span className={`badge ${incident!.status === "RESOLVED" ? "success" : "warning"}`}>
              {statusText(incident!.status)}
            </span>
          </div>
          <h2 id="incident-heading" ref={heading} tabIndex={-1}>
            Coolant system anomaly
          </h2>
          <p className="drawer-description">
            {snapshot.asset.designation} · {snapshot.station.name}
          </p>
          <div className="incident-summary">
            <div>
              <span>Severity</span>
              <strong className="amber">P2 · Major</strong>
            </div>
            <div>
              <span>Detected at</span>
              <strong className="mono">
                {time(incident!.openedAt)} <small>SIM UTC</small>
              </strong>
            </div>
          </div>
          <section className="evidence-box">
            <h3>Triggering observation</h3>
            <div className="trigger-values">
              <div>
                <strong>
                  {detail.trigger.pressureBar.toFixed(2)}
                  <small> bar</small>
                </strong>
                <span>Coolant pressure</span>
              </div>
              <div>
                <strong>
                  {detail.trigger.vibrationMms.toFixed(2)}
                  <small> mm/s</small>
                </strong>
                <span>Pump vibration</span>
              </div>
            </div>
            <p>
              Opens when pressure falls below <b>2.4 bar</b> or vibration exceeds <b>6.5 mm/s</b>.
            </p>
            <details>
              <summary>Inspect correlation and reading IDs</summary>
              <code>{incident!.correlationId}</code>
              <code>{detail.trigger.id}</code>
            </details>
          </section>
          <div className="drawer-actions">
            {incident!.status === "OPEN" && (
              <button
                className="primary-button"
                disabled={busy || snapshot.operator.role !== "operator"}
                onClick={() => void transition("acknowledge")}
              >
                <Check size={16} />
                {busy ? "Saving…" : "Acknowledge incident"}
              </button>
            )}
            {incident!.status === "ACKNOWLEDGED" && (
              <>
                <button
                  className="primary-button"
                  disabled={
                    busy ||
                    snapshot.asset.status !== "NOMINAL" ||
                    snapshot.operator.role !== "operator"
                  }
                  onClick={() => void transition("resolve")}
                >
                  <ShieldCheck size={16} />
                  {busy ? "Saving…" : "Resolve incident"}
                </button>
                {snapshot.asset.status !== "NOMINAL" && (
                  <p>Run “Restore nominal” before resolving.</p>
                )}
              </>
            )}
            {incident!.status === "RESOLVED" && (
              <div className="resolved-message">
                <ShieldCheck size={18} />
                Resolved at {time(incident!.resolvedAt)} SIM UTC
              </div>
            )}
          </div>
          <div className="section-heading">
            <h3>Incident timeline</h3>
            <span className="mono">LATEST {detail.events.length}</span>
          </div>
          <EventList events={detail.events} detailed />
        </>
      )}
    </dialog>
  );
}

export function MissionControl() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [needsSession, setNeedsSession] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "telemetry" | "incidents" | "events">("overview");
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<ScenarioInput | null>(null);
  const [seed, setSeed] = useState("17");
  const [help, setHelp] = useState(false);
  const requestVersion = useRef(0);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const version = ++requestVersion.current;
    try {
      const data = await api<Snapshot>("/api/mission", { signal });
      if (signal?.aborted || version !== requestVersion.current) return;
      setSnapshot(data);
      setNeedsSession(false);
      setError("");
    } catch (err) {
      if (signal?.aborted || version !== requestVersion.current) return;
      if (err instanceof ApiError && err.status === 401) {
        setNeedsSession(true);
        setSnapshot(null);
      } else setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const version = ++requestVersion.current;
    void api<Snapshot>("/api/mission", { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted || version !== requestVersion.current) return;
        setSnapshot(data);
        setNeedsSession(false);
        setError("");
      })
      .catch((err: Error) => {
        if (controller.signal.aborted || version !== requestVersion.current) return;
        if (err instanceof ApiError && err.status === 401) {
          setNeedsSession(true);
          setSnapshot(null);
        } else setError(err.message);
      });
    const timer = setInterval(() => {
      if (!document.hidden) void refresh(controller.signal);
    }, 4000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [refresh]);

  async function login(persona: string) {
    setBusy(persona);
    setError("");
    try {
      await api("/api/session", { method: "POST", body: JSON.stringify({ persona }) });
      setLastRun(null);
      setNotice("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    setBusy("logout");
    try {
      await api("/api/session", { method: "DELETE" });
      requestVersion.current++;
      setSnapshot(null);
      setNeedsSession(true);
      setLastRun(null);
      setSelectedIncident(null);
      setNotice("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function executeScenario(kind: ScenarioKind, replay = false) {
    if (!snapshot) return;
    const seedNumber = Number(seed);
    if (
      !Number.isInteger(seedNumber) ||
      seedNumber < 0 ||
      seedNumber > 4294967295 ||
      seed.trim() === ""
    ) {
      setError("Choose an integer seed between 0 and 4294967295.");
      return;
    }
    const input: ScenarioInput =
      replay && lastRun
        ? lastRun
        : { runId: crypto.randomUUID(), assetId: snapshot.asset.id, kind, seed: seedNumber };
    setLastRun(input);
    setBusy(replay ? "replay" : kind);
    setError("");
    setNotice("");
    try {
      const result = await api<ScenarioResult>("/api/scenarios", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setNotice(
        result.replayed
          ? "Delivery replayed. No additional readings or incident effects were created."
          : `${result.readingsAdded} readings recorded. Simulation advanced 60 seconds.${result.incidentId ? " Incident evidence updated." : " All readings nominal."}`,
      );
      await refresh();
    } catch (err) {
      setError(`${(err as Error).message} You can retry the same delivery safely.`);
    } finally {
      setBusy(null);
    }
  }

  const latest = snapshot?.readings.filter((reading) => reading.applied).at(-1);
  const degraded = snapshot?.asset.status === "DEGRADED";
  const readOnly = snapshot?.operator.role === "viewer";
  const active = snapshot?.incidents.find((incident) => incident.status !== "RESOLVED");

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Helios home">
          <span className="brand-symbol">
            <Sun size={25} strokeWidth={1.4} />
          </span>
          <div>
            HELIOS<small>INTERPLANETARY</small>
          </div>
        </Link>
        <div className="product-label">ODYSSEY PLATFORM</div>
        <nav aria-label="Main navigation">
          <button
            className={view === "overview" || view === "telemetry" ? "nav-item active" : "nav-item"}
            onClick={() => setView("overview")}
          >
            <Layers3 size={17} />
            Mission Control
            <span className="nav-dot" />
          </button>
          <button
            className={view === "incidents" ? "nav-item active" : "nav-item"}
            onClick={() => setView("incidents")}
          >
            <TriangleAlert size={17} />
            Incident registry
            {snapshot && <span className="nav-count">{snapshot.stats.activeIncidents}</span>}
          </button>
          <button
            className={view === "events" ? "nav-item active" : "nav-item"}
            onClick={() => setView("events")}
          >
            <Terminal size={17} />
            Event log
          </button>
        </nav>
        <div className="sidebar-station">
          <span className="product-label">ACTIVE STATION</span>
          <div>
            <Satellite size={17} />
            <span>
              {snapshot?.station.name ?? "Kepler Station"}
              <small>{snapshot?.station.callsign ?? "KPL-01"} · LUNAR OPERATIONS</small>
            </span>
            <i className={`status-dot ${degraded ? "warning" : ""}`} />
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="environment">
            <span className="outline-dot" />
            LOCAL SIMULATION<span>01</span>
          </div>
          <button className="nav-item" onClick={() => setHelp(!help)} aria-expanded={help}>
            <CircleHelp size={17} />
            Operator guide
          </button>
          {snapshot && (
            <div className="profile">
              <span className="avatar">
                {snapshot.operator.name
                  .split(" ")
                  .map((name) => name[0])
                  .join("")}
              </span>
              <div>
                {snapshot.operator.name}
                <small>{readOnly ? "Read-only auditor" : "Flight controller"}</small>
              </div>
              <button
                className="icon-button"
                aria-label="Sign out"
                disabled={!!busy}
                onClick={() => void logout()}
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main id="main" className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Odyssey <ChevronRight size={13} />
            <span>Station operations</span>
          </div>
          <div className="topbar-right">
            <span className="simulation-tag">SIMULATION</span>
            <span className="mono sim-clock">
              <Clock3 size={13} />
              {time(snapshot?.asset.lastObservedAt)} <small>UTC</small>
            </span>
          </div>
        </header>
        <div className="content-wrap">
          {help && (
            <section className="guide-panel">
              <div>
                <h2>Your first mission</h2>
                <p>
                  Inject pump degradation, inspect the incident, acknowledge it, restore nominal
                  telemetry, then resolve. “Replay delivery” retries the same sequence to
                  demonstrate duplicate handling.
                </p>
                <p>
                  Each sequence advances virtual time by 60 seconds. Values remain steady between
                  sequences. This is a fictional operational simulation.
                </p>
              </div>
              <button
                className="icon-button"
                aria-label="Close guide"
                onClick={() => setHelp(false)}
              >
                <X size={18} />
              </button>
            </section>
          )}
          {error && (
            <div className="alert-error" role="alert">
              <TriangleAlert size={17} />
              <span>{error}</span>
              <button onClick={() => void refresh()}>Retry connection</button>
            </div>
          )}

          {needsSession ? (
            <section className="access-screen">
              <div className="access-art">
                <Sun size={58} strokeWidth={0.7} />
                <span>HELIOS / ODYSSEY</span>
                <div className="orbit-ring" />
                <div className="orbit-ring second" />
              </div>
              <div className="access-copy">
                <div className="eyebrow">OPERATIONS BEGIN HERE</div>
                <h1>
                  A clear view.
                  <br />A steady hand.
                </h1>
                <p>
                  Monitor Kepler Station’s coolant systems, investigate anomalies, and bring
                  operations back to nominal.
                </p>
                <button
                  className="primary-button"
                  disabled={!!busy}
                  onClick={() => void login("controller")}
                >
                  {busy === "controller" ? "Connecting…" : "Enter Mission Control"}
                  <ArrowRight size={17} />
                </button>
                <span className="demo-note">Local demo · Avery Vale · Helios Interplanetary</span>
                <div className="persona-alternatives">
                  <button disabled={!!busy} onClick={() => void login("observer")}>
                    Enter Selene Research
                  </button>
                  <button disabled={!!busy} onClick={() => void login("auditor")}>
                    Enter as read-only auditor
                  </button>
                </div>
              </div>
            </section>
          ) : !snapshot ? (
            <div className="loading-content">
              <Satellite size={32} className="slow-pulse" />
              <h1>Establishing station link</h1>
              <p>Retrieving persisted telemetry and operational state.</p>
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {snapshot.station.callsign} <span>/</span> {snapshot.station.location}
                  </div>
                  <h1>
                    {view === "incidents"
                      ? "Incident registry"
                      : view === "events"
                        ? "Operational event log"
                        : "Mission Control"}
                  </h1>
                  <p>
                    {view === "events"
                      ? "An attributable record of every operational transition."
                      : view === "incidents"
                        ? "Investigate, acknowledge, and resolve station anomalies."
                        : "Every signal. One operational picture."}
                  </p>
                </div>
                <div className={`mission-status ${degraded ? "warning" : ""}`}>
                  <span className="status-dot" />
                  {degraded ? "Attention required" : "Systems nominal"}
                  <small>{error ? "CONNECTION INTERRUPTED" : "STATION LINK ESTABLISHED"}</small>
                </div>
              </div>
              <div className="view-tabs" role="group" aria-label="Mission views">
                {(["overview", "telemetry", "incidents"] as const).map((tab) => (
                  <button
                    key={tab}
                    className={view === tab ? "selected" : ""}
                    onClick={() => setView(tab)}
                  >
                    {tab === "overview"
                      ? "Overview"
                      : tab === "telemetry"
                        ? "Telemetry"
                        : "Incidents"}
                    {tab === "incidents" && <span>{snapshot.stats.activeIncidents}</span>}
                  </button>
                ))}
                <div className="tab-meta">
                  <span className={`status-dot ${error ? "warning" : ""}`} />
                  {error ? "Snapshot may be stale" : "Polling every 4s"}
                </div>
              </div>

              {(view === "overview" || view === "telemetry") && (
                <>
                  <div className="metrics-grid">
                    <Metric
                      title="COOLANT PRESSURE"
                      value={latest?.pressureBar.toFixed(2) ?? "—"}
                      unit="bar"
                      icon={<Gauge size={16} />}
                      values={snapshot.readings.map((r) => r.pressureBar)}
                      warning={(latest?.pressureBar ?? 3.2) < 2.4}
                      description="Lower limit 2.40 bar"
                    />
                    <Metric
                      title="PUMP VIBRATION"
                      value={latest?.vibrationMms.toFixed(2) ?? "—"}
                      unit="mm/s"
                      icon={<Waves size={16} />}
                      values={snapshot.readings.map((r) => r.vibrationMms)}
                      warning={(latest?.vibrationMms ?? 2.1) > 6.5}
                      description="Upper limit 6.50 mm/s"
                    />
                    <Metric
                      title="LOOP TEMPERATURE"
                      value={latest?.temperatureC.toFixed(1) ?? "—"}
                      unit="°C"
                      icon={<Thermometer size={16} />}
                      values={snapshot.readings.map((r) => r.temperatureC)}
                      description="Context sensor · no alert rule"
                    />
                    <div className="metric-card">
                      <div className="metric-label">
                        ACTIVE INCIDENTS
                        <TriangleAlert size={16} />
                      </div>
                      <div className="metric-value">
                        <strong className={snapshot.stats.activeIncidents ? "amber" : ""}>
                          {String(snapshot.stats.activeIncidents).padStart(2, "0")}
                        </strong>
                        <button
                          className="metric-link"
                          onClick={() => setView("incidents")}
                          aria-label="View incidents"
                        >
                          <ArrowUpRight size={19} />
                        </button>
                      </div>
                      <div className="metric-description">
                        {snapshot.stats.activeIncidents
                          ? "Operator attention required"
                          : "No outstanding anomalies"}
                      </div>
                    </div>
                  </div>
                  {active && (
                    <button
                      className="incident-banner"
                      onClick={() => setSelectedIncident(active.id)}
                    >
                      <TriangleAlert size={18} />
                      <span>
                        <strong>{incidentCode(active)} · Coolant anomaly</strong>
                        <small>
                          {snapshot.asset.designation} requires review · {statusText(active.status)}
                        </small>
                      </span>
                      <span className="banner-action">
                        Inspect incident
                        <ArrowRight size={15} />
                      </span>
                    </button>
                  )}
                  <div
                    className={`operations-grid ${view === "telemetry" ? "telemetry-view" : ""}`}
                  >
                    <section className="panel telemetry-panel">
                      <div className="panel-header">
                        <div>
                          <Activity size={17} />
                          <h2>Coolant loop telemetry</h2>
                        </div>
                        <span className="subtle-tag">{snapshot.readings.length} OBSERVATIONS</span>
                      </div>
                      <TelemetryChart
                        readings={snapshot.readings}
                        metric="pressureBar"
                        threshold={2.4}
                        range={[0, 4.2]}
                        label="Pressure"
                        unit="bar"
                        color="var(--mint)"
                      />
                      <TelemetryChart
                        readings={snapshot.readings}
                        metric="vibrationMms"
                        threshold={6.5}
                        range={[0, 10.5]}
                        label="Vibration"
                        unit="mm/s"
                        color="var(--blue)"
                      />
                      <div className="panel-footer">
                        <span>
                          <span className="legend-line" />
                          Recorded observation
                        </span>
                        <span>
                          <span className="legend-line dashed" />
                          Alert threshold
                        </span>
                        <span className="mono">SIM UTC</span>
                      </div>
                    </section>
                    <div className="right-column">
                      <section className="panel station-panel">
                        <div className="panel-header">
                          <div>
                            <Satellite size={17} />
                            <h2>{snapshot.station.name}</h2>
                          </div>
                          <span className="mono muted">{snapshot.station.callsign}</span>
                        </div>
                        <StationDiagram
                          degraded={!!degraded}
                          designation={snapshot.asset.designation}
                          stationName={snapshot.station.name}
                        />
                        <div className="asset-status">
                          <div>
                            <span className="asset-icon">
                              <Waves size={17} />
                            </span>
                            <div>
                              {snapshot.asset.designation}
                              <small>Primary coolant loop · Module B</small>
                            </div>
                          </div>
                          <span className={`badge ${degraded ? "warning" : "success"}`}>
                            {degraded ? "Degraded" : "Nominal"}
                          </span>
                        </div>
                      </section>
                      <section className="panel scenario-panel">
                        <div className="panel-header">
                          <div>
                            <Terminal size={17} />
                            <h2>Scenario control</h2>
                          </div>
                          <span className="scenario-number">01</span>
                        </div>
                        <div className="scenario-body">
                          <div className="eyebrow">COOLANT PUMP DEGRADATION</div>
                          <p>
                            Introduce a pressure drop and rising vibration. Watch the incident
                            response take shape.
                          </p>
                          <div className="seed-row">
                            <label htmlFor="scenario-seed">Sequence seed</label>
                            <input
                              id="scenario-seed"
                              type="number"
                              min="0"
                              max="4294967295"
                              value={seed}
                              onChange={(event) => setSeed(event.target.value)}
                              disabled={!!busy || readOnly}
                            />
                            <span>12 ticks · +60s</span>
                          </div>
                          <button
                            className="primary-button scenario-trigger"
                            disabled={!!busy || readOnly}
                            onClick={() => void executeScenario("degradation")}
                          >
                            <TriangleAlert size={15} />
                            {busy === "degradation" ? "Recording sequence…" : "Inject degradation"}
                            <ArrowRight size={16} />
                          </button>
                          <div className="scenario-secondary">
                            <button
                              disabled={!!busy || readOnly}
                              onClick={() => void executeScenario("recovery")}
                            >
                              <RefreshCw size={14} />
                              Restore nominal
                            </button>
                            <button
                              disabled={!!busy || readOnly || !lastRun}
                              onClick={() => lastRun && void executeScenario(lastRun.kind, true)}
                            >
                              <RotateCcw size={14} />
                              {busy === "replay" ? "Replaying…" : "Replay delivery"}
                            </button>
                          </div>
                          {readOnly && (
                            <p className="read-only-note">
                              Auditor access · scenario controls are read-only.
                            </p>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                  {notice && (
                    <div className="notice" role="status">
                      <Check size={16} />
                      {notice}
                    </div>
                  )}
                  <div className="lower-grid">
                    <section className="panel">
                      <div className="panel-header">
                        <div>
                          <Radio size={17} />
                          <h2>Activity feed</h2>
                        </div>
                        <button className="text-button" onClick={() => setView("events")}>
                          View event log
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                      <EventList events={snapshot.events.slice(0, 4)} />
                    </section>
                    <section className="panel mission-brief">
                      <div className="panel-header">
                        <div>
                          <ShieldCheck size={17} />
                          <h2>Response protocol</h2>
                        </div>
                      </div>
                      <ol>
                        {[
                          "Detect threshold breach",
                          "Inspect & acknowledge",
                          "Restore nominal telemetry",
                          "Resolve the incident",
                        ].map((step, index) => (
                          <li key={step}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            {step}
                            <ChevronRight size={13} />
                          </li>
                        ))}
                      </ol>
                      <p>Recovery restores the signal. An operator closes the incident.</p>
                    </section>
                  </div>
                </>
              )}

              {view === "incidents" && (
                <section className="panel registry">
                  <div className="panel-header">
                    <div>
                      <TriangleAlert size={17} />
                      <h2>Station incidents</h2>
                    </div>
                    <span className="mono muted">LATEST {snapshot.incidents.length}</span>
                  </div>
                  {snapshot.incidents.length ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Incident</th>
                            <th>Asset</th>
                            <th>Severity</th>
                            <th>Status</th>
                            <th>Detected · SIM UTC</th>
                            <th>
                              <span className="sr-only">Action</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshot.incidents.map((incident) => (
                            <tr key={incident.id}>
                              <td>
                                <button onClick={() => setSelectedIncident(incident.id)}>
                                  <strong className="mono">{incidentCode(incident)}</strong>
                                  <span>Coolant system anomaly</span>
                                </button>
                              </td>
                              <td>{snapshot.asset.designation}</td>
                              <td>
                                <span className="severity-dot" />
                                {incident.severity}
                              </td>
                              <td>
                                <span
                                  className={`badge ${incident.status === "RESOLVED" ? "success" : "warning"}`}
                                >
                                  {statusText(incident.status)}
                                </span>
                              </td>
                              <td className="mono">{time(incident.openedAt)}</td>
                              <td>
                                <button
                                  className="icon-button"
                                  onClick={() => setSelectedIncident(incident.id)}
                                  aria-label={`Inspect ${incidentCode(incident)}`}
                                >
                                  <ArrowUpRight size={17} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <ShieldCheck size={36} />
                      <h3>Clear skies. No incidents.</h3>
                      <p>
                        Run a degradation scenario to observe the detection and response workflow.
                      </p>
                      <button className="secondary-button" onClick={() => setView("overview")}>
                        Open scenario control
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </section>
              )}
              {view === "events" && (
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <Terminal size={17} />
                      <h2>Operational transitions</h2>
                    </div>
                    <span className="subtle-tag">RECORDED WALL CLOCK · UTC</span>
                  </div>
                  <EventList events={snapshot.events} detailed />
                </section>
              )}
              <footer className="workspace-footer">
                <span>
                  <Database size={12} />
                  {snapshot.stats.totalReadings} persisted readings
                  <span className="footer-divider">/</span>
                  {snapshot.stats.scenarioRuns} scenario runs
                </span>
                <span>
                  HELIOS OS <b>0.1</b>
                  <span className="footer-divider">/</span>
                  {snapshot.asset.lastObservedAt
                    ? new Intl.DateTimeFormat("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })
                        .format(new Date(snapshot.asset.lastObservedAt))
                        .toUpperCase()
                    : "—"}{" "}
                  · SIMULATION
                </span>
              </footer>
            </>
          )}
        </div>
      </main>
      {selectedIncident && snapshot && (
        <IncidentDrawer
          key={selectedIncident}
          incidentId={selectedIncident}
          snapshot={snapshot}
          close={() => setSelectedIncident(null)}
          refresh={refresh}
        />
      )}
    </div>
  );
}

function Metric({
  title,
  value,
  unit,
  icon,
  values,
  warning = false,
  description,
}: {
  title: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  values: number[];
  warning?: boolean;
  description: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-label">
        {title}
        {icon}
      </div>
      <div className="metric-value">
        <strong className={warning ? "amber" : ""}>
          {value}
          <small>{unit}</small>
        </strong>
        <Sparkline values={values.slice(-24)} color={warning ? "var(--amber)" : "var(--mint)"} />
      </div>
      <div className="metric-description">
        {warning ? <TriangleAlert size={12} className="amber" /> : <span className="tiny-dot" />}
        {description}
      </div>
    </div>
  );
}
