// Full pipeline check. Requires API + worker running with REAL Kafka and OpenSearch reachable.
// browse -> search (typo) -> cart -> checkout -> Postgres tx -> outbox -> Kafka -> consumers -> updated search index
const BASE = process.env.BASE_URL || "http://localhost:4000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const step = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) failed++; return ok; };
async function api(path, { method = "GET", token, body } = {}) {
  const r = await fetch(BASE + "/api" + path, { method, headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
async function until(fn, label, ms = 30000) { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(700); } step(false, `timed out waiting for: ${label}`); return null; }

const { json: { token } } = await api("/auth/login", { method: "POST", body: { email: "demo@stocksync.in", password: "demo123" } });
const health = (await api("/admin/health", { token: (await api("/auth/login", { method: "POST", body: { email: "admin@stocksync.in", password: "admin123" } })).json.token })).json;
step(health.postgres.ok, "PostgreSQL reachable"); step(health.kafka.ok, "Kafka reachable"); step(health.opensearch.ok, "OpenSearch reachable");
if (failed) process.exit(1);

// Wait for the seed events to flow Kafka -> search-sync -> index
await until(async () => (await api("/search?q=headphones")).json.total > 0, "initial index population via Kafka", 60000);
const typo = await api("/search?q=bluetoth");
step(typo.status === 200 && typo.json.items.some((p) => /bluetooth/i.test(p.name)), `fuzzy search: "bluetoth" returns Bluetooth products (${typo.json.total} hits)`);
const sug = await api("/search/suggest?q=blue");
step(Array.isArray(sug.json) && sug.json.length > 0, `autocomplete: "blue" -> ${sug.json.map?.((s) => s.name).slice(0, 2).join(", ")}`);
const city = await api("/search?city=Mumbai&category=audio&minPrice=500&maxPrice=5000&sort=price_asc");
step(city.status === 200 && city.json.items.every((p) => p.cities.includes("Mumbai") && p.price >= 500 && p.price <= 5000), "filters: city + category + price range + sort");

const target = (await api("/search?q=JBL Go 3&city=Bengaluru")).json.items[0] ?? (await api("/search?city=Bengaluru")).json.items[0];
const before = (await api(`/products/${target.id}`)).json.stock.Bengaluru;
await api("/cart/city", { method: "PUT", token, body: { city: "Bengaluru" } });
await api("/cart/items", { method: "PUT", token, body: { productId: target.id, quantity: 1 } });
const order = await api("/orders", { method: "POST", token });
step(order.status === 201, `checkout committed order #${order.json.orderId} in Postgres`);
const orderId = order.json.orderId;

const confirmed = await until(async () => (await api(`/orders/${orderId}`, { token })).json.status === "confirmed", "order confirmed by Kafka consumer");
step(!!confirmed, "Kafka -> order-confirmation consumer set status to confirmed");
const indexed = await until(async () => (await api(`/search?q=${encodeURIComponent(target.name)}&city=Bengaluru`)).json.items.find((p) => p.id === target.id)?.stock.Bengaluru === before - 1 || null, "search index reflects new stock");
step(!!indexed, `Kafka -> search-sync updated OpenSearch stock ${before} -> ${before - 1}`);
console.log(failed ? `\n${failed} STEP(S) FAILED` : "\nEND-TO-END PIPELINE VERIFIED");
process.exit(failed ? 1 : 0);
