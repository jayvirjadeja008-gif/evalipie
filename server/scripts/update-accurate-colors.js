import { query, pool } from "../src/db.js";
import { os, INDEX } from "../src/search.js";
import { buildProductDoc } from "../src/productDoc.js";

// Mapping of product ID to accurate color, matching the 8 filter colors:
// ["blue", "yellow", "tan", "navy", "olive", "crimson", "black", "blush"]
const PRODUCT_COLORS = {
  // Audio
  1: "black",   // Boat Rockerz Earphones (Midnight Black)
  2: "blue",    // Sony WH-CH520 (Sky Blue)
  3: "blue",    // JBL Go 3 (Ocean Blue)
  4: "black",   // Noise Buds VS104 (Carbon Black)
  5: "black",   // Realme Buds T300 (Matte Black)
  6: "black",   // Marshall Emberton II (Black & Brass)
  7: "blue",    // Aurora Pro Earbuds (Aurora Neon Blue)
  8: "black",   // Bose QuietComfort 45 (Triple Black)
  9: "black",   // Sennheiser HD 450BT (Matte Black)
  10: "blush",  // Apple AirPods Pro 2 (Pearl White / Blush)
  11: "black",  // Sony WH-1000XM5 (Obsidian Black)
  12: "black",  // Harman Kardon Aura Studio 4 (Smoky Black)

  // Mobiles
  13: "blue",   // Redmi Note 13 5G (Ocean Blue)
  14: "navy",   // Samsung Galaxy M35 5G (Moonlight Navy)
  15: "olive",  // OnePlus Nord CE4 5G (Celadon Marble / Olive)
  16: "blue",   // iPhone 15 128GB (Pastel Blue)
  17: "blue",   // Google Pixel 8a (Bay Blue)
  18: "navy",   // Moto G45 5G (Navy Marine)
  19: "black",  // Samsung Galaxy S24 Ultra (Titanium Black)
  20: "black",  // iPhone 15 Pro Max (Titanium Black)
  21: "olive",  // OnePlus 12 5G (Emerald Green / Olive)
  22: "black",  // Nothing Phone 2a (Dark Smoke Black)
  23: "blue",   // Vivo V30 Pro 5G (Andaman Blue)
  24: "navy",   // Realme 12 Pro+ 5G (Submarine Navy)

  // Laptops
  25: "black",  // HP 15s Ryzen 5 (Jet Black)
  26: "blue",   // Lenovo IdeaPad Slim 3 (Abyss Blue)
  27: "black",  // ASUS Vivobook 14 OLED (Indie Black)
  28: "navy",   // MacBook Air M2 13-inch (Midnight Navy)
  29: "black",  // Dell Inspiron 15 (Carbon Black)
  30: "black",  // MacBook Pro 14 M3 Pro (Space Black)
  31: "black",  // ASUS ROG Zephyrus G14 (Eclipse Black)
  32: "black",  // Lenovo Legion Slim 5 (Storm Gray / Black)
  33: "blue",   // HP Pavilion Plus 14 OLED (Tranquil Blue)
  34: "black",  // Acer Swift Go 14 AI (Pure Black)
  35: "black",  // Dell XPS 13 Plus (Graphite Black)
  36: "black",  // Microsoft Surface Laptop 5 (Matte Black)

  // Fashion
  37: "blue",   // Allen Solly Cotton Formal Shirt (Sky Blue Formal)
  38: "blue",   // Levis 511 Slim Fit Jeans (Classic Blue Denim)
  39: "olive",  // Fabindia Kurta Cotton (Handblock Olive Green)
  40: "crimson",// Peter England Polo T-Shirt (Crimson Red)
  41: "blush",  // W Women Anarkali Kurta Set (Blush Rose Pink)
  42: "crimson",// Raymond Premium Wool Blazer (Crimson Wine)
  43: "yellow", // Tommy Hilfiger Casual Oxford Shirt (Mustard Yellow)
  44: "black",  // Van Heusen Formal Trousers (Charcoal Black)
  45: "black",  // Fossil Minimalist Chronograph Watch (Matte Black)
  46: "black",  // Ray-Ban Classic Aviator Sunglasses (Gold / Black G-15)
  47: "tan",    // Calvin Klein Leather Reversible Belt (Rich Cognac Tan)
  48: "crimson",// Puma Classic Relaxed Hoodie (Crimson Scarlet)

  // Home & Kitchen
  49: "black",  // Prestige Induction Cooktop (Glossy Black)
  50: "tan",    // Milton Thermosteel Flask 1L (Warm Champagne Tan)
  51: "crimson",// Pigeon Non-Stick Cookware Set (Cherry Crimson)
  52: "black",  // Philips Air Fryer HD9200 (Deep Obsidian Black)
  53: "yellow", // Bajaj Mixer Grinder 750W (Warm Yellow Accent)
  54: "tan",    // Havells Ceiling Fan 1200mm (Antique Brass / Tan)
  55: "blue",   // Dyson V8 Cordless Vacuum Cleaner (Cobalt Blue Wand)
  56: "crimson",// De'Longhi Dedica Espresso Machine (Gloss Crimson Red)
  57: "black",  // Instant Pot Duo 7-in-1 Cooker (Brushed Stainless / Black)
  58: "blush",  // Mi Smart Air Purifier 4 (Blush White)
  59: "black",  // Morphy Richards Microwave 25L (Black Mirror)
  60: "black",  // Lodge Cast Iron Skillet 10.25-inch (Pre-seasoned Black)

  // Footwear
  61: "blue",   // Nike Revolution 7 Running Shoes (Royal Blue & White)
  62: "black",  // Puma Smash V2 Sneakers (Black Leather)
  63: "tan",    // Bata Formal Leather Shoes (Rich Brown Tan Handcrafted Leather)
  64: "navy",   // Adidas Adilette Slides (Navy Blue & White Stripes)
  65: "tan",    // Woodland Trekking Boots (Rugged Brown Tan Nubuck Leather)
  66: "blush",  // Skechers Go Walk Shoes (Soft Blush Mauve)
  67: "crimson",// Nike Air Jordan 1 Low (Crimson Red / White Chicago)
  68: "yellow", // Adidas Ultraboost Light (Solar Yellow & White)
  69: "olive",  // New Balance 574 Core Sneakers (Military Olive Suede)
  70: "tan",    // Clarks Tilden Cap Oxford Shoes (Rich British Tan Leather)
  71: "blue",   // Crocs Classic Unisex Clogs (Cerulean Blue)
  72: "navy",   // ASICS Gel-Kayano 30 Stability (Midnight Navy & Cyan)
};

