import type { PoolClient } from "pg";
import { seedKnowledgeTx } from "./knowledge";
import { PERSONAS } from "./identity";

export async function seedEnterpriseTx(client: PoolClient) {
  for (const [org, station, count] of [
    ["org-helios", "station-kepler", 120],
    ["org-selene", "station-selene", 80],
  ] as const) {
    for (const name of ["Engineering", "Flight operations", "Commercial"])
      await client.query(
        "INSERT INTO departments(id,organization_id,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [`${org}-${name}`, org, name],
      );
    await client.query(
      `INSERT INTO crew_members(id,organization_id,department_id,name,title,station_id,certification,certified_until)
      SELECT $1||'-crew-'||n,$1,$1||'-Engineering',
      (ARRAY['Samira Okafor','Luca Moreno','Mina Park','Elias Chen','Noor Ibrahim','Theo Brooks','Ada Mensah','Kai Nakamura'])[(n-1)%8+1]||' · '||lpad(n::text,3,'0'),
      CASE WHEN n<=3 THEN 'Coolant systems technician' ELSE 'Station specialist' END,$2,
      CASE WHEN n<=3 THEN 'COOLANT_L2' ELSE 'STATION_L1' END,
      CASE WHEN n=3 THEN '2041-01-01'::timestamptz ELSE '2043-12-31'::timestamptz END
      FROM generate_series(1,$3::int) n ON CONFLICT DO NOTHING`,
      [org, station, count],
    );
    for (const [kind, suffix, name, quantity] of [
      ["STATION", "local", "Station engineering stores", 0],
      ["ORIGIN", "earth", "Earth fulfillment center", 12],
    ] as const) {
      await client.query(
        "INSERT INTO warehouses(id,organization_id,name,kind) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [`${org}-${suffix}`, org, name, kind],
      );
      await client.query(
        "INSERT INTO inventory_stock(organization_id,warehouse_id,sku,name,on_hand) VALUES($1,$2,'PUMP-B17','B-series coolant pump cartridge',$3) ON CONFLICT DO NOTHING",
        [org, `${org}-${suffix}`, quantity],
      );
    }
    await client.query(
      "INSERT INTO vendors(id,organization_id,name,sku,unit_price_cents) VALUES($1,$2,'Asterion Fluid Systems','PUMP-B17',480000) ON CONFLICT DO NOTHING",
      [`${org}-asterion`, org],
    );
    await client.query(
      "INSERT INTO budgets(organization_id,name,limit_cents) VALUES($1,'Station maintenance · FY2042',50000000) ON CONFLICT DO NOTHING",
      [org],
    );
    for (let i = 1; i <= 3; i++)
      await client.query(
        "INSERT INTO vessels(id,organization_id,name,capacity) VALUES($1,$2,$3,8) ON CONFLICT DO NOTHING",
        [`${org}-vessel-${i}`, org, ["Meridian", "Peregrine", "Aster"][i - 1]],
      );
    await client.query(
      "INSERT INTO simulation_state(organization_id,now_at) VALUES($1,'2042-03-19T14:23:00Z') ON CONFLICT DO NOTHING",
      [org],
    );
    await client.query(
      "INSERT INTO energy_grids(organization_id,name,updated_at) VALUES($1,'Lunar solar microgrid','2042-03-19T14:23:00Z') ON CONFLICT DO NOTHING",
      [org],
    );
    await client.query(
      "INSERT INTO projects(id,organization_id,name) VALUES($1,$2,'Habitat module fabrication') ON CONFLICT DO NOTHING",
      [`${org}-fabrication`, org],
    );
    await seedKnowledgeTx(client, org === "org-helios" ? PERSONAS.controller : PERSONAS.observer);
    await client.query(
      "INSERT INTO customers(id,organization_id,name,contact) VALUES($1,$2,'Nadir Orbital Industries','Operations liaison · fictional customer') ON CONFLICT DO NOTHING",
      [`${org}-nadir`, org],
    );
    await client.query(
      "INSERT INTO subscriptions(id,organization_id,customer_id,plan,base_cents,unit_cents) VALUES($1,$2,$3,'Habitat compute · monthly',125000,250) ON CONFLICT DO NOTHING",
      [`${org}-compute`, org, `${org}-nadir`],
    );
    for (const [code, name] of [
      ["CASH", "Cash"],
      ["AR", "Accounts receivable"],
      ["REVENUE", "Service revenue"],
      ["PARTS", "Maintenance parts expense"],
      ["AP", "Accounts payable"],
    ])
      await client.query(
        "INSERT INTO ledger_accounts(organization_id,code,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [org, code, name],
      );
  }
}
