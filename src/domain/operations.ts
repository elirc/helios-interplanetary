import { z } from "zod";

const base = { commandId: z.uuid() };
const work = { ...base, workOrderId: z.uuid() };
const purchase = { ...base, purchaseId: z.uuid() };
const shipment = { ...base, shipmentId: z.uuid() };
export const operationSchema = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("create_work_order"), incidentId: z.uuid() }).strict(),
  z.object({ ...work, action: z.literal("reserve_parts") }).strict(),
  z.object({ ...work, action: z.literal("request_purchase") }).strict(),
  z
    .object({
      ...purchase,
      action: z.enum([
        "approve_purchase",
        "reject_purchase",
        "cancel_purchase",
        "dispatch_purchase",
      ]),
    })
    .strict(),
  z
    .object({
      ...shipment,
      action: z.enum(["delay_shipment", "reroute_shipment", "deliver_shipment"]),
    })
    .strict(),
  z
    .object({ ...work, action: z.literal("assign_crew"), crewId: z.string().min(1).max(80) })
    .strict(),
  z
    .object({
      ...work,
      action: z.enum([
        "start_repair",
        "begin_verification",
        "complete_repair",
        "cancel_work_order",
      ]),
    })
    .strict(),
  z
    .object({
      ...work,
      action: z.literal("complete_task"),
      taskKey: z.enum(["isolate", "replace", "inspect"]),
    })
    .strict(),
]);
export type Operation = z.infer<typeof operationSchema>;
export type CommandResult = { id: string; status: string; replayed?: boolean; message?: string };
export type WorkStatus =
  | "PLANNED"
  | "AWAITING_PARTS"
  | "READY"
  | "IN_PROGRESS"
  | "VERIFYING"
  | "COMPLETED"
  | "CANCELLED";
export interface WorkOrderRow {
  id: string;
  number: number;
  organization_id: string;
  incident_id: string;
  asset_id: string;
  title: string;
  status: WorkStatus;
  required_sku: string;
  quantity: number;
  crew_id: string | null;
  verification_after: Date | null;
  correlation_id: string;
}
export interface PurchaseRow {
  id: string;
  work_order_id: string;
  sku: string;
  quantity: number;
  total_cents: number;
  status: string;
  correlation_id: string;
}
export interface ShipmentRow {
  id: string;
  purchase_id: string;
  vessel_id: string;
  origin_id: string;
  destination_id: string;
  status: string;
  eta: Date;
  correlation_id: string;
}