// Accurate descriptions especially for footwear & boots
const ACCURATE_DESCRIPTIONS = {
  63: "Men's handcrafted genuine rich brown tan formal leather oxford dress shoes with cushioned ergonomic footbed and durable slip-resistant sole.",
  65: "Men's heavy-duty genuine oiled brown tan leather trekking boots with deep lug rubber traction, reinforced stitching, and padded ankle collar.",
  70: "Men's full-grain rich British tan leather oxford shoes with discreet elastic gore panels and OrthoLite Cushion Soft footbed.",
  37: "Men's slim-fit 100% combed cotton formal shirt in crisp sky blue, tailored for business and office essentials.",
  38: "Men's classic slim-fit stretch denim jeans in deep indigo blue, woven with sustainable cottonized hemp fibers.",
  61: "Men's breathable mesh road running shoes in royal blue with shock-absorbing foam midsole and generative traction pattern.",
  71: "Unisex lightweight and buoyant Croslite foam clogs in vibrant cerulean blue with pivoting heel strap."
};

async function main() {
  console.log("[colors] Applying column and accurate color taxonomy...");

  await query("ALTER TABLE products ADD COLUMN IF NOT EXISTS color VARCHAR(40) DEFAULT 'black'");

  for (const [idStr, color] of Object.entries(PRODUCT_COLORS)) {
    const id = Number(idStr);
    const desc = ACCURATE_DESCRIPTIONS[id];
    if (desc) {
      await query("UPDATE products SET color = $1, description = $2 WHERE id = $3", [color, desc, id]);
    } else {
      await query("UPDATE products SET color = $1 WHERE id = $2", [color, id]);
    }
  }

  // Set fallback for any remaining products
  await query("UPDATE products SET color = 'black' WHERE color IS NULL");

  // Print distribution of colors across store
  const dist = await query("SELECT color, count(*) as count FROM products GROUP BY color ORDER BY count DESC");
  console.log("[colors] Accurate Color Distribution across store:");
  for (const r of dist.rows) {
    console.log(`  ${r.color.toUpperCase()}: ${r.count} products`);
  }

  // Re-index all products into OpenSearch
  console.log("[colors] Re-indexing OpenSearch with structured color fields...");
  const { rows: prods } = await query("SELECT id FROM products");
  for (const p of prods) {
    const doc = await buildProductDoc(p.id);
    if (doc) {
      await os.index({ index: INDEX, id: String(p.id), body: doc, refresh: false });
    }
  }
  await os.indices.refresh({ index: INDEX });
  console.log(`[colors] SUCCESS: ${prods.length} documents updated with accurate physical colors.`);

  await pool.end();
}

main().catch((err) => {
  console.error("[colors] Error:", err);
  process.exit(1);
});
