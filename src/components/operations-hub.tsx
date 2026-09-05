"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Box,
  CheckCircle2,
  Compass,
  Layers3,
  RefreshCw,
  Satellite,
  Ship,
  Terminal,
  Users,
  Sun,
  Cpu,
  BrainCircuit,
  BookOpen,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import type { HubSnapshot } from "../domain/hub";
import { Action, Badge, Empty, Panel, Stat, label, simDate, type SendCommand } from "./hub-shared";
import { RepairDesk } from "./repair-desk";
import { LogisticsView, SupplyView, WorkforceView } from "./supply-views";
import { ClockBar, EnergyView, PlatformView } from "./platform-views";
import { IntelligenceView, KnowledgeView } from "./intelligence-views";
import { FinanceView, CasesView } from "./enterprise-views";
import "./operations-hub.css";

type View =
  | "overview"
  | "repair"
  | "supply"
  | "logistics"
  | "workforce"
  | "events"
  | "energy"
  | "platform"
  | "intelligence"
  | "knowledge"
  | "finance"
  | "cases";
const views = [
  { id: "overview", label: "Command center", icon: Compass },
  { id: "repair", label: "Repair desk", icon: Activity },
  { id: "supply", label: "Supply & approvals", icon: Box },
  { id: "logistics", label: "Logistics", icon: Ship },
  { id: "workforce", label: "Workforce", icon: Users },
  { id: "energy", label: "Energy & projects", icon: Sun },
  { id: "intelligence", label: "AI Operations", icon: BrainCircuit },
  { id: "knowledge", label: "Knowledge library", icon: BookOpen },
  { id: "finance", label: "Billing & ledger", icon: Wallet },
  { id: "cases", label: "Security & support", icon: ShieldCheck },
  { id: "platform", label: "Platform console", icon: Cpu },
  { id: "events", label: "Audit trail", icon: Terminal },
] as const;

