"use client";

import { useId } from "react";
import type { Reading } from "@/domain/contracts";

export function Sparkline({ values, color = "var(--mint)" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values) - 0.15;
  const range = Math.max(...values) - min + 0.15;
  const points = values
    .map(
      (value, index) =>
        `${(index / (values.length - 1)) * 112},${36 - ((value - min) / range) * 32}`,
    )
    .join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 112 40" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TelemetryChart({
  readings,
  metric,
  threshold,
  range,
  label,
  unit,
  color,
}: {
  readings: Reading[];
  metric: "pressureBar" | "vibrationMms";
  threshold: number;
  range: [number, number];
  label: string;
  unit: string;
  color: string;
}) {
  const id = useId().replace(/:/g, "");
  const width = 660;
  const height = 184;
  const left = 37;
  const right = 14;
  const top = 22;
  const bottom = 28;
  const x = (time: number) => left + time * (width - left - right);
  const y = (value: number) =>
    top + (1 - (value - range[0]) / (range[1] - range[0])) * (height - top - bottom);
  const minTime = readings.length ? new Date(readings[0].observedAt).getTime() : 0;
  const maxTime = readings.length ? new Date(readings.at(-1)!.observedAt).getTime() : 1;
  const points = readings.map((reading) => [
    x((new Date(reading.observedAt).getTime() - minTime) / (maxTime - minTime || 1)),
    y(reading[metric]),
  ]);
  const path = points
    .map((point, index) => `${index ? "L" : "M"}${point[0].toFixed(2)},${point[1].toFixed(2)}`)
    .join(" ");
  const latest = readings.at(-1);
  return (
    <div className="chart-block">
      <div className="chart-title">
        <span>
          <i style={{ background: color }} />
          {label}
        </span>
        <span className="mono">
          {latest?.[metric].toFixed(2) ?? "—"} <small>{unit}</small>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label} telemetry history. ${readings.length} readings; threshold ${threshold} ${unit}.`}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.17" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((tick) => {
          const value = range[0] + ((range[1] - range[0]) * tick) / 3;
          return (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--line)"
                strokeDasharray="3 5"
              />
              <text x={left - 9} y={y(value) + 3} textAnchor="end" className="svg-label">
                {value.toFixed(1)}
              </text>
            </g>
          );
        })}
        <line
          x1={left}
          x2={width - right}
          y1={y(threshold)}
          y2={y(threshold)}
          stroke="var(--amber)"
          strokeDasharray="5 5"
          opacity=".65"
        />
        <text
          x={width - right}
          y={y(threshold) - 6}
          textAnchor="end"
          className="svg-label threshold-label"
        >
          LIMIT {threshold.toFixed(1)}
        </text>
        {points.length > 0 && (
          <>
            <path
              d={`${path} L${points.at(-1)![0]},${height - bottom} L${points[0][0]},${height - bottom} Z`}
              fill={`url(#${id})`}
            />
            <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            <circle
              cx={points.at(-1)![0]}
              cy={points.at(-1)![1]}
              r="3.5"
              fill={color}
              stroke="var(--panel)"
              strokeWidth="2"
            />
          </>
        )}
        {readings.length > 0 &&
          [0, 0.5, 1].map((position) => (
            <text
              key={position}
              x={x(position)}
              y={height - 6}
              textAnchor={position === 0 ? "start" : position === 1 ? "end" : "middle"}
              className="svg-label"
            >
              {new Date(minTime + (maxTime - minTime) * position).toISOString().slice(11, 19)}
            </text>
          ))}
      </svg>
    </div>
  );
}
