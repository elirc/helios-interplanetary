export const THRESHOLDS = { pressureMin: 2.4, vibrationMax: 6.5 } as const;

export function evaluateReading(reading: { pressureBar: number; vibrationMms: number }) {
  const reasons: string[] = [];
  if (reading.pressureBar < THRESHOLDS.pressureMin) reasons.push("Coolant pressure below 2.4 bar");
  if (reading.vibrationMms > THRESHOLDS.vibrationMax) reasons.push("Pump vibration above 6.5 mm/s");
  return { breached: reasons.length > 0, reasons };
}
