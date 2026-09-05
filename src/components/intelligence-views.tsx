import { useState } from "react";
import type { HubSnapshot } from "../domain/hub";
import type { SourceChunk } from "../domain/knowledge";
import { Action, Badge, Empty, Panel, Stat, label, type SendCommand } from "./hub-shared";

export function IntelligenceView({ data, send }: { data: HubSnapshot; send: SendCommand }) {
  const [agent, setAgent] = useState("diagnostic"),
    [incident, setIncident] = useState(""),
    [selected, setSelected] = useState("");
  const chosen = incident || data.incidents[0]?.id,
    run = data.agentRuns.find((r) => r.id === selected) ?? data.agentRuns[0];
  const runAgent = (exercise = "normal") =>
    send(
      "run_agent",
      { agent, ...(chosen ? { incidentId: chosen } : {}), exercise },
      "intelligence",
    );
  return (
    <div className="hub-stack">
      <div className="hub-stats">
        <Stat
          label="Provider"
          value={data.modelProvider.provider}
          detail={data.modelProvider.model || "Model not configured"}
        />
        <Stat label="Recent runs" value={data.agentRuns.length} detail="Latest 20" />
        <Stat
          label="Awaiting human decision"
          value={data.agentApprovals.filter((a) => a.status === "PENDING").length}
        />
        <Stat label="Step limit" value="8" detail="Read tools → model → policy" />
      </div>
      <Panel title="Operations adviser" kicker="Helios Intelligence / Bounded execution">
        <div className="hub-form-grid">
          <label className="hub-field">
            Agent
            <select value={agent} onChange={(e) => setAgent(e.target.value)}>
              {["diagnostic", "summary", "procurement", "support"].map((a) => (
                <option key={a} value={a}>
                  {label(a)} agent
                </option>
              ))}
            </select>
          </label>
          <label className="hub-field">
            Incident context
            <select value={chosen ?? ""} onChange={(e) => setIncident(e.target.value)}>
              {data.incidents.length === 0 && (
                <option value="">No incident · read-only context</option>
              )}
              {data.incidents.map((i) => (
                <option key={i.id} value={i.id}>
                  INC-{i.number} · {i.status.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="hub-actions">
          <Action onClick={() => runAgent()}>Run adviser</Action>
          <Action secondary onClick={() => runAgent("unsafe")}>
            Inject unsafe AI proposal
          </Action>
          <Action secondary onClick={() => runAgent("provider_failure")}>
            Simulate provider failure
          </Action>
          <Action secondary onClick={() => send("run_evaluations", {}, "intelligence")}>
            Run evaluations
          </Action>
        </div>
        <p className="hub-note">
          Fixture mode executes deterministic recommendations with real database tools. Live OpenAI
          calls require explicit provider configuration. Both paths validate structured output and
          source IDs; domain writes wait for human approval.
        </p>
      </Panel>
      <div className="hub-overview-grid">
        <Panel title="Execution trace" kicker="Tool evidence and policy decisions">
          {!run ? (
            <Empty>Run the adviser to inspect its tools, evidence and recommendation.</Empty>
          ) : (
            <>
              <div className="hub-row">
                <h3>
                  {label(run.agent)} · {run.id.slice(0, 8)}
                </h3>
                <Badge value={run.status} />
              </div>
              <p className="hub-mono">
                {run.provider} / {run.model} / {run.prompt_version}
              </p>
              <p className="hub-muted">
                {run.duration_ms ?? "—"} ms ·{" "}
                {run.input_tokens === null
                  ? "Token usage unavailable for fixtures"
                  : `${run.input_tokens} input / ${run.output_tokens} output tokens`}
              </p>
              {data.agentSteps
                .filter((s) => s.run_id === run.id)
                .map((s) => (
                  <details className="hub-audit" key={s.ordinal}>
                    <summary>
                      <span>
                        {String(s.ordinal).padStart(2, "0")} · {s.name}
                      </span>
                      <Badge value={s.status} />
                    </summary>
                    <p className="hub-note">
                      {s.kind} · {s.duration_ms} ms
                    </p>
                    <pre>{JSON.stringify({ arguments: s.input, result: s.output }, null, 2)}</pre>
                  </details>
                ))}
              {run.error && <p className="hub-callout">{run.error}</p>}
              {run.output && (
                <div className="hub-recommendation">
                  <span className="hub-kicker">
                    Recommendation / {Math.round(run.output.confidence * 100)}% stated confidence
                  </span>
                  <h3>{label(run.output.recommendation)}</h3>
                  <p>{run.output.summary}</p>
                  <p className="hub-note">{run.output.limitation}</p>
                  <p className="hub-mono">Retrieved chunk IDs: {run.output.citations.join(", ")}</p>
                </div>
              )}
              {data.agentApprovals
                .filter((a) => a.run_id === run.id)
                .map((a) => (
                  <div className="hub-approval" key={a.id}>
                    <div className="hub-row">
                      <h3>Human decision required</h3>
                      <Badge value={a.status} />
                    </div>
                    <pre>{JSON.stringify(a.action, null, 2)}</pre>
                    {a.status === "PENDING" && (
                      <div className="hub-actions">
                        <Action
                          onClick={() => send("approve_agent_action", { id: a.id }, "intelligence")}
                        >
                          Approve proposed action
                        </Action>
                        <Action
                          secondary
                          onClick={() => send("reject_agent_action", { id: a.id }, "intelligence")}
                        >
                          Reject proposed action
                        </Action>
                      </div>
                    )}
                    <p className="hub-note">
                      Approval rechecks the current domain state. Acknowledgement or inventory
                      checks may still be required.
                    </p>
                  </div>
                ))}
              {run.status === "RUNNING" && (
                <Action
                  secondary
                  onClick={() => send("cancel_agent_run", { id: run.id }, "intelligence")}
                >
                  Cancel agent run
                </Action>
              )}
            </>
          )}
        </Panel>
        <Panel title="Run history" kicker="Persisted execution records">
          {data.agentRuns.map((r) => (
            <button
              className={`hub-run-choice ${run?.id === r.id ? "selected" : ""}`}
              onClick={() => setSelected(r.id)}
              key={r.id}
            >
              <span>
                <strong>{label(r.agent)}</strong>
                <small>
                  {r.id.slice(0, 8)} · {r.provider}
                </small>
              </span>
              <Badge value={r.status} />
            </button>
          ))}
        </Panel>
      </div>
      <Panel title="Evaluation evidence" kicker="Scenario F / Retrieval + policy fixtures">
        {!data.evaluations.length ? (
          <Empty>
            Run the suite to record exact cases and results. Scores describe this fixture set, not
            general model quality.
          </Empty>
        ) : (
          data.evaluations.slice(0, 2).map((e) => (
            <div className="hub-work" key={e.id}>
              <h3>
                {e.passed} / {e.total} checks passed · {e.version}
              </h3>
              <p className="hub-note">
                {e.provider} provider · six retrieval cases (four development, two held-out), eight
                policy-contract cases. No live-model quality estimate.
              </p>
              <div className="hub-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Case</th>
                      <th>Split</th>
                      <th>Expected / observed</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.results.map((r) => (
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        <td>{r.split}</td>
                        <td>
                          {r.expected} / {r.actual}
                        </td>
                        <td>
                          <Badge value={r.passed ? "SUCCEEDED" : "FAILED"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}

export function KnowledgeView({ data, send }: { data: HubSnapshot; send: SendCommand }) {
  const [query, setQuery] = useState("coolant pump inspection"),
    [sources, setSources] = useState<SourceChunk[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState(""),
    [title, setTitle] = useState(""),
    [body, setBody] = useState("");
  async function search() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/knowledge?q=${encodeURIComponent(query)}`),
        result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Search failed.");
      setSources(result.sources);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="hub-stack">
      <Panel title="Procedure search" kicker="Knowledge / Versioned sources">
        <div className="hub-search">
          <input
            aria-label="Search procedures"
            value={query}
            maxLength={300}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void search();
            }}
          />
          <Action disabled={busy || query.trim().length < 2} onClick={() => void search()}>
            Search knowledge
          </Action>
        </div>
        {error && <p role="alert">{error}</p>}
        <p className="hub-note">
          PostgreSQL full-text ranking + token-hash vector similarity. Only the latest approved
          version of each document is retrieved. This local baseline uses no learned semantic
          embeddings.
        </p>
        {sources.map((s) => (
          <article className="hub-source" key={s.id}>
            <span className="hub-kicker">
              {s.slug} / v{s.version} · score {s.score.toFixed(3)}
            </span>
            <h3>{s.title}</h3>
            <p>{s.content}</p>
            <small className="hub-mono">Chunk {s.id}</small>
          </article>
        ))}
      </Panel>
      <Panel title="Knowledge library" kicker="Fictional procedures / Human publication">
        {data.documents.map((d) => (
          <details className="hub-audit" key={d.id}>
            <summary>
              <span>
                {d.title} · v{d.version}
              </span>
              <Badge value={d.status} />
            </summary>
            <p>{d.body}</p>
            {d.status === "DRAFT" && (
              <Action onClick={() => send("approve_document", { id: d.id }, "knowledge")}>
                Approve document version
              </Action>
            )}
          </details>
        ))}
      </Panel>
      <Panel title="Ingest a document version" kicker="Atlas / Documents">
        <div className="hub-form-grid">
          <label className="hub-field">
            Document key
            <input
              value={slug}
              placeholder="coolant-pump"
              maxLength={60}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
          <label className="hub-field">
            Title
            <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          </label>
        </div>
        <label className="hub-field">
          Procedure text
          <textarea
            value={body}
            minLength={40}
            maxLength={10000}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <div className="hub-actions">
          <Action
            disabled={!/^[a-z0-9-]{3,60}$/.test(slug) || title.length < 3 || body.length < 40}
            onClick={() => send("ingest_document", { slug, title, body }, "knowledge")}
          >
            Create draft version
          </Action>
        </div>
        <p className="hub-note">
          Reusing a document key creates the next version. Review and approve it before retrieval
          can use it.
        </p>
      </Panel>
    </div>
  );
}
