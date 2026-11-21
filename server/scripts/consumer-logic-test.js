// Exercises the consumer handlers against REAL PostgreSQL without needing a Kafka broker.
// Events are taken from the real outbox rows (shaped exactly as the relay serialises them) and fed through
// applyEvent(), the same function the Kafka consumers call per message. It does NOT test Kafka transport or OpenSearch.
import bcrypt from "bcryptjs";
import { pool } from "../src/db.js";
import { checkout } from "../src/checkout.js";
import { applyEvent } from "../src/consumers/runner.js";
import { orderConfirmationSpec, inventoryAlertsSpec, analyticsSpec } from "../src/consumers/index.js";
import { buildProductDoc } from "../src/productDoc.js";

const fails = [];
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) fails.push(msg); };
const one = async (sql, p) => (await pool.query(sql, p)).rows[0];
const tag = Date.now().toString(36);

const cat = (await one("SELECT id FROM categories ORDER BY id LIMIT 1")).id;
const prod = (await one("INSERT INTO products(sku,name,brand,category_id,price_paise) VALUES ($1,$2,\x27T\x27,$3,250000) RETURNING id", [`CL-${tag}`, `Consumer Test ${tag}`, cat])).id;
await pool.query("INSERT INTO inventory(product_id,city,quantity) VALUES ($1,\x27Bengaluru\x27,3), ($1,\x27Mumbai\x27,40)", [prod]);
const user = (await one("INSERT INTO users(email,name,password_hash) VALUES ($1,\x27CL\x27,$2) RETURNING id", [`cl-${tag}@example.com`, await bcrypt.hash("x", 4)])).id;
const cart = (await one("INSERT INTO carts(user_id, city) VALUES ($1,\x27Bengaluru\x27) RETURNING id", [user])).id;
await pool.query("INSERT INTO cart_items(cart_id,product_id,quantity) VALUES ($1,$2,3)", [cart, prod]);

const before = await buildProductDoc(prod);
check(before && before.price === 2500 && before.stock.Bengaluru === 3 && before.cities.includes("Bengaluru") && before.cities.includes("Mumbai"), "search document built from PostgreSQL: price in rupees, per-city stock, cities with stock");

const order = await checkout(user);
const events = (await pool.query("SELECT id, event_type, topic, payload FROM outbox WHERE (payload->>\x27orderId\x27)::bigint=$1 OR (payload->>\x27productId\x27)::bigint=$2 ORDER BY id", [order.orderId, prod]))
  .rows.map((r) => ({ topic: r.topic, evt: { eventId: r.id, type: r.event_type, ...r.payload } }));
check(events.some((e) => e.evt.type === "order.placed") && events.some((e) => e.evt.type === "inventory.changed"), "checkout wrote order.placed and inventory.changed to the outbox in its transaction");
check((await one("SELECT status FROM orders WHERE id=$1", [order.orderId])).status === "placed", "order starts as \x27placed\x27 (not confirmed until the consumer runs)");

const doc = await buildProductDoc(prod);
check(doc.stock.Bengaluru === 0 && !doc.cities.includes("Bengaluru") && doc.cities.includes("Mumbai"), "search document reflects sold-out city after checkout (Bengaluru dropped from cities)");

const run = async (spec) => { const r = []; for (const { topic, evt } of events) if (spec.topics.includes(topic)) r.push(await applyEvent(spec, evt, topic)); return r; };
await run(orderConfirmationSpec);
check((await one("SELECT status FROM orders WHERE id=$1", [order.orderId])).status === "confirmed", "order-confirmation consumer moved the order to \x27confirmed\x27");
check((await one("SELECT count(*) c FROM notifications WHERE order_id=$1", [order.orderId])).c === 1, "customer notification created");
const again = await run(orderConfirmationSpec);
check(again.every((x) => x === false) && (await one("SELECT count(*) c FROM notifications WHERE order_id=$1", [order.orderId])).c === 1, "redelivery of the same events is a no-op (idempotent)");

await run(inventoryAlertsSpec);
check((await one("SELECT count(*) c FROM stock_alerts WHERE product_id=$1 AND level=\x27out\x27", [prod])).c === 1, "inventory consumer raised a sold-out alert");

await run(analyticsSpec); await run(analyticsSpec);
const st = await one("SELECT orders, units, revenue_paise FROM order_stats WHERE city=\x27Bengaluru\x27 AND day=(SELECT created_at::date FROM orders WHERE id=$1)", [order.orderId]);
check(st && st.orders >= 1, "analytics consumer updated daily stats");
check((await one("SELECT count(*) c FROM processed_events WHERE consumer=\x27order-analytics\x27 AND event_id = ANY($1)", [events.map((e) => e.evt.eventId)])).c === events.filter((e) => e.topic.endsWith("orders")).length, "each event recorded once per consumer in processed_events");

await pool.query("UPDATE products SET active=false WHERE id=$1", [prod]);
check((await buildProductDoc(prod)) === null, "removed product yields no search document (consumer deletes it from the index)");
await pool.end();
console.log(fails.length ? `\n${fails.length} CHECK(S) FAILED` : "\nALL CONSUMER-LOGIC CHECKS PASSED (broker transport not covered).");
process.exit(fails.length ? 1 : 0);
