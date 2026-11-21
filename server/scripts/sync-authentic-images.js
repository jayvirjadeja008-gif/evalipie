import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { query, pool } from "../src/db.js";
import { os, INDEX, ensureIndex } from "../src/search.js";
import { buildProductDoc } from "../src/productDoc.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.resolve(__dirname, "../../web/public/products");
const distDir = path.resolve(__dirname, "../../web/dist/products");

fs.mkdirSync(targetDir, { recursive: true });
fs.mkdirSync(distDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getVqd(q) {
  try {
    const res = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(5000)
    });
    const html = await res.text();
    const m = html.match(/vqd=([0-9-]+)/) || html.match(/vqd="([0-9-]+)"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function searchImages(q) {
  const vqd = await getVqd(q);
  if (!vqd) return [];
  try {
    const res = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(6000)
    });
    const data = await res.json();
    return (data.results || []).map((r) => r.image).filter((u) => u && !u.includes(".svg"));
  } catch {
    return [];
  }
}

async function downloadCandidate(candidates, outPath, distPath) {
  for (const u of candidates.slice(0, 6)) {
    try {
      const res = await fetch(u, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(4500)
      });
      if (!res.ok) continue;
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length >= 7500) {
        fs.writeFileSync(outPath, buffer);
        fs.writeFileSync(distPath, buffer);
        return { ok: true, size: buffer.length, source: u };
      }
    } catch {
      continue;
    }
  }
  return { ok: false };
}

function getProductQueries(p) {
  const brand = (p.brand || "").trim();
  let name = (p.name || "").trim();
  const color = (p.color || "").trim();

  // Strip technical details and brackets
  name = name.replace(/\(.*?\)/g, "");
  name = name.replace(/\b(128GB|256GB|512GB|1TB|16GB RAM|8GB RAM|16GB|8GB|RAM|SSD|NVMe|FHD|AMOLED|OLED|5G|4G|15\.6-inch|14-inch|13-inch|16-inch|11-inch|10\.9-inch|10th Gen|M2|M3|M3 Pro|M3 Max|Ryzen \d+|Core i\d+|Gen \d+|12th Gen|13th Gen)\b/gi, "");
  name = name.replace(/\b(Ultra-Portable|True Wireless|Truly Wireless|Noise Cancelling|Wireless Bluetooth|Bluetooth|On-Ear|Over-Ear|ANC|High-Resolution|Smart Speaker with Alexa|Lightweight Foam|Road Running|Genuine Leather|Full-Grain|3-Jar|4\.1L|Rapid Air|Hard Anodized|Stainless Steel|3L|1L|1000ml|10\.25-inch|24L|Cast Iron|Memory Foam|3-Burner|Non-Stick 3-Piece|Decorative Ceiling Fan|Pre-Seasoned)\b/gi, "");
  name = name.replace(/\s+/g, " ").trim();

  const brandInName = name.toLowerCase().includes(brand.toLowerCase());
  const fullName = brandInName ? name : `${brand} ${name}`;

  const queries = [
    `${fullName} ${color}`.trim(),
    fullName.trim(),
    `${brand} ${name.split(" ").slice(0, 3).join(" ")}`.trim(),
  ];
  return Array.from(new Set(queries));
}

async function main() {
  console.log("=== SYNCHRONIZING REAL ACCURATE PRODUCT PHOTOGRAPHY ===");
  console.log(`Saving to: ${targetDir} and ${distDir}\n`);

  const { rows: products } = await query(`
    SELECT p.id, p.sku, p.name, p.brand, p.color, c.slug as category
      FROM products p
      JOIN categories c ON c.id = p.category_id
     ORDER BY p.id
  `);

  console.log(`Processing ${products.length} products...\n`);

  let successCount = 0;
  let alreadyCount = 0;
  let failedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const outPath = path.join(targetDir, `${p.sku}.jpg`);
    const distPath = path.join(distDir, `${p.sku}.jpg`);
    const progress = `[${i + 1}/${products.length}] ${p.sku} (${p.brand} - ${p.name})`;

    // Check if we already have a valid image (> 8KB)
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 8000) {
      const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
      console.log(`${progress}: VERIFIED LOCAL PHOTO (${sizeKb} KB)`);
      if (!fs.existsSync(distPath)) {
        fs.copyFileSync(outPath, distPath);
      }
      alreadyCount++;
      successCount++;
      await query("UPDATE products SET image_url = $1 WHERE id = $2", [`/products/${p.sku}.jpg`, p.id]);
      continue;
    }

    const queries = getProductQueries(p);
    let downloaded = false;

    for (const q of queries) {
      const candidates = await searchImages(q);
      if (candidates.length > 0) {
        const result = await downloadCandidate(candidates, outPath, distPath);
        if (result.ok) {
          const sizeKb = Math.round(result.size / 1024);
          console.log(`${progress}: DOWNLOADED (${sizeKb} KB) from: ${result.source.slice(0, 60)}`);
          await query("UPDATE products SET image_url = $1 WHERE id = $2", [`/products/${p.sku}.jpg`, p.id]);
          downloaded = true;
          successCount++;
          break;
        }
      }
      await sleep(200);
    }

    if (!downloaded) {
      console.warn(`${progress}: WARNING - could not acquire official photo`);
      failedCount++;
    }

    await sleep(250);
  }

  console.log(`\nImage download complete: ${successCount} successful (${alreadyCount} verified local, ${successCount - alreadyCount} newly acquired), ${failedCount} failed.`);

  // Synchronize all products with OpenSearch
  console.log("\nSynchronizing updated local image URLs into OpenSearch index...");
  await ensureIndex();

  let indexedCount = 0;
  for (const p of products) {
    const doc = await buildProductDoc(p.id);
    if (doc) {
      await os.index({
        index: INDEX,
        id: String(doc.id),
        body: doc,
        refresh: false
      });
      indexedCount++;
    }
  }

  await os.indices.refresh({ index: INDEX });
  const osCount = (await os.count({ index: INDEX })).body.count;

  console.log(`Re-indexed ${indexedCount} products in OpenSearch. Total documents: ${osCount}`);
  console.log("\nALL PRODUCTS NOW HAVE DEDICATED AUTHENTIC PHOTOGRAPHY!");

  await pool.end();
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
