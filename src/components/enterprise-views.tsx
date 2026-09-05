import { useState } from "react";
import type { HubSnapshot } from "../domain/hub";
import { Action, Badge, Empty, Panel, Stat, money, type SendCommand } from "./hub-shared";

export function FinanceView({ data, send }: { data: HubSnapshot; send: SendCommand }) {
  return (
    <div className="hub-stack">
      <div className="hub-stats">
        <Stat
          label="Billed · visible invoices"
          value={money(data.invoices.reduce((sum, i) => sum + i.amount_cents, 0))}
        />
        <Stat
          label="Settled"
          value={money(
            data.invoices
              .filter((i) => i.status === "PAID")
              .reduce((sum, i) => sum + i.amount_cents, 0),
          )}
        />
        <Stat
          label="Uncertain payments"
          value={data.invoices.filter((i) => i.status === "UNKNOWN").length}
        />
        <Stat
          label="Journal entries"
          value={data.journals.length}
          detail="Balanced at transaction commit"
        />
      </div>
      <Panel title="Customer subscriptions" kicker="Atlas / Commercial">
        {data.subscriptions.map((s) => (
          <div className="hub-row" key={s.id}>
            <div>
              <h3>{s.customer_name}</h3>
              <p className="hub-muted">
                {s.plan} · {money(s.base_cents)} + ${(s.unit_cents / 100).toFixed(2)} per unit
              </p>
            </div>
            <div className="hub-actions">
              <Action
                secondary
                onClick={() =>
                  send("record_usage", { subscriptionId: s.id, quantity: 240 }, "billing")
                }
              >
                Record 240 usage units
              </Action>
              <Action onClick={() => send("issue_invoice", { subscriptionId: s.id }, "billing")}>
                Issue monthly invoice
              </Action>
            </div>
          </div>
        ))}
      </Panel>
      <Panel title="Invoices and payment uncertainty" kicker="Scenario E / Simulated provider">
        {!data.invoices.length && (
          <Empty>
            Record usage and issue an invoice to begin the payment uncertainty scenario.
          </Empty>
        )}
        {data.invoices.map((i) => {
          const attempt = data.payments.find((p) => p.invoice_id === i.id),
            charge = data.providerCharges.find((p) => p.invoice_id === i.id);
          return (
            <article className="hub-work" key={i.id}>
              <div className="hub-row">
                <div>
                  <span className="hub-kicker">
                    INV-{String(i.number).padStart(4, "0")} · {i.period}
                  </span>
                  <h3>{money(i.amount_cents)}</h3>
                </div>
                <Badge value={i.status} />
              </div>
              <div className="hub-table-wrap">
                <table>
                  <tbody>
                    {data.invoiceLines
                      .filter((l) => l.invoice_id === i.id)
                      .map((l) => (
                        <tr key={l.description}>
                          <td>{l.description}</td>
                          <td>
                            {l.quantity} × ${(l.unit_cents / 100).toFixed(2)}
                          </td>
                          <td>{money(l.quantity * l.unit_cents)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {attempt && (
                <div className="hub-payment-state">
                  <div>
                    <span>HELIOS ATTEMPT</span>
                    <Badge value={attempt.status} />
                    <small>{attempt.provider_key.slice(0, 8)} · persistent provider key</small>
                  </div>
                  <span>↔</span>
                  <div>
                    <span>SIMULATED PROVIDER</span>
                    <Badge value={charge?.status ?? "NO_CHARGE"} />
                    <small>{charge ? money(charge.amount_cents) : "No committed charge"}</small>
                  </div>
                </div>
              )}
              {i.status === "UNKNOWN" && (
                <p className="hub-callout">
                  Outcome is uncertain. Inspect the provider record and reconcile the existing
                  attempt. A support case remains open until settlement.
                </p>
              )}
              <div className="hub-actions">
                {i.status === "OPEN" && (
                  <>
                    <Action
                      onClick={() =>
                        send("pay_invoice", { invoiceId: i.id, behavior: "timeout" }, "billing")
                      }
                    >
                      Simulate timeout after charge
                    </Action>
                    <Action
                      secondary
                      onClick={() =>
                        send("pay_invoice", { invoiceId: i.id, behavior: "outage" }, "billing")
                      }
                    >
                      Simulate provider outage
                    </Action>
                  </>
                )}
                {i.status === "UNKNOWN" && (
                  <>
                    <Action
                      onClick={() => send("reconcile_invoice", { invoiceId: i.id }, "billing")}
                    >
                      Reconcile payment
                    </Action>
                    <Action
                      secondary
                      onClick={() => send("deliver_webhook", { invoiceId: i.id }, "billing")}
                    >
                      Deliver signed webhook
                    </Action>
                    <Action
                      secondary
                      onClick={() =>
                        send("pay_invoice", { invoiceId: i.id, behavior: "success" }, "billing")
                      }
                    >
                      Retry same payment
                    </Action>
                  </>
                )}
                {i.status === "PAID" && (
                  <Action
                    secondary
                    onClick={() => send("refund_invoice", { invoiceId: i.id }, "billing")}
                  >
                    Issue simulated refund
                  </Action>
                )}
              </div>
            </article>
          );
        })}
      </Panel>
      <Panel title="Accounting journal" kicker="Integer cents / Immutable posted entries">
        {!data.journals.length && (
          <Empty>
            Invoices, payments, procurement receipts and refunds post balanced journal entries.
          </Empty>
        )}
        {data.journals.map((j) => (
          <details className="hub-audit" key={j.id}>
            <summary>
              <span>{j.description}</span>
              <span className={j.debits === j.credits ? "hub-positive" : "hub-warning"}>
                {money(j.debits)} DR = {money(j.credits)} CR
              </span>
            </summary>
            <p className="hub-mono">{j.reference}</p>
            <div className="hub-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Side</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {j.lines.map((l, index) => (
                    <tr key={index}>
                      <td>{l.account}</td>
                      <td>{l.side}</td>
                      <td>{money(l.amount_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </Panel>
    </div>
  );
}
export function CasesView({ data, send }: { data: HubSnapshot; send: SendCommand }) {
  const [findings, setFindings] = useState<Record<string, string>>({});
  return (
    <div className="hub-stack">
      <Panel title="Security investigations" kicker="Helios / Controlled access scenario">
        <div className="hub-actions">
          <Action onClick={() => send("inject_security_campaign", {}, "cases")}>
            Inject suspicious access campaign
          </Action>
        </div>
        <p className="hub-note">
          This scenario records simulated denied-access signals. It does not attempt logins or
          change real accounts.
        </p>
        {data.investigations.map((i) => (
          <article className="hub-work" key={i.id}>
            <div className="hub-row">
              <h3>{i.title}</h3>
              <Badge value={i.status} />
            </div>
            <p className="hub-muted">{i.signals.length} preserved signals</p>
            <details>
              <summary>Inspect signals</summary>
              <pre>{JSON.stringify(i.signals, null, 2)}</pre>
            </details>
            {i.status === "OPEN" && (
              <div className="hub-actions">
                <Action onClick={() => send("investigate_security", { id: i.id }, "cases")}>
                  Begin investigation
                </Action>
              </div>
            )}
            {i.status === "INVESTIGATING" && (
              <>
                <label className="hub-field">
                  Investigation finding
                  <textarea
                    value={findings[i.id] ?? ""}
                    maxLength={1000}
                    onChange={(e) => setFindings({ ...findings, [i.id]: e.target.value })}
                  />
                </label>
                <div className="hub-actions">
                  <Action
                    disabled={(findings[i.id] ?? "").trim().length < 12}
                    onClick={() =>
                      send("resolve_security", { id: i.id, finding: findings[i.id] }, "cases")
                    }
                  >
                    Resolve investigation
                  </Action>
                </div>
              </>
            )}
            {i.finding && <p>{i.finding}</p>}
          </article>
        ))}
      </Panel>
      <Panel title="Customer support" kicker="Atlas / Payment recovery">
        {!data.tickets.length && (
          <Empty>An uncertain payment creates a support case automatically.</Empty>
        )}
        {data.tickets.map((t) => (
          <article className="hub-work" key={t.id}>
            <div className="hub-row">
              <h3>
                SUP-{String(t.number).padStart(4, "0")} · {t.title}
              </h3>
              <Badge value={t.status} />
            </div>
            <p>{t.summary}</p>
            <p className="hub-note">
              SLA due {new Date(t.due_at).toLocaleString()} ·{" "}
              {t.resolution ?? "Reconcile the payment to resolve this case."}
            </p>
            {t.status === "OPEN" && (
              <Action secondary onClick={() => send("investigate_ticket", { id: t.id }, "cases")}>
                Investigate payment case
              </Action>
            )}
          </article>
        ))}
      </Panel>
    </div>
  );
}
