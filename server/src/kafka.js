import { Kafka, logLevel } from "kafkajs";
import { config, topics } from "./config.js";

const { brokers, ssl, ca, cert, key, sasl, clientId } = config.kafka;
export const kafka = new Kafka({
  clientId, brokers, logLevel: logLevel.WARN,
  ssl: ssl ? { rejectUnauthorized: true, ca: ca ? [ca] : undefined, cert, key } : false,
  sasl,
  retry: { retries: 5, initialRetryTime: 300 },
});

export async function ensureTopics() {
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      waitForLeaders: true,
      topics: Object.values(topics).map((topic) => ({ topic, numPartitions: 3 })),
    });
  } finally { await admin.disconnect(); }
}

export async function kafkaHealth() {
  const admin = kafka.admin();
  try {
    await admin.connect();
    const t = await admin.listTopics();
    return { ok: true, topics: t.filter((x) => x.startsWith(config.kafka.prefix)) };
  } catch (e) { return { ok: false, error: e.message }; }
  finally { try { await admin.disconnect(); } catch {} }
}
