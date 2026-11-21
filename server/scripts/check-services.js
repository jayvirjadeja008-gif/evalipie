// Verifies that each backing service is genuinely reachable with the configured credentials.
import { pool } from "../src/db.js";
import { kafkaHealth } from "../src/kafka.js";
import { searchHealth } from "../src/search.js";
const pg = await pool.query("SELECT version()").then((r) => ({ ok: true, version: r.rows[0].version.split(",")[0] })).catch((e) => ({ ok: false, error: e.message }));
const [k, s] = await Promise.all([kafkaHealth(), searchHealth()]);
console.log("PostgreSQL:", JSON.stringify(pg));
console.log("Kafka     :", JSON.stringify(k));
console.log("OpenSearch:", JSON.stringify(s));
await pool.end();
process.exit(pg.ok && k.ok && s.ok ? 0 : 1);
