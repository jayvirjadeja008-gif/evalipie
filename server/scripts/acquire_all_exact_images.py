import urllib.request
import urllib.parse
import json
import re
import time
import os
import ssl
import sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
}

def get_vqd(q):
    try:
        t_url = f"https://duckduckgo.com/?q={urllib.parse.quote(q)}"
        req = urllib.request.Request(t_url, headers=HEADERS)
        html = urllib.request.urlopen(req, timeout=7, context=ctx).read().decode("utf-8")
        m = re.search(r"vqd=([0-9-]+)", html) or re.search(r"vqd=\"([0-9-]+)\"", html)
        return m.group(1) if m else None
    except Exception:
        return None

def search_ddg(q):
    vqd = get_vqd(q)
    if not vqd:
        return []
    api_url = f"https://duckduckgo.com/i.js?l=us-en&o=json&q={urllib.parse.quote(q)}&vqd={vqd}&f=,,,"
    try:
        req = urllib.request.Request(api_url, headers=HEADERS)
        res = urllib.request.urlopen(req, timeout=7, context=ctx).read().decode("utf-8")
        data = json.loads(res)
        return [r["image"] for r in data.get("results", []) if r.get("image") and not r["image"].endswith(".svg")]
    except Exception:
        return []

def search_wikimedia(q):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(q)}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url&format=json"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "StockSync/1.0 (dev@stocksync.in)"})
        res = urllib.request.urlopen(req, timeout=7, context=ctx).read().decode("utf-8")
        data = json.loads(res)
        pages = data.get("query", {}).get("pages", {}).values()
        urls = []
        for p in pages:
            info = p.get("imageinfo", [{}])[0].get("url")
            if info and not info.endswith(".svg"):
                urls.append(info)
        return urls
    except Exception:
        return []

def download_candidate(urls, out_file):
    for u in urls[:5]:
        try:
            req = urllib.request.Request(u, headers=HEADERS)
            data = urllib.request.urlopen(req, timeout=6, context=ctx).read()
            if len(data) >= 7000:
                with open(out_file, "wb") as f:
                    f.write(data)
                return True, len(data), u
        except Exception:
            continue
    return False, 0, ""

def simplify_query(name, brand, color):
    n = name
    n = re.sub(r"\(.*?\)", "", n)
    # Remove spec fluff
    n = re.sub(r"\b(128GB|256GB|512GB|1TB|16GB RAM|8GB RAM|16GB|8GB|RAM|SSD|NVMe|FHD|AMOLED|OLED|5G|4G|15\.6-inch|14-inch|13-inch|16-inch|11-inch|10\.9-inch|10th Gen|M2|M3|M3 Pro|M3 Max|Ryzen \d+|Core i\d+|Gen \d+|12th Gen|13th Gen)\b", "", n, flags=re.I)
    n = re.sub(r"\b(Ultra-Portable|True Wireless|Truly Wireless|Noise Cancelling|Wireless Bluetooth|Bluetooth|On-Ear|Over-Ear|ANC|High-Resolution|Smart Speaker with Alexa|Lightweight Foam|Road Running|Genuine Leather|Full-Grain|3-Jar|4\.1L|Rapid Air|Hard Anodized|Stainless Steel|3L|1L|1000ml|10\.25-inch|24L|Cast Iron|Memory Foam|3-Burner|Non-Stick 3-Piece|Decorative Ceiling Fan|Pre-Seasoned)\b", "", n, flags=re.I)
    # Replace marketing colors with standard color names
    n = re.sub(r"\b(Moonlight Navy|Celadon Marble|Pastel Blue|Bay Blue|Navy Marine|Titanium Black|Natural Titanium Tan|Emerald Green|Dark Smoke Black|Andaman Blue|Submarine Navy|Space Grey|Mint Olive|Sunset Crimson|Emerald Dusk|Racing Yellow|Sunshine Yellow|Black Beauty|Mist Blue|Ice Blue|Fluid Blush|Nimbus Navy|Jet Black|Abyss Blue|Indie Black|Midnight Navy|Carbon Black|Space Black|Eclipse Black|Storm Black|Tranquil Blue|Graphite Black|Matte Black|Starlight Blush|Performance Crimson|Ponder Navy|Moonstone Tan|Soft Blush|Dark Metallic|Cosmic Blue|Crimson Accent Black|Mecha Olive|Steel Navy|Onyx Black)\b", "", n, flags=re.I)
    n = re.sub(r"\s+", " ", n).strip()

    brand_in_name = brand.lower() in n.lower()
    full = n if brand_in_name else f"{brand} {n}"

    c = color.strip()
    if c and c.lower() not in full.lower():
        return f"{full} {c}".strip()
    return full.strip()

