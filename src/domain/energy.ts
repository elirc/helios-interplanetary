export interface EnergyState {
  solar_kw: number;
  critical_kw: number;
  industrial_kw: number;
  battery_kwh: number;
  capacity_kwh: number;
  load_shed: boolean;
  outage: boolean;
}
export function energyBalance(grid: EnergyState, seconds: number) {
  const generation = grid.outage ? grid.solar_kw * 0.12 : grid.solar_kw;
  const demand = grid.critical_kw + (grid.load_shed ? 0 : grid.industrial_kw);
  const deficit = demand - generation;
  const battery = Math.max(
    0,
    Math.min(grid.capacity_kwh, grid.battery_kwh - (deficit * seconds) / 3600),
  );
  return {
    generationKw: generation,
    demandKw: demand,
    batteryKwh: Math.round(battery * 1000) / 1000,
    reserveMinutes: deficit > 0 ? Math.round((battery / deficit) * 60) : null,
    unservedKw: battery === 0 ? Math.max(0, deficit) : 0,
  };
}
