import { z } from "zod";
import { route, json, readJson } from "../../../server/http";
import { assertSameOrigin, principalFromRequest, requireOperator } from "../../../server/identity";
import { processNextEvent, resolveAndRedrive } from "../../../server/worker";
import { getPool } from "../../../server/db";
import { idempotentCommand } from "../../../server/operations";
import { audit } from "../../../server/audit";
import { DomainError } from "../../../server/errors";

const schema = z.discriminatedUnion("action", [
  z
    .object({
      commandId: z.uuid(),
      action: z.enum(["process_events", "inject_poison", "inject_backlog"]),
    })
    .strict(),
  z
    .object({
      commandId: z.uuid(),
      action: z.enum(["redrive_event", "duplicate_event", "read_notification"]),
      id: z.uuid(),
    })
    .strict(),
]);
export async function POST(request: Request) {
  return route(async () => {
    assertSameOrigin(request);
    const p = principalFromRequest(request);
    requireOperator(p);
    const input = schema.parse(await readJson(request));
    if (input.action === "process_events") {
      let processed = 0;
      for (let i = 0; i < 30; i++) {
        if (!(await processNextEvent(p))) break;
        processed++;
      }
      return json({ status: "PROCESSED", message: `Processed ${processed} deliveries.` });
    }
    if (input.action === "redrive_event") return json(await resolveAndRedrive(p, input.id));
    return json(
      await idempotentCommand(
        p,
        input,
        async (c) => {
          if (input.action === "inject_poison" || input.action === "inject_backlog") {
            const count = input.action === "inject_backlog" ? 40 : 1;
            for (let i = 0; i < count; i++)
              await audit(
                c,
                p,
                input.action === "inject_poison" ? "ExercisePoisonEvent" : "ExerciseBacklogEvent",
                p.organizationId,
                input.commandId,
                { simulated: true, index: i },
              );
            return { status: "QUEUED", message: `Queued ${count} controlled exercise events.` };
          }
          if (input.action === "duplicate_event") {
            const row = await c.query(
              "UPDATE outbox_events SET status='PENDING',attempts=0,available_at=clock_timestamp(),delivered_at=NULL WHERE organization_id=$1 AND id=$2 AND status='DELIVERED' RETURNING id",
              [p.organizationId, input.id],
            );
            if (!row.rowCount)
              throw new DomainError(
                409,
                "EVENT_NOT_DELIVERED",
                "Choose a delivered event in your organization.",
              );
            return {
              status: "QUEUED",
              message:
                "The same event will be delivered again; its consumer receipt prevents another effect.",
            };
          }
          if (input.action === "read_notification") {
            const notification = await c.query(
              "UPDATE notifications SET read_at=COALESCE(read_at,clock_timestamp()) WHERE organization_id=$1 AND id=$2",
              [p.organizationId, input.id],
            );
            if (!notification.rowCount)
              throw new DomainError(404, "NOT_FOUND", "Notification not found.");
          }
          return { status: "READ" };
        },
        getPool(),
      ),
    );
  });
}
