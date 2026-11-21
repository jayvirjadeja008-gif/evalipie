import { query } from "./db.js";
import { getCategoryFallback } from "./fallbacks.js";

// Build the OpenSearch document for a product from PostgreSQL (the source of truth).
export async function buildProductDoc(productId) {
  const { rows } = await query(
    `SELECT p.id, p.sku, p.name, p.brand, p.description, p.color, p.sizes, p.price_paise, p.mrp_paise, p.rating, p.review_count, p.image_url, p.active, p.created_at,
            c.slug AS category, c.name AS category_name,
            COALESCE(json_object_agg(i.city, i.quantity) FILTER (WHERE i.city IS NOT NULL), '{}') AS stock
       FROM products p JOIN categories c ON c.id = p.category_id
        LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.id = $1 GROUP BY p.id, c.id`, [productId]);
  if (!rows.length) return null;
  const p = rows[0];
  if (!p.active) return null;
  const stock = p.stock;
  const price = p.price_paise / 100;
  const mrpPaise = p.mrp_paise || Math.round(p.price_paise * 1.35);
  const mrp = mrpPaise / 100;
  const discount_percent = Math.max(5, Math.round(((mrp - price) / mrp) * 100));

  return {
    id: p.id, sku: p.sku, name: p.name, brand: p.brand, description: p.description,
    color: (p.color || "black").toLowerCase(),
    colour: (p.color || "black").toLowerCase(),
    sizes: p.sizes || "S, M, L, XL, Free",
    category: p.category, category_name: p.category_name,
    price,
    mrp,
    mrp_paise: mrpPaise,
    discount_percent,
    rating: Number(p.rating || 4.5),
    review_count: Number(p.review_count || 12),
    cities: Object.entries(stock).filter(([, q]) => q > 0).map(([c]) => c),
    stock, total_stock: Object.values(stock).reduce((a, b) => a + b, 0),
    image_url: p.image_url || getCategoryFallback(p.category, p.name, p.sku),
    created_at: p.created_at,
  };
}
