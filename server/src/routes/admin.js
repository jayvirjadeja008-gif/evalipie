import { Router } from "express";
import { z } from "zod";
import { query, tx, emit } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";
import { topics } from "../config.js";
import { kafkaHealth } from "../kafka.js";
import { searchHealth } from "../search.js";
import { getCategoryFallback } from "../fallbacks.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const productBody = z.object({
  sku: z.string().min(2).max(40), name: z.string().min(2).max(160), brand: z.string().max(80).default(""),
  description: z.string().max(2000).default(""), categoryId: z.number().int().positive(),
  price: z.number().min(0).max(10000000), imageUrl: z.string().url().nullable().optional(),
});

adminRouter.get("/products", async (_q, res) => {
  const { rows } = await query(
    `SELECT p.id, p.sku, p.name, p.brand, p.description, p.price_paise, p.image_url, p.active, p.category_id, c.name AS category_name,
            COALESCE(sum(i.quantity),0) AS total_stock
       FROM products p JOIN categories c ON c.id=p.category_id LEFT JOIN inventory i ON i.product_id=p.id
      GROUP BY p.id, c.id ORDER BY p.active DESC, p.name`);
  res.json(rows.map((p) => ({ ...p, price: p.price_paise / 100, image_url: p.image_url || getCategoryFallback(p.category_name, p.name, p.sku) })));
});

adminRouter.post("/products", async (req, res) => {
  const p = productBody.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Check the product fields.", issues: p.error.issues });
  try {
    const out = await tx(async (c) => {
      const r = await c.query(
        "INSERT INTO products(sku,name,brand,description,category_id,price_paise,image_url) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
        [p.data.sku, p.data.name, p.data.brand, p.data.description, p.data.categoryId, Math.round(p.data.price * 100), p.data.imageUrl ?? null]);
      await emit(c, topics.products, r.rows[0].id, "product.changed", { productId: r.rows[0].id, change: "created" });
      return r.rows[0];
    });
    res.status(201).json(out);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "That SKU is already in use." });
    if (e.code === "23503") return res.status(400).json({ error: "Choose a valid category." });
    throw e;
  }
});

adminRouter.put("/products/:id", async (req, res) => {
  const p = productBody.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Check the product fields.", issues: p.error.issues });
  const id = Number(req.params.id);
  try {
    const n = await tx(async (c) => {
      const r = await c.query(
        `UPDATE products SET sku=$2,name=$3,brand=$4,description=$5,category_id=$6,price_paise=$7,image_url=$8,updated_at=now() WHERE id=$1`,
        [id, p.data.sku, p.data.name, p.data.brand, p.data.description, p.data.categoryId, Math.round(p.data.price * 100), p.data.imageUrl ?? null]);
      if (r.rowCount) await emit(c, topics.products, id, "product.changed", { productId: id, change: "updated" });
      return r.rowCount;
    });
    if (!n) return res.status(404).json({ error: "Product not found." });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "That SKU is already in use." });
    throw e;
  }
});

// "Remove" deactivates (keeps order history intact). It is dropped from search via the Kafka consumer.
adminRouter.delete("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const n = await tx(async (c) => {
    const r = await c.query("UPDATE products SET active=false, updated_at=now() WHERE id=$1 AND active", [id]);
    if (r.rowCount) await emit(c, topics.products, id, "product.changed", { productId: id, change: "removed" });
    return r.rowCount;
  });
  if (!n) return res.status(404).json({ error: "Product not found or already removed." });
  res.json({ ok: true });
});

adminRouter.post("/products/:id/restore", async (req, res) => {
  const id = Number(req.params.id);
  await tx(async (c) => {
    await c.query("UPDATE products SET active=true, updated_at=now() WHERE id=$1", [id]);
    await emit(c, topics.products, id, "product.changed", { productId: id, change: "restored" });
  });
  res.json({ ok: true });
});

