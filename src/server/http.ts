import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "./errors";
import { trace, SpanStatusCode } from "@opentelemetry/api";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new DomainError(415, "CONTENT_TYPE", "Use application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new DomainError(400, "INVALID_JSON", "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 16384) {
      await reader.cancel();
      throw new DomainError(413, "BODY_TOO_LARGE", "Request body exceeds 16 KiB.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DomainError(400, "INVALID_JSON", "Request body is not valid JSON.");
  }
}

export async function route(work: () => Promise<NextResponse>) {
  return trace.getTracer("helios-http").startActiveSpan("helios.request", async (span) => {
    try {
      const response = await handleRoute(work);
      span.setAttributes({
        "http.response.status_code": response.status,
        "helios.request_id": response.headers.get("X-Request-Id") ?? "",
      });
      response.headers.set("X-Trace-Id", span.spanContext().traceId);
      if (response.status >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
      return response;
    } finally {
      span.end();
    }
  });
}

async function handleRoute(work: () => Promise<NextResponse>) {
  const requestId = randomUUID();
  const started = Date.now();
  try {
    const response = await work();
    response.headers.set("X-Request-Id", requestId);
    console.info(
      JSON.stringify({
        event: "request.completed",
        requestId,
        status: response.status,
        durationMs: Date.now() - started,
      }),
    );
    return response;
  } catch (error) {
    const known = error instanceof DomainError;
    const validation = error instanceof ZodError;
    const status = known ? error.status : validation ? 400 : 500;
    const code = known ? error.code : validation ? "VALIDATION_FAILED" : "INTERNAL_ERROR";
    console.error(
      JSON.stringify({
        event: "request.failed",
        requestId,
        status,
        code,
        durationMs: Date.now() - started,
        errorType: error instanceof Error ? error.name : "Unknown",
      }),
    );
    const response = json(
      {
        error: {
          code,
          message: known
            ? error.message
            : validation
              ? "Check the request fields and values."
              : "The operation could not be completed. Check the server and database connection.",
          requestId,
          ...(validation
            ? {
                fields: error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
              }
            : {}),
        },
      },
      status,
    );
    response.headers.set("X-Request-Id", requestId);
    return response;
  }
}
