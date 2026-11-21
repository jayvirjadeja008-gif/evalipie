import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../auth.js";
import { getCategoryFallback } from "../fallbacks.js";

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);

wishlistRouter.get("/", async (req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.sku, p.name, p.brand, p.description, p.price_paise, p.mrp_paise, p.rating, p.review_count, p.image_url, p.active,
            c.slug AS category, c.name AS category_name,
            w.created_at AS wishlisted_at,
            COALESCE(json_object_agg(i.city, i.quantity) FILTER (WHERE i.city IS NOT NULL), '{}') AS stock
       FROM wishlists w
       JOIN products p ON p.id = w.product_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN inventory i ON i.product_id = p.id
      WHERE w.user_id = $1
      GROUP BY p.id, c.id, w.created_at
      ORDER BY w.created_at DESC`,
    [req.user.id]
  );

  const items = rows.map((p) => {
    const price = p.price_paise / 100;
    const mrpPaise = p.mrp_paise || Math.round(p.price_paise * 1.35);
    const mrp = mrpPaise / 100;
    const discount_percent = Math.max(5, Math.round(((mrp - price) / mrp) * 100));
    return {
      ...p,
      price,
      mrp,
      discount_percent,
      rating: Number(p.rating || 4.5),
      review_count: Number(p.review_count || 12),
      image_url: p.image_url || getCategoryFallback(p.category, p.name, p.sku),
    };
  });

  res.json(items);
});

wishlistRouter.post("/:productId", async (req, res) => {
  const productId = Number(req.params.productId);
  if (!productId) return res.status(400).json({ error: "Invalid product ID." });

  await query(
    `INSERT INTO wishlists(user_id, product_id) VALUES ($1, $2)
     ON CONFLICT (user_id, product_id) DO NOTHING`,
    [req.user.id, productId]
  );
  res.status(201).json({ ok: true, inWishlist: true, productId });
});

wishlistRouter.delete("/:productId", async (req, res) => {
  const productId = Number(req.params.productId);
  if (!productId) return res.status(400).json({ error: "Invalid product ID." });

  await query(
    `DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2`,
    [req.user.id, productId]
  );
  res.json({ ok: true, inWishlist: false, productId });
});
