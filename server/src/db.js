import pg from "pg";
import fs from "node:fs";
import { config } from "./config.js";

// Return BIGINT/COUNT as JS numbers (all values here are well within 2^53).
pg.types.setTypeParser(20, (v) => Number(v));
pg.types.setTypeParser(1700, (v) => Number(v));

// pg lets ?sslmode=... in the URL override explicit ssl options, so we strip it and decide here.
// Aiven URLs carry sslmode=require. With PG_CA_PATH the server certificate is fully verified (recommended).
let connectionString = config.databaseUrl;
let wantsSsl = config.pgSsl;
try {
  const u = new URL(connectionString);
  const mode = u.searchParams.get("sslmode");
  if (mode && mode !== "disable") wantsSsl = true;
  u.searchParams.delete("sslmode");
  connectionString = u.toString();
} catch {}
let ssl;
if (config.pgCa) ssl = { ca: fs.readFileSync(config.pgCa, "utf8"), rejectUnauthorized: true };
else if (wantsSsl) ssl = { rejectUnauthorized: false };

export const pool = new pg.Pool({ connectionString, max: config.pgPool, ssl });
pool.on("error", (e) => console.error("[pg] idle client error", e.message));

export const query = (text, params) => pool.query(text, params);

export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

// Used inside a transaction so the event commits atomically with the data change.
export async function emit(client, topic, key, type, payload) {
  await client.query(
    "INSERT INTO outbox(topic, event_key, event_type, payload) VALUES ($1,$2,$3,$4)",
    [topic, String(key), type, JSON.stringify(payload)]
  );
}
