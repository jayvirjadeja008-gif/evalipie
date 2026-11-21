import "dotenv/config";
import fs from "node:fs";

const read = (p) => (p ? fs.readFileSync(p, "utf8") : undefined);

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  databaseUrl: process.env.DATABASE_URL || "postgres://stocksync:stocksync@localhost:5432/stocksync",
  pgCa: process.env.PG_CA_PATH,
  pgSsl: process.env.PG_SSL === "true",
  pgPool: Number(process.env.PG_POOL_MAX || 20),
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(",").map((s) => s.trim()),
    // Aiven Kafka: set KAFKA_SSL=true and either client-cert (CA+cert+key) or SASL credentials.
    ssl: process.env.KAFKA_SSL === "true",
    ca: read(process.env.KAFKA_CA_PATH),
    cert: read(process.env.KAFKA_CERT_PATH),
    key: read(process.env.KAFKA_KEY_PATH),
    sasl: process.env.KAFKA_SASL_USERNAME
      ? { mechanism: process.env.KAFKA_SASL_MECHANISM || "scram-sha-256", username: process.env.KAFKA_SASL_USERNAME, password: process.env.KAFKA_SASL_PASSWORD }
      : undefined,
    clientId: "stocksync",
    prefix: process.env.KAFKA_TOPIC_PREFIX || "stocksync",
  },
  opensearch: {
    url: process.env.OPENSEARCH_URL || "http://localhost:9200", // Aiven: https://avnadmin:PASSWORD@host:port
    index: process.env.OPENSEARCH_INDEX || "stocksync-products",
    insecure: process.env.OPENSEARCH_INSECURE === "true",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
  },
  paytm: {
    mid: process.env.PAYTM_MID || "",
    merchantKey: process.env.PAYTM_MERCHANT_KEY || "",
  },
  lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD || 10),
};

export const topics = {
  orders: `${config.kafka.prefix}.orders`,
  inventory: `${config.kafka.prefix}.inventory`,
  products: `${config.kafka.prefix}.products`,
};
