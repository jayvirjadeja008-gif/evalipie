import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { query, pool } from "../src/db.js";
import { os, INDEX } from "../src/search.js";
import { buildProductDoc } from "../src/productDoc.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const jsonPath = path.join(__dirname, "new_products_verified.json");
  const products = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  console.log(`Inserting ${products.length} new white-background products into PostgreSQL...`);

  const cities = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune"];
  let inserted = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const { sku, name, brand, description, category_id, price_paise, mrp_paise, image_url, rating, review_count, color, sizes } = p;

    // Check if exists
    const check = await query("SELECT id FROM products WHERE sku = $1", [sku]);
    let prodId;
    if (check.rows.length > 0) {
      prodId = check.rows[0].id;
      await query(`
        UPDATE products SET 
          name = $1, brand = $2, description = $3, category_id = $4,
          price_paise = $5, mrp_paise = $6, image_url = $7, rating = $8,
          review_count = $9, color = $10, sizes = $11, active = true
        WHERE id = $12
      `, [name, brand, description, category_id, price_paise, mrp_paise, image_url, rating, review_count, color, sizes, prodId]);
    } else {
      const res = await query(`
        INSERT INTO products (sku, name, brand, description, category_id, price_paise, mrp_paise, image_url, rating, review_count, color, sizes, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
        RETURNING id
      `, [sku, name, brand, description, category_id, price_paise, mrp_paise, image_url, rating, review_count, color, sizes]);
      prodId = res.rows[0].id;
    }

    // Insert inventory across all 6 cities
    for (let c = 0; c < cities.length; c++) {
      const qty = 20 + ((i * 7 + c * 5) % 25);
      await query(`
        INSERT INTO inventory (product_id, city, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (product_id, city) DO UPDATE SET quantity = EXCLUDED.quantity
      `, [prodId, cities[c], qty]);
    }

    // Index into OpenSearch
    const doc = await buildProductDoc(prodId);
    if (doc) {
      await os.index({ index: INDEX, id: String(doc.id), body: doc });
    }

    inserted++;
    console.log(`[${inserted}/${products.length}] ${sku}: Committed to DB & OpenSearch -> ${name}`);
  }

  await os.indices.refresh({ index: INDEX });
  console.log(`\nSuccessfully populated and indexed ${inserted} products in OpenSearch!`);

  const countRes = await query("SELECT count(*) FROM products WHERE active = true");
  console.log(`Total Active Products in Database: ${countRes.rows[0].count}`);

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error inserting products:", err);
  process.exit(1);
});