adminRouter.post("/categories", async (req, res) => {
  const p = z.object({ name: z.string().min(2).max(60) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Enter a category name." });
  try {
    const { rows } = await query("INSERT INTO categories(name, slug) VALUES ($1,$2) RETURNING *", [p.data.name, slugify(p.data.name)]);
    res.status(201).json(rows[0]);
  } catch (e) { if (e.code === "23505") return res.status(409).json({ error: "That category already exists." }); throw e; }
});

adminRouter.put("/categories/:id", async (req, res) => {
  const p = z.object({ name: z.string().min(2).max(60) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Enter a category name." });
  await tx(async (c) => {
    await c.query("UPDATE categories SET name=$2, slug=$3 WHERE id=$1", [Number(req.params.id), p.data.name, slugify(p.data.name)]);
    const ps = await c.query("SELECT id FROM products WHERE category_id=$1", [Number(req.params.id)]);
    for (const r of ps.rows) await emit(c, topics.products, r.id, "product.changed", { productId: r.id, change: "category_renamed" });
  });
  res.json({ ok: true });
});

adminRouter.get("/inventory", async (req, res) => {
  const { rows } = await query(
    `SELECT i.product_id AS "productId", p.name, p.sku, i.city, i.quantity, i.updated_at
       FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.active
      ${req.query.lowOnly ? "AND i.quantity <= 10" : ""} ORDER BY i.quantity ASC, p.name, i.city LIMIT 500`);
  res.json(rows);
});

// Set absolute stock for a product in a city (creates the row if new).
adminRouter.put("/inventory", async (req, res) => {
  const p = z.object({ productId: z.number().int().positive(), city: z.string().min(2), quantity: z.number().int().min(0).max(1000000) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Enter a city and a quantity of 0 or more." });
  const out = await tx(async (c) => {
    const prev = (await c.query("SELECT quantity FROM inventory WHERE product_id=$1 AND city=$2 FOR UPDATE", [p.data.productId, p.data.city])).rows[0];
    await c.query(
      `INSERT INTO inventory(product_id, city, quantity) VALUES ($1,$2,$3)
       ON CONFLICT (product_id, city) DO UPDATE SET quantity=EXCLUDED.quantity, updated_at=now()`, [p.data.productId, p.data.city, p.data.quantity]);
    const delta = p.data.quantity - (prev?.quantity ?? 0);
    await c.query("INSERT INTO inventory_movements(product_id, city, delta, quantity_after, reason, actor_id) VALUES ($1,$2,$3,$4,\x27admin_adjustment\x27,$5)",
      [p.data.productId, p.data.city, delta, p.data.quantity, req.user.id]);
    await emit(c, topics.inventory, p.data.productId, "inventory.changed",
      { productId: p.data.productId, city: p.data.city, delta, quantityAfter: p.data.quantity, reason: "admin_adjustment" });
    return { delta };
  });
  res.json(out);
});

adminRouter.get("/inventory/movements", async (_q, res) => {
  const { rows } = await query(
    `SELECT m.id, m.product_id AS "productId", p.name, m.city, m.delta, m.quantity_after AS "quantityAfter", m.reason, m.order_id AS "orderId", m.created_at
       FROM inventory_movements m JOIN products p ON p.id=m.product_id ORDER BY m.id DESC LIMIT 100`);
  res.json(rows);
});

adminRouter.get("/orders", async (req, res) => {
  const { rows } = await query(
    `SELECT o.id, o.city, o.status, o.total_paise, o.created_at, u.name AS customer, u.email,
            COALESCE(json_agg(json_build_object(\x27name\x27, oi.name, \x27quantity\x27, oi.quantity) ORDER BY oi.id), \x27[]\x27) AS items
       FROM orders o JOIN users u ON u.id=o.user_id JOIN order_items oi ON oi.order_id=o.id
      ${req.query.status ? "WHERE o.status = $1" : ""} GROUP BY o.id, u.id ORDER BY o.id DESC LIMIT 100`,
    req.query.status ? [req.query.status] : []);
  res.json(rows);
});

adminRouter.put("/orders/:id/status", async (req, res) => {
  const p = z.object({ status: z.enum(["confirmed", "shipped", "delivered", "cancelled"]) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid status." });
  const id = Number(req.params.id);
  try {
    const out = await tx(async (c) => {
      const o = (await c.query("SELECT id, city, status FROM orders WHERE id=$1 FOR UPDATE", [id])).rows[0];
      if (!o) return null;
      if (o.status === "cancelled") throw Object.assign(new Error("Cancelled orders cannot change."), { status: 409 });
      await c.query("UPDATE orders SET status=$2, updated_at=now() WHERE id=$1", [id, p.data.status]);
      if (p.data.status === "cancelled") { // return stock, atomically, in the same transaction
        const items = (await c.query("SELECT product_id, quantity FROM order_items WHERE order_id=$1 ORDER BY product_id", [id])).rows;
        for (const it of items) {
          const r = await c.query("UPDATE inventory SET quantity=quantity+$3, updated_at=now() WHERE product_id=$1 AND city=$2 RETURNING quantity", [it.product_id, o.city, it.quantity]);
          await c.query("INSERT INTO inventory_movements(product_id, city, delta, quantity_after, reason, order_id, actor_id) VALUES ($1,$2,$3,$4,\x27restock\x27,$5,$6)",
            [it.product_id, o.city, it.quantity, r.rows[0].quantity, id, req.user.id]);
          await emit(c, topics.inventory, it.product_id, "inventory.changed",
            { productId: it.product_id, city: o.city, delta: it.quantity, quantityAfter: r.rows[0].quantity, reason: "order_cancelled", orderId: id });
        }
      }
      await emit(c, topics.orders, id, "order.status_changed", { orderId: id, status: p.data.status });
      return { ok: true };
    });
    if (!out) return res.status(404).json({ error: "Order not found." });
    res.json(out);
  } catch (e) { if (e.status) return res.status(e.status).json({ error: e.message }); throw e; }
});

adminRouter.get("/stats", async (_q, res) => {
  const [totals, daily, top, status, alerts, outbox] = await Promise.all([
    query(`SELECT count(*) FILTER (WHERE status<>\x27cancelled\x27) AS orders, COALESCE(sum(total_paise) FILTER (WHERE status<>\x27cancelled\x27),0) AS revenue_paise FROM orders`),
    query(`SELECT day::text, sum(orders) AS orders, sum(revenue_paise) AS revenue_paise, sum(units) AS units FROM order_stats GROUP BY day ORDER BY day DESC LIMIT 14`),
    query(`SELECT oi.name, sum(oi.quantity) AS units FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status<>\x27cancelled\x27 GROUP BY oi.name ORDER BY units DESC LIMIT 5`),
    query(`SELECT status, count(*) FROM orders GROUP BY status`),
    query(`SELECT count(*) FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.active AND i.quantity <= 10`),
    query(`SELECT count(*) FILTER (WHERE published_at IS NULL) AS pending, count(*) AS total FROM outbox`),
  ]);
  const byCity = await query(`SELECT city, sum(orders) AS orders, sum(revenue_paise) AS revenue_paise FROM order_stats GROUP BY city ORDER BY revenue_paise DESC`);
  res.json({
    orders: totals.rows[0].orders, revenuePaise: totals.rows[0].revenue_paise,
    daily: daily.rows.reverse(), topProducts: top.rows, byStatus: status.rows, byCity: byCity.rows,
    lowStock: alerts.rows[0].count, outbox: outbox.rows[0],
  });
});

adminRouter.get("/events", async (_q, res) => {
  const [outbox, processed] = await Promise.all([
    query("SELECT id, topic, event_key AS key, event_type AS type, payload, created_at, published_at, attempts, last_error FROM outbox ORDER BY id DESC LIMIT 60"),
    query("SELECT consumer, event_id AS \"eventId\", topic, event_type AS type, processed_at FROM processed_events ORDER BY processed_at DESC, event_id DESC LIMIT 80"),
  ]);
  const perConsumer = await query("SELECT consumer, count(*) AS processed, max(event_id) AS last_event FROM processed_events GROUP BY consumer");
  res.json({ outbox: outbox.rows, processed: processed.rows, perConsumer: perConsumer.rows });
});

adminRouter.get("/alerts", async (_q, res) => {
  const { rows } = await query(
    `SELECT a.id, p.name, a.city, a.quantity, a.level, a.created_at FROM stock_alerts a JOIN products p ON p.id=a.product_id ORDER BY a.id DESC LIMIT 30`);
  res.json(rows);
});

adminRouter.get("/health", async (_q, res) => {
  const [k, s, pg] = await Promise.all([kafkaHealth(), searchHealth(), query("SELECT now()").then(() => ({ ok: true })).catch((e) => ({ ok: false, error: e.message }))]);
  res.json({ postgres: pg, kafka: k, opensearch: s });
});

// Re-publish every active product through Kafka so the consumer rebuilds the index.
adminRouter.post("/reindex", async (_q, res) => {
  const n = await tx(async (c) => {
    const { rows } = await c.query("SELECT id FROM products WHERE active ORDER BY id");
    for (const r of rows) await emit(c, topics.products, r.id, "product.changed", { productId: r.id, change: "reindex" });
    return rows.length;
  });
  res.json({ queued: n });
});