def main():
    target_dir = "stocksync/web/public/products"
    dist_dir = "stocksync/web/dist/products"
    os.makedirs(target_dir, exist_ok=True)
    os.makedirs(dist_dir, exist_ok=True)

    with open("stocksync/server/scripts/seed-complete-catalog.js", "r", encoding="utf-8") as f:
        content = f.read()

    match = re.search(r"const ALL_PRODUCTS = \[(.*?)\];\s*async function", content, re.DOTALL)
    if not match:
        print("Could not find ALL_PRODUCTS")
        sys.exit(1)

    raw_products = match.group(1)
    items = re.findall(r'\[\s*"([A-Z]+-\d+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*(\d+),\s*(\d+),\s*"([^"]+)"', raw_products)

    print(f"Loaded {len(items)} products to acquire authentic original images for.\n")

    succeeded = 0
    already = 0
    failed = 0

    for idx, (sku, name, brand, cat, price, mrp, color) in enumerate(items, 1):
        out_file = os.path.join(target_dir, f"{sku}.jpg")
        dist_file = os.path.join(dist_dir, f"{sku}.jpg")

        # Check existing
        if os.path.exists(out_file) and os.path.getsize(out_file) > 8000:
            size_kb = round(os.path.getsize(out_file) / 1024)
            print(f"[{idx}/{len(items)}] {sku} ({brand} {name[:30]}): ALREADY EXISTS ({size_kb} KB)")
            if not os.path.exists(dist_file):
                with open(out_file, "rb") as sf, open(dist_file, "wb") as df:
                    df.write(sf.read())
            already += 1
            succeeded += 1
            continue

        q1 = simplify_query(name, brand, color)
        q2 = f"{brand} {name.split()[0]} {name.split()[1] if len(name.split()) > 1 else ''}"

        candidates = search_ddg(q1)
        if not candidates:
            time.sleep(0.5)
            candidates = search_ddg(q2)
        if not candidates:
            # Fallback to Wikimedia Commons
            candidates = search_wikimedia(f"{brand} {name.split()[0]}")

        ok, size, src = download_candidate(candidates, out_file)
        if ok:
            size_kb = round(size / 1024)
            print(f"[{idx}/{len(items)}] {sku} ({brand} {name[:30]}): DOWNLOADED ({size_kb} KB) -> {src[:50]}")
            with open(out_file, "rb") as sf, open(dist_file, "wb") as df:
                df.write(sf.read())
            succeeded += 1
        else:
            print(f"[{idx}/{len(items)}] {sku} ({brand} {name[:30]}): FAILED (q: '{q1}')")
            failed += 1

        # 1.2s delay to prevent DDG rate limits
        time.sleep(1.2)

    print(f"\n========================================================")
    print(f"IMAGE ACQUISITION REPORT:")
    print(f"- Total:     {len(items)}")
    print(f"- Succeeded: {succeeded} ({already} pre-existing, {succeeded - already} newly downloaded)")
    print(f"- Failed:    {failed}")
    print(f"========================================================\n")

if __name__ == "__main__":
    main()
