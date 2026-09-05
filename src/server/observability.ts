import type { SpanExporter } from "@opentelemetry/sdk-trace-base";
import { getPool } from "./db";

// Best-effort local OpenTelemetry export; it never changes a committed business outcome.
export const localSpanExporter: SpanExporter = {
  export(spans, done) {
    const relevant = spans.filter(
      (s) =>
        s.name === "helios.request" && typeof s.attributes["helios.organization_id"] === "string",
    );
    void Promise.all(
      relevant.map(async (span) => {
        const context = span.spanContext(),
          a = span.attributes;
        await getPool().query(
          "INSERT INTO request_spans(trace_id,span_id,organization_id,name,request_id,status_code,duration_ms,started_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING",
          [
            context.traceId,
            context.spanId,
            a["helios.organization_id"],
            span.name,
            a["helios.request_id"] ?? "",
            a["http.response.status_code"] ?? 0,
            span.duration[0] * 1000 + span.duration[1] / 1e6,
            new Date(span.startTime[0] * 1000 + span.startTime[1] / 1e6),
          ],
        );
      }),
    ).then(
      () => done({ code: 0 }),
      () => done({ code: 1 }),
    );
  },
  async shutdown() {},
};
