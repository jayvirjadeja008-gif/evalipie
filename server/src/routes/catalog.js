import { Router } from "express";
import { query } from "../db.js";
import { searchProducts, suggest } from "../search.js";
import { productSvg } from "../images.js";
import { getCategoryFallback } from "../fallbacks.js";

export const catalogRouter = Router();

const baseSelect = `
  SELECT p.id, p.sku, p.name, p.brand, p.description, p.color, p.price_paise, p.mrp_paise, p.rating, p.review_count, p.image_url, p.created_at,
         c.slug AS category, c.name AS category_name,
         COALESCE(json_object_agg(i.city, i.quantity) FILTER (WHERE i.city IS NOT NULL), '{}') AS stock
    FROM products p JOIN categories c ON c.id = p.category_id
    LEFT JOIN inventory i ON i.product_id = p.id`;

const shape = (p) => {
  const price = p.price_paise / 100;
  const mrpPaise = p.mrp_paise || Math.round(p.price_paise * 1.35);
  const mrp = mrpPaise / 100;
  const discount_percent = Math.max(5, Math.round(((mrp - price) / mrp) * 100));
  return {
    ...p,
    price,
    mrp,
    mrp_paise: mrpPaise,
    discount_percent,
    color: (p.color || "black").toLowerCase(),
    rating: Number(p.rating || 4.5),
    review_count: Number(p.review_count || 12),
    image_url: p.image_url || getCategoryFallback(p.category, p.name, p.sku),
  };
};

catalogRouter.get("/categories", async (_q, res) => {
  const { rows } = await query(
    `SELECT c.id, c.name, c.slug, count(p.id) FILTER (WHERE p.active) AS products
       FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id ORDER BY c.name`);
  res.json(rows);
});

catalogRouter.get("/cities", async (_q, res) => {
  const { rows } = await query("SELECT DISTINCT city FROM inventory ORDER BY city");
  res.json(rows.map((r) => r.city));
});

// Plain browse list straight from PostgreSQL (authoritative stock). Typed search uses /search.
catalogRouter.get("/products", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.min(48, Number(req.query.size) || 12);
  const params = [];
  let where = "WHERE p.active";
  if (req.query.subcat) {
    const sc = req.query.subcat;
    if (sc === "tops") {
      where += " AND c.slug = 'fashion' AND (p.name ILIKE '%shirt%' OR p.name ILIKE '%polo%' OR p.name ILIKE '%jacket%' OR p.name ILIKE '%hoodie%' OR p.name ILIKE '%blazer%' OR p.name ILIKE '%tee%')";
    } else if (sc === "bottoms") {
      where += " AND c.slug = 'fashion' AND (p.name ILIKE '%jeans%' OR p.name ILIKE '%chinos%' OR p.name ILIKE '%jogger%' OR p.name ILIKE '%trousers%' OR p.name ILIKE '%pants%')";
    } else if (sc === "ethnic") {
      where += " AND c.slug = 'fashion' AND (p.name ILIKE '%kurta%' OR p.name ILIKE '%anarkali%' OR p.name ILIKE '%saree%' OR p.name ILIKE '%dress%' OR p.name ILIKE '%sherwani%')";
    } else if (sc === "shoes") {
      where += " AND c.slug = 'footwear'";
    } else if (sc === "accessories") {
      where += " AND c.slug = 'fashion' AND (p.name ILIKE '%bag%' OR p.name ILIKE '%backpack%' OR p.name ILIKE '%satchel%' OR p.name ILIKE '%tote%' OR p.name ILIKE '%watch%' OR p.name ILIKE '%sunglasses%' OR p.name ILIKE '%belt%')";
    } else if (sc === "watches") {
      where += " AND c.slug = 'fashion' AND (p.name ILIKE '%watch%' OR p.name ILIKE '%chronograph%')";
    } else if (sc === "bags") {
      where += " AND c.slug = 'fashion' AND (p.name ILIKE '%bag%' OR p.name ILIKE '%backpack%' OR p.name ILIKE '%satchel%' OR p.name ILIKE '%tote%')";
    } else if (sc === "western") {
      where += " AND c.slug = 'fashion' AND (p.name ILIKE '%shirt%' OR p.name ILIKE '%jeans%' OR p.name ILIKE '%jacket%' OR p.name ILIKE '%trousers%' OR p.name ILIKE '%tee%' OR p.name ILIKE '%blazer%')";
    } else if (sc === "sportswear") {
      where += " AND (p.name ILIKE '%running%' OR p.name ILIKE '%sport%' OR p.name ILIKE '%athletic%' OR p.name ILIKE '%hoodie%')";
    } else if (["audio", "mobiles", "laptops", "home", "fashion", "footwear"].includes(sc)) {
      where += ` AND c.slug = '${sc}'`;
    }
  }
  if (req.query.category) { params.push(req.query.category); where += ` AND c.slug = $${params.length}`; }
  if (req.query.brand) { params.push(`%${req.query.brand}%`); where += ` AND p.brand ILIKE $${params.length}`; }
  if (req.query.colour) { params.push(req.query.colour.toLowerCase()); where += ` AND LOWER(p.color) = $${params.length}`; }
  if (req.query.deals === "true") { where += ` AND p.mrp_paise >= p.price_paise * 1.25`; }
  const { rows } = await query(`${baseSelect} ${where} GROUP BY p.id, c.id ORDER BY p.name LIMIT ${size} OFFSET ${(page - 1) * size}`, params);
  const total = (await query(`SELECT count(*) FROM products p JOIN categories c ON c.id=p.category_id ${where}`, params)).rows[0].count;
  res.json({ total, items: rows.map(shape) });
});

