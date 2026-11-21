import { kafka } from "../kafka.js";
import { tx } from "../db.js";
import { config } from "../config.js";

/**
 * Runs one Kafka consumer group. For DB-only consumers the handler runs in the same
 * transaction as the processed_events insert, so a redelivered message is a no-op.
 */
// Applies one event exactly-once-effectively. Exported so the same path can be tested without a broker.
export async function applyEvent({ name, handle, external = false }, evt, topic) {
  const mark = (c) => c.query("INSERT INTO processed_events(consumer, event_id, topic, event_type) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [name, evt.eventId, topic, evt.type]);
  if (external) {
    // Side effect lives outside Postgres (OpenSearch). It is idempotent, so apply then record.
    await handle(null, evt, topic);
    await tx(async (c) => { await mark(c); });
    return true;
  }
  return tx(async (c) => {
    const first = (await mark(c)).rowCount === 1;
    if (first) await handle(c, evt, topic);
    return first;
  });
}

export async function runConsumer({ name, topics, handle, external = false }) {
  const consumer = kafka.consumer({ groupId: `${config.kafka.prefix}-${name}`, sessionTimeout: 30000 });
  await consumer.connect();
  for (const topic of topics) await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      await applyEvent({ name, handle, external }, JSON.parse(message.value.toString()), topic);
    },
  });
  console.log(`[consumer:${name}] subscribed to ${topics.join(", ")}`);
  return () => consumer.disconnect();
}
