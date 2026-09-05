const stop = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "when",
  "must",
  "only",
  "before",
  "after",
  "into",
  "what",
  "how",
  "does",
  "are",
  "can",
  "not",
  "should",
  "a",
  "an",
  "to",
  "of",
  "in",
  "is",
  "on",
]);
export function tokenEmbedding(text: string) {
  const vector = Array<number>(128).fill(0);
  for (const token of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (stop.has(token) || token.length < 3) continue;
    let hash = 2166136261;
    for (const ch of token) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    vector[(hash >>> 0) % 128] += 1;
  }
  const norm = Math.hypot(...vector) || 1;
  return vector.map((n) => n / norm);
}
export function chunkDocument(body: string) {
  const words = body.trim().split(/\s+/),
    chunks: string[] = [];
  for (let i = 0; i < words.length; i += 150) {
    chunks.push(words.slice(i, i + 180).join(" "));
    if (i + 180 >= words.length) break;
  }
  return chunks;
}
export interface SourceChunk {
  id: string;
  document_id: string;
  title: string;
  slug: string;
  version: number;
  content: string;
  score: number;
}
export const KNOWLEDGE_FIXTURES = [
  {
    slug: "coolant-pump",
    title: "B-series coolant pump · inspection procedure",
    body: "Fictional Helios training manual. Low coolant pressure below 2.4 bar or vibration above 6.5 mm/s indicates a coolant loop anomaly. These readings alone do not prove a failed cartridge; inspect seals, lines, and pump condition. A certified COOLANT_L2 technician must isolate and lock out the loop, replace the approved cartridge if inspection supports replacement, torque fittings, inspect seals, and restore the loop. Reserve the PUMP-B17 part before work begins. Complete the checklist in order. Verify new nominal pressure and vibration readings after repair. Never disable life support or safety interlocks to clear an alert.",
  },
  {
    slug: "procurement-policy",
    title: "Maintenance procurement and budget policy",
    body: "Fictional Helios training policy. When station inventory cannot reserve a required coolant pump, create a purchase request for Asterion Fluid Systems. Human approval must precede commitment of maintenance budget. Dispatch reserves Earth inventory and a cargo vessel. Receipt consumes the budget commitment and increases spent costs. Cancel an approved unshipped purchase to release committed budget. Purchase receipt and retry must not duplicate stock. AI may propose a request but cannot approve expenditure.",
  },
  {
    slug: "solar-recovery",
    title: "Solar grid isolation and reserve procedure",
    body: "Fictional Helios training procedure. Solar array outage reduces generation to twelve percent. Battery reserve endurance is stored energy divided by net power deficit. Shed industrial manufacturing load before isolating the damaged array. Retain critical life support power. Repair the isolated solar array, then restore industrial load. A constant-load forecast is an estimate, not a guarantee. Do not automatically command critical systems through AI.",
  },
  {
    slug: "cargo-docking",
    title: "Cargo delay and docking recovery",
    body: "Fictional Helios training procedure. A delayed cargo shipment misses its docking window and prolongs maintenance awaiting parts. Reserve a priority direct route and a nonoverlapping docking slot. Advance simulation time to ETA and receive during the reserved fifteen minute window. Delivery transfers stock from Earth to station and reserves it for the linked work order. Never count a delayed part as available inventory.",
  },
  {
    slug: "payment-reconciliation",
    title: "Uncertain payment and reconciliation playbook",
    body: "Fictional Helios training playbook. A provider timeout can occur after a charge succeeds. Keep the payment attempt UNKNOWN and reuse the same idempotency key. Do not create a second charge. Reconcile against the provider record or validate a signed delayed webhook. A duplicate webhook must have one committed effect. Post balanced debit and credit journal entries once. Open a support ticket until uncertainty is resolved.",
  },
  {
    slug: "security-triage",
    title: "Security investigation and notification policy",
    body: "Fictional Helios training policy. Repeated denied access produces a security investigation. Preserve the actor, resource, correlation ID and event time. An operator records a finding before closing the investigation. Simulated suspicious-login scenarios do not represent a real account compromise. Never expose another organization's incident, source documents, invoices, or agent traces.",
  },
] as const;
