import type { ScenarioKind } from "./contracts";

// A deterministic fixture generator. No global clock or Math.random dependency.
export function generateScenario(kind: ScenarioKind, seed: number, startAt: Date, ticks = 12) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return Array.from({ length: ticks }, (_, index) => {
    const progress = (index + 1) / ticks;
    const decline = kind === "degradation" ? progress : kind === "recovery" ? 1 - progress : 0;
    return {
      observedAt: new Date(startAt.getTime() + (index + 1) * 5000).toISOString(),
      pressureBar: Number((3.2 - 1.65 * decline + (random() - 0.5) * 0.08).toFixed(3)),
      vibrationMms: Number((2.1 + 6.5 * decline + (random() - 0.5) * 0.3).toFixed(3)),
      temperatureC: Number((36.5 + 13 * decline + (random() - 0.5) * 0.6).toFixed(2)),
    };
  });
}
