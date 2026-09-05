export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerOTel } = await import("@vercel/otel");
    const { BatchSpanProcessor } = await import("@opentelemetry/sdk-trace-base");
    const { localSpanExporter } = await import("./server/observability");
    registerOTel({
      serviceName: "helios",
      spanProcessors: [
        new BatchSpanProcessor(localSpanExporter, {
          scheduledDelayMillis: 500,
          maxQueueSize: 1000,
          maxExportBatchSize: 50,
        }),
      ],
    });
  }
}
