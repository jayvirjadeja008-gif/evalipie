import { Router } from "express";
import { z } from "zod";
import { query, tx } from "../db.js";
import { requireAuth } from "../auth.js";
import { getCategoryFallback } from "../fallbacks.js";

export const cartRouter = Router();
cartRouter.use(requireAuth);

async function getCart(userId, client = { query }) {
  let cart = (await client.query("SELECT id, city FROM carts WHERE user_id=$1", [userId])).rows[0];
  if (!cart) cart = (await client.query("INSERT INTO carts(user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at=now() RETURNING id, city", [userId])).rows[0];
  return cart;
}

async function view(userId) {
  const cart = await getCart(userId);
  const { rows } = await query(
    `SELECT ci.product_id AS "productId", ci.quantity, p.name, p.sku, p.price_paise, p.mrp_paise, p.image_url, p.active,
            COALESCE(i.quantity, 0) AS available
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       LEFT JOIN inventory i ON i.product_id = p.id AND i.city = $2
      WHERE ci.cart_id = $1 ORDER BY ci.product_id`, [cart.id, cart.city]);
  const items = rows.map((r) => {
    const price = r.price_paise / 100;
    const mrpPaise = r.mrp_paise || Math.round(r.price_paise * 1.35);
    const mrp = mrpPaise / 100;
    const discount_percent = Math.max(5, Math.round(((mrp - price) / mrp) * 100));
    return {
      ...r,
      price,
      mrp,
      discount_percent,
      image_url: r.image_url || getCategoryFallback("", r.name, r.sku),
      inStock: r.active && r.available >= r.quantity,
    };
  });
  return { city: cart.city, items, totalPaise: rows.reduce((s, r) => s + r.price_paise * r.quantity, 0), canCheckout: items.length > 0 && items.every((i) => i.inStock) };
}

cartRouter.get("/", async (req, res) => res.json(await view(req.user.id)));

cartRouter.put("/city", async (req, res) => {
  const p = z.object({ city: z.string().min(2) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Choose a city." });
  const cart = await getCart(req.user.id);
  await query("UPDATE carts SET city=$2, updated_at=now() WHERE id=$1", [cart.id, p.data.city]);
  res.json(await view(req.user.id));
});

// Sets an absolute quantity (0 removes). Stock is NOT reserved here; it is enforced atomically at checkout.
cartRouter.put("/items", async (req, res) => {
  const p = z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(0).max(99) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Quantity must be between 0 and 99." });
  const prod = (await query("SELECT id FROM products WHERE id=$1 AND active", [p.data.productId])).rows[0];
  if (!prod) return res.status(404).json({ error: "Product not found." });
  const cart = await getCart(req.user.id);
  if (p.data.quantity === 0) await query("DELETE FROM cart_items WHERE cart_id=$1 AND product_id=$2", [cart.id, p.data.productId]);
  else await query(
    "INSERT INTO cart_items(cart_id, product_id, quantity) VALUES ($1,$2,$3) ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity",
    [cart.id, p.data.productId, p.data.quantity]);
  res.json(await view(req.user.id));
});

cartRouter.delete("/items/:productId", async (req, res) => {
  const cart = await getCart(req.user.id);
  await query("DELETE FROM cart_items WHERE cart_id=$1 AND product_id=$2", [cart.id, Number(req.params.productId)]);
  res.json(await view(req.user.id));
});
