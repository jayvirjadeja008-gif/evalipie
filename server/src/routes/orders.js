import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../auth.js";
import { checkout, OutOfStockError } from "../checkout.js";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.post("/", async (req, res) => {
  try { res.status(201).json(await checkout(req.user.id)); }
  catch (e) {
    if (e instanceof OutOfStockError) return res.status(409).json({ error: "out_of_stock", message: "Sorry, one or more items just sold out.", items: e.items });
    if (e.status) return res.status(e.status).json({ error: "checkout_failed", message: e.message });
    throw e;
  }
});

const listSql = `
  SELECT o.id, o.city, o.status, o.total_paise, o.created_at,
         COALESCE(json_agg(json_build_object(\x27productId\x27, oi.product_id, \x27name\x27, oi.name, \x27quantity\x27, oi.quantity, \x27unitPaise\x27, oi.unit_paise) ORDER BY oi.id), \x27[]\x27) AS items
    FROM orders o JOIN order_items oi ON oi.order_id = o.id`;

ordersRouter.get("/", async (req, res) => {
  const { rows } = await query(`${listSql} WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`, [req.user.id]);
  res.json(rows);
});

ordersRouter.get("/:id", async (req, res) => {
  const { rows } = await query(`${listSql} WHERE o.user_id=$1 AND o.id=$2 GROUP BY o.id`, [req.user.id, Number(req.params.id) || 0]);
  if (!rows.length) return res.status(404).json({ error: "Order not found." });
  const n = await query("SELECT message, created_at FROM notifications WHERE order_id=$1", [rows[0].id]);
  res.json({ ...rows[0], confirmation: n.rows[0] || null });
});

ordersRouter.get("/notifications/all", async (req, res) => {
  const { rows } = await query("SELECT id, order_id, message, created_at FROM notifications WHERE user_id=$1 ORDER BY id DESC LIMIT 20", [req.user.id]);
  res.json(rows);
});
