import type { ReactNode } from "react";

export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
export const simDate = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
export const label = (value: string) => value.toLowerCase().replaceAll("_", " ");
export type SendCommand = (
  action: string,
  fields?: Record<string, unknown>,
  endpoint?: string,
) => Promise<void>;
export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`hub-badge ${["COMPLETED", "RESOLVED", "READY", "NOMINAL", "DELIVERED", "PAID", "SUCCEEDED", "APPROVED", "AVAILABLE"].includes(value) ? "good" : ["DELAYED", "DEAD", "FAILED", "DEGRADED", "REJECTED", "UNKNOWN", "AWAITING_PARTS"].includes(value) ? "warn" : ""}`}
    >
      {label(value)}
    </span>
  );
}
export function Panel({
  title,
  kicker,
  children,
  className = "",
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`hub-panel ${className}`}>
      <header>
        <div>
          {kicker && <span className="hub-kicker">{kicker}</span>}
          <h2>{title}</h2>
        </div>
      </header>
      {children}
    </section>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="hub-empty">{children}</div>;
}
export function Action({
  children,
  onClick,
  disabled = false,
  secondary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <button
      className={secondary ? "hub-button secondary" : "hub-button"}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Stat({
  label: caption,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="hub-stat">
      <span>{caption}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