catalogRouter.get("/products/:id", async (req, res) => {
  const { rows } = await query(`${baseSelect} WHERE p.id = $1 AND p.active GROUP BY p.id, c.id`, [Number(req.params.id) || 0]);
  if (!rows.length) return res.status(404).json({ error: "Product not found." });
  res.json(shape(rows[0]));
});

// OpenSearch-backed. If OpenSearch is down we say so instead of faking results.
const num = (v) => (v === undefined || v === "" ? undefined : Number(v));
catalogRouter.get("/search", async (req, res) => {
  try {
    const r = await searchProducts({
      q: String(req.query.q || "").trim() || undefined,
      category: req.query.category || undefined,
      subcat: req.query.subcat || undefined,
      city: req.query.city || undefined,
      minPrice: num(req.query.minPrice),
      maxPrice: num(req.query.maxPrice),
      sort: req.query.sort,
      page: Math.max(1, Number(req.query.page) || 1),
      size: Math.min(48, Number(req.query.size) || 12),
      deals: req.query.deals === "true",
      brand: req.query.brand || undefined,
      gender: req.query.gender || undefined,
      colour: req.query.colour || undefined,
      discount: num(req.query.discount),
      itemSize: req.query.itemSize || undefined,
    });
    // Ensure all items have shape formatting
    const items = r.items.map((item) => {
      const price = item.price;
      const mrp = item.mrp || Math.round(price * 1.35);
      const discount_percent = item.discount_percent || Math.max(5, Math.round(((mrp - price) / mrp) * 100));
      return {
        ...item,
        mrp,
        discount_percent,
        rating: Number(item.rating || 4.5),
        review_count: Number(item.review_count || 12),
      };
    });
    res.json({ ...r, items });
  } catch (e) {
    console.error("[search]", e.message);
    res.status(503).json({ error: "Search is temporarily unavailable.", detail: e.message });
  }
});

catalogRouter.get("/search/suggest", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json([]);
  try { res.json(await suggest(q)); }
  catch (e) { res.status(503).json({ error: "Suggestions are temporarily unavailable." }); }
});

export const imageRouter = Router();
imageRouter.get("/:sku.svg", async (req, res) => {
  const { rows } = await query("SELECT p.name, c.slug FROM products p JOIN categories c ON c.id=p.category_id WHERE p.sku=$1", [req.params.sku]);
  res.type("image/svg+xml").set("Cache-Control", "public, max-age=86400").send(productSvg(req.params.sku, rows[0]?.slug, rows[0]?.name));
});
