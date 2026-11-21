// Concurrency stress test: 50 customers race for 5 units through the real HTTP API.
// Every cart also holds a plentiful second product, to prove that a failed checkout leaves NO partial effects.
import bcrypt from "bcryptjs";
import { pool } from "../src/db.js";
import { sign } from "../src/auth.js";

const BASE = process.env.BASE_URL || "http://localhost:4000";
const BUYERS = Number(process.env.BUYERS || 50);
const STOCK = Number(process.env.STOCK || 5);
const CITY = "Bengaluru";
const tag = Date.now().toString(36);
const fails = [];
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) fails.push(msg); };

async function api(path, { method = "GET", token, body } = {}) {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

const cat = (await pool.query("SELECT id FROM categories ORDER BY id LIMIT 1")).rows[0].id;
const mk = async (sku, name, qty) => {
  const id = (await pool.query("INSERT INTO products(sku,name,brand,category_id,price_paise) VALUES ($1,$2,\x27StressCo\x27,$3,99900) RETURNING id", [sku, name, cat])).rows[0].id;
  await pool.query("INSERT INTO inventory(product_id,city,quantity) VALUES ($1,$2,$3)", [id, CITY, qty]);
  return id;
};
const scarce = await mk(`STRESS-S-${tag}`, `Stress Scarce ${tag}`, STOCK);
const plenty = await mk(`STRESS-P-${tag}`, `Stress Plenty ${tag}`, 1000);
console.log(`Setup: product ${scarce} has ${STOCK} units, product ${plenty} has 1000 units, ${BUYERS} buyers\n`);

// Users are inserted directly (bcrypt once) and given real JWTs; carts are filled through the real API.
const hash = await bcrypt.hash("stress-pass", 4);
const buyers = [];
for (let i = 0; i < BUYERS; i++) {
  const u = (await pool.query("INSERT INTO users(email,name,password_hash) VALUES ($1,$2,$3) RETURNING id,role", [`stress-${tag}-${i}@example.com`, `Stress ${i}`, hash])).rows[0];
  buyers.push({ id: u.id, token: sign(u) });
}
await Promise.all(buyers.map(async (b) => {
  await api("/api/cart/city", { method: "PUT", token: b.token, body: { city: CITY } });
  await api("/api/cart/items", { method: "PUT", token: b.token, body: { productId: plenty, quantity: 1 } });
  const r = await api("/api/cart/items", { method: "PUT", token: b.token, body: { productId: scarce, quantity: 1 } });
  if (r.status !== 200) throw new Error("cart setup failed " + JSON.stringify(r));
}));

console.log(`Firing ${BUYERS} simultaneous checkouts...`);
const t0 = Date.now();
const results = await Promise.all(buyers.map((b) => api("/api/orders", { method: "POST", token: b.token })));
console.log(`Done in ${Date.now() - t0} ms\n`);

const ok = results.filter((r) => r.status === 201);
const oos = results.filter((r) => r.status === 409 && r.json.error === "out_of_stock");
const other = results.filter((r) => ![201, 409].includes(r.status));
const q = async (sql, p) => (await pool.query(sql, p)).rows[0];

check(ok.length === STOCK, `exactly ${STOCK} purchases succeeded (got ${ok.length})`);
check(oos.length === BUYERS - STOCK, `${BUYERS - STOCK} requests rejected with 409 out_of_stock (got ${oos.length})`);
check(other.length === 0, `no unexpected responses (got ${other.length}${other[0] ? ": " + JSON.stringify(other[0]) : ""})`);
check((await q("SELECT quantity FROM inventory WHERE product_id=$1 AND city=$2", [scarce, CITY])).quantity === 0, "scarce product stock is exactly 0");
check((await q("SELECT count(*) c FROM inventory WHERE quantity < 0")).c === 0, "no inventory row anywhere is negative");
check((await q("SELECT quantity FROM inventory WHERE product_id=$1 AND city=$2", [plenty, CITY])).quantity === 1000 - STOCK,
  `second product decremented only for successful orders: ${1000 - STOCK} left (no partial orders / no leaked decrements)`);
check((await q("SELECT count(DISTINCT o.id) c FROM orders o JOIN order_items oi ON oi.order_id=o.id WHERE oi.product_id=$1", [scarce])).c === STOCK, `${STOCK} orders exist for the scarce product`);
check((await q("SELECT COALESCE(sum(quantity),0) s FROM order_items WHERE product_id=$1", [scarce])).s === STOCK, `${STOCK} units sold in total`);
check((await q(`SELECT count(*) c FROM orders o WHERE o.user_id = ANY($1) AND (SELECT count(*) FROM order_items WHERE order_id=o.id) <> 2`, [buyers.map((b) => b.id)])).c === 0, "every created order has both of its lines (no partial orders)");
check((await q("SELECT count(*) c FROM orders WHERE user_id = ANY($1)", [buyers.map((b) => b.id)])).c === STOCK, `only ${STOCK} orders were created by the ${BUYERS} buyers`);
check((await q("SELECT count(*) c FROM outbox WHERE event_type=\x27order.placed\x27 AND (payload->>\x27userId\x27)::bigint = ANY($1)", [buyers.map((b) => b.id)])).c === STOCK, `${STOCK} order.placed events in the outbox, none for rejected orders`);
check((await q("SELECT COALESCE(sum(delta),0) s FROM inventory_movements WHERE product_id=$1", [scarce])).s === -STOCK, "inventory movement ledger sums to -" + STOCK);
check((await q("SELECT count(*) c FROM cart_items ci JOIN carts c ON c.id=ci.cart_id WHERE c.user_id = ANY($1)", [buyers.map((b) => b.id)])).c === (BUYERS - STOCK) * 2, "losing buyers keep their carts intact; winners\x27 carts were emptied");

// Clean up: hide the stress products from the storefront.
await pool.query("UPDATE products SET active=false WHERE id = ANY($1)", [[scarce, plenty]]);
await pool.end();
console.log(fails.length ? `\n${fails.length} CHECK(S) FAILED` : "\nALL CHECKS PASSED: overselling did not occur.");
process.exit(fails.length ? 1 : 0);
