import { kafka } from "./kafka.js";
import { pool } from "./db.js";

// Transactional-outbox relay: reads committed-but-unpublished rows and publishes them to Kafka.
// Rows are marked published only after Kafka acknowledges them (at-least-once; consumers are idempotent).
export async function startRelay({ intervalMs = 400, batch = 100 } = {}) {
  const producer = kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
  await producer.connect();
  let stopped = false;

  async function tick() {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT id, topic, event_key, event_type, payload FROM outbox WHERE published_at IS NULL ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED", [batch]);
      if (!rows.length) { await client.query("COMMIT"); return 0; }
      const byTopic = new Map();
      for (const r of rows) {
        if (!byTopic.has(r.topic)) byTopic.set(r.topic, []);
        byTopic.get(r.topic).push({
          key: r.event_key,
          value: JSON.stringify({ eventId: r.id, type: r.event_type, ...r.payload }),
          headers: { eventId: String(r.id), eventType: r.event_type },
        });
      }
      try {
        await producer.sendBatch({ topicMessages: [...byTopic].map(([topic, messages]) => ({ topic, messages })) });
      } catch (e) {
        await client.query("ROLLBACK");
        await pool.query("UPDATE outbox SET attempts = attempts + 1, last_error = $2 WHERE id = ANY($1)", [rows.map((r) => r.id), e.message.slice(0, 300)]);
        throw e;
      }
      await client.query("UPDATE outbox SET published_at = now(), last_error = NULL WHERE id = ANY($1)", [rows.map((r) => r.id)]);
      await client.query("COMMIT");
      return rows.length;
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      throw e;
    } finally { client.release(); }
  }

  (async () => {
    while (!stopped) {
      let n = 0;
      try { n = await tick(); } catch (e) { console.error("[relay] publish failed, will retry:", e.message); await new Promise((r) => setTimeout(r, 2000)); }
      if (!n) await new Promise((r) => setTimeout(r, intervalMs));
    }
  })();
  console.log("[relay] outbox relay started");
  return async () => { stopped = true; await producer.disconnect(); };
}