export function OperationsHub() {
  const [data, setData] = useState<HubSnapshot | null>(null),
    [view, setView] = useState<View>("overview");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [unauthenticated, setUnauthenticated] = useState(false);
  const mounted = useRef(true),
    fetching = useRef(false),
    mutation = useRef(false);
  const refresh = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const response = await fetch("/api/operations", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) setUnauthenticated(true);
        throw new Error(result.error?.message ?? "Operations connection unavailable.");
      }
      if (mounted.current) {
        setData(result);
        setError("");
        setUnauthenticated(false);
      }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      fetching.current = false;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => {
      if (!mutation.current) void refresh();
    }, 5000);
    return () => {
      mounted.current = false;
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [refresh]);
  const send: SendCommand = async (action, fields = {}, endpoint = "operations") => {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let url = "/api/operations/commands",
        method = "POST",
        body: Record<string, unknown> = { action, commandId: crypto.randomUUID(), ...fields };
      if (endpoint === "incident") {
        url = `/api/incidents/${fields.id}`;
        method = "PATCH";
        body = { action };
      } else if (endpoint === "scenario") {
        url = "/api/scenarios";
        body = { runId: crypto.randomUUID(), assetId: fields.assetId, kind: action, seed: 17 };
      } else if (endpoint !== "operations") url = `/api/${endpoint}`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Command failed.");
      setNotice(
        result.message ??
          `${label(action)} completed${result.status ? ` · ${label(result.status)}` : ""}.`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Command failed.");
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  };
  const selected = views.find((v) => v.id === view)!;
  return (
    <div className="hub-shell">
      <aside className="hub-sidebar">
        <Link href="/operations" className="hub-brand">
          <span className="hub-brand-mark">
            <Satellite size={21} />
          </span>
          <span>
            HELIOS<small>INTERPLANETARY</small>
          </span>
        </Link>
        <span className="hub-nav-label">OPERATIONS NETWORK</span>
        <nav aria-label="Operations navigation">
          {views.map((v) => (
            <button
              key={v.id}
              className={view === v.id ? "active" : ""}
              onClick={() => setView(v.id)}
            >
              <v.icon size={17} />
              {v.label}
            </button>
          ))}
          <Link href="/">
            <Layers3 size={17} />
            Mission Control
            <ArrowUpRight size={13} />
          </Link>
        </nav>
        <div className="hub-sidebar-bottom">
          <span className="hub-live-dot" />
          LOCAL SIMULATION<small>Persistent world · human command</small>
          {data && (
            <p>
              {data.operator.name}
              <br />
              {data.operator.organizationName}
            </p>
          )}
        </div>
      </aside>
      <main className="hub-main">
        <header className="hub-topbar">
          <div className="hub-breadcrumb">
            HELIOS / <span>{selected.label.toUpperCase()}</span>
          </div>
          <div className="hub-topbar-actions">
            <span className={error ? "hub-warning" : "hub-positive"}>
              {error ? "Connection needs attention" : "PostgreSQL connected"}
            </span>
            <button aria-label="Refresh operations" onClick={() => void refresh()}>
              <RefreshCw size={16} />
            </button>
          </div>
        </header>
        <div className="hub-content">
          <div className="hub-heading">
            <div>
              <span className="hub-kicker">
                {view === "overview" ? "Earth to orbit. One operating picture." : "Atlas × Odyssey"}
              </span>
              <h1>{selected.label}</h1>
              <p>
                {view === "overview"
                  ? "Follow a problem across telemetry, people, parts and recovery."
                  : "Every action updates the persistent simulation and its audit record."}
              </p>
            </div>
            <span className="hub-version">HELIOS / 2042</span>
          </div>
          {error && (
            <div role="alert" className="hub-alert">
              {error}{" "}
              {!unauthenticated && <button onClick={() => void refresh()}>Retry connection</button>}
            </div>
          )}
          {notice && (
            <div role="status" className="hub-toast">
              <CheckCircle2 size={15} />
              {notice}
            </div>
          )}
          {unauthenticated ? (
            <Panel title="Enter the operations network">
              <Empty>
                Choose a local persona in Mission Control to open this workspace.
                <p>
                  <Link href="/" className="hub-button">
                    Open Mission Control
                  </Link>
                </p>
              </Empty>
            </Panel>
          ) : !data ? (
            <div className="hub-loading">Connecting to the operations network…</div>
          ) : (
            <fieldset
              disabled={busy || data.operator.role === "viewer"}
              className="hub-command-scope"
              aria-label="Operations commands"
            >
              {data.operator.role === "viewer" && (
                <p className="hub-note">
                  Auditor access · inspect records; mutations are disabled.
                </p>
              )}
              <ClockBar data={data} send={send} />
              {view === "energy" && <EnergyView data={data} send={send} />}
              {view === "platform" && <PlatformView data={data} send={send} />}
              {view === "intelligence" && <IntelligenceView data={data} send={send} />}
              {view === "knowledge" && <KnowledgeView data={data} send={send} />}
              {view === "finance" && <FinanceView data={data} send={send} />}
              {view === "cases" && <CasesView data={data} send={send} />}
              {view === "overview" && (
                <>
                  <div className="hub-stats">
                    <Stat
                      label="Open incidents"
                      value={data.incidents.filter((i) => i.status !== "RESOLVED").length}
                      detail="Across this organization"
                    />
                    <Stat
                      label="Active repairs"
                      value={
                        data.workOrders.filter(
                          (w) => !["COMPLETED", "CANCELLED"].includes(w.status),
                        ).length
                      }
                    />
                    <Stat
                      label="Cargo in flight"
                      value={data.shipments.filter((s) => s.status !== "DELIVERED").length}
                    />
                    <Stat
                      label="Personnel"
                      value={data.workforce.count}
                      detail="Station workforce"
                    />
                  </div>
                  <div className="hub-overview-grid">
                    <Panel
                      title="The coolant recovery mission"
                      kicker="Scenario A / Cross-domain operations"
                    >
                      <div className="hub-mission-map">
                        <span className="hub-orbit one" />
                        <span className="hub-orbit two" />
                        <div className="hub-earth">
                          <span>EARTH</span>
                        </div>
                        <div className="hub-station">
                          <Satellite size={36} />
                          <span>KEPLER NETWORK</span>
                        </div>
                        <div className="hub-map-tag">PARTS · PEOPLE · TELEMETRY</div>
                      </div>
                      <div className="hub-flow">
                        {["Detect", "Diagnose", "Plan", "Supply", "Repair", "Verify"].map(
                          (s, i) => (
                            <span key={s}>
                              <b>{String(i + 1).padStart(2, "0")}</b>
                              {s}
                            </span>
                          ),
                        )}
                      </div>
                      <p className="hub-muted">
                        A coolant breach opens an incident. Route a replacement through approval and
                        cargo, assign a technician, then prove recovery with new observations.
                      </p>
                      <div className="hub-actions">
                        <Action
                          onClick={() =>
                            send("degradation", { assetId: data.assets[0]?.id }, "scenario")
                          }
                        >
                          Inject coolant degradation
                        </Action>
                        <button className="hub-button secondary" onClick={() => setView("repair")}>
                          Open repair desk →
                        </button>
                      </div>
                    </Panel>
                    <Panel title="Station operations" kicker="Current state">
                      {data.assets.map((a) => (
                        <div className="hub-asset" key={a.id}>
                          <Satellite size={21} />
                          <div>
                            <h3>{a.designation}</h3>
                            <small>{simDate(a.last_observed_at)} SIM UTC</small>
                          </div>
                          <Badge value={a.status} />
                        </div>
                      ))}
                      <div className="hub-feature-note">
                        <h3>A connected operational record</h3>
                        <p>
                          Follow purchase approvals, cargo delays, certification checks and recovery
                          evidence from one workspace.
                        </p>
                        <Link href="/">
                          Inspect telemetry <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </Panel>
                  </div>
                  <Panel title="Latest decisions" kicker="Attributable activity">
                    {data.events.slice(0, 6).map((e) => (
                      <div className="hub-event" key={e.id}>
                        <span className="hub-event-dot" />
                        <div>
                          <strong>{e.action.replace(/([a-z])([A-Z])/g, "$1 $2")}</strong>
                          <small>{e.actor_id}</small>
                        </div>
                        <time>
                          {new Date(e.occurred_at).toLocaleTimeString("en-US", {
                            hour12: false,
                            timeZone: "UTC",
                          })}{" "}
                          UTC
                        </time>
                      </div>
                    ))}
                  </Panel>
                </>
              )}
              {view === "repair" && <RepairDesk data={data} send={send} />}
              {view === "supply" && <SupplyView data={data} send={send} />}
              {view === "logistics" && <LogisticsView data={data} send={send} />}
              {view === "workforce" && <WorkforceView data={data} />}
              {view === "events" && (
                <Panel title="Audit evidence" kicker="Latest 60 decisions">
                  {data.events.map((e) => (
                    <details className="hub-audit" key={e.id}>
                      <summary>
                        <span>{e.action}</span>
                        <small>{new Date(e.occurred_at).toISOString()}</small>
                      </summary>
                      <p>
                        Actor {e.actor_id} · Resource {e.resource_id}
                      </p>
                      <p className="hub-mono">Correlation {e.correlation_id}</p>
                      <pre>{JSON.stringify(e.details, null, 2)}</pre>
                    </details>
                  ))}
                </Panel>
              )}
            </fieldset>
          )}
          <footer className="hub-footer">
            <span>HELIOS INTERPLANETARY · ATLAS × ODYSSEY</span>
            <span>
              {busy
                ? "Command in progress…"
                : data
                  ? `Snapshot ${new Date(data.fetchedAt).toLocaleTimeString("en-US", { hour12: false })}`
                  : "Connecting"}
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
