import urllib.request
import urllib.parse
import json
import re
import time
import os
import ssl
import sys

# Disable SSL verification issues if any host has strict cert chains
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
}

def get_vqd(q):
    try:
        t_url = f"https://duckduckgo.com/?q={urllib.parse.quote(q)}"
        req = urllib.request.Request(t_url, headers=HEADERS)
        html = urllib.request.urlopen(req, timeout=6, context=ctx).read().decode("utf-8")
        m = re.search(r"vqd=([0-9-]+)", html) or re.search(r"vqd=\"([0-9-]+)\"", html)
        return m.group(1) if m else None
    except Exception as e:
        return None

def search_and_download(sku, query, out_path):
    if os.path.exists(out_path) and os.path.getsize(out_path) > 8000:
        return True, "already exists"

    vqd = get_vqd(query)
    if not vqd:
        # Retry with simpler query
        vqd = get_vqd(query.split()[0] + " " + query.split()[1])
    if not vqd:
        return False, "no vqd"

    api_url = f"https://duckduckgo.com/i.js?l=us-en&o=json&q={urllib.parse.quote(query)}&vqd={vqd}&f=,,,&p=1"
    try:
        api_req = urllib.request.Request(api_url, headers=HEADERS)
        res = urllib.request.urlopen(api_req, timeout=8, context=ctx).read().decode("utf-8")
        data = json.loads(res)
        results = data.get("results", [])
        for r in results[:8]:
            img_url = r.get("image")
            if not img_url:
                continue
            # avoid svg or tiny thumbnails
            if ".svg" in img_url.lower():
                continue
            try:
                img_req = urllib.request.Request(img_url, headers=HEADERS)
                img_data = urllib.request.urlopen(img_req, timeout=8, context=ctx).read()
                if len(img_data) >= 8000:
                    with open(out_path, "wb") as f:
                        f.write(img_data)
                    return True, f"downloaded ({len(img_data)} bytes) from {img_url[:50]}"
            except Exception:
                continue
    except Exception as e:
        return False, str(e)
    return False, "no valid image found"

def main():
    target_dir = "stocksync/web/public/products"
    dist_dir = "stocksync/web/dist/products"
    os.makedirs(target_dir, exist_ok=True)
    os.makedirs(dist_dir, exist_ok=True)

    # Read products from seed-complete-catalog.js or direct list
    with open("stocksync/server/scripts/seed-complete-catalog.js", "r", encoding="utf-8") as f:
        content = f.read()

    # Extract ALL_PRODUCTS array
    match = re.search(r"const ALL_PRODUCTS = \[(.*?)\];\s*async function", content, re.DOTALL)
    if not match:
        print("Could not find ALL_PRODUCTS in seed script")
        sys.exit(1)

    raw_products = match.group(1)
    # Parse individual product entries: [ "AUD-001", "name", "brand", "cat", price, mrp, "color", "sizes", "desc", "img" ]
    items = re.findall(r'\[\s*"([A-Z]+-\d+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*(\d+),\s*(\d+),\s*"([^"]+)"', raw_products)

    print(f"Found {len(items)} products to verify and download exact real photos for.\n")

    success_count = 0
    fail_count = 0

    for idx, (sku, name, brand, cat, price, mrp, color) in enumerate(items, 1):
        out_file = os.path.join(target_dir, f"{sku}.jpg")
        
        # Build ultra-targeted query
        clean_name = re.sub(r"\s+", " ", name).strip()
        # Avoid redundant words
        q = f"{clean_name} {color} official product photo"
        
        ok, msg = search_and_download(sku, q, out_file)
        if not ok:
            # Fallback query with brand + name
            q2 = f"{brand} {clean_name} product photo"
            ok, msg = search_and_download(sku, q2, out_file)

        if ok:
            success_count += 1
            print(f"[{idx}/{len(items)}] PASS {sku}: {clean_name[:40]} -> {msg}")
            # Also copy to dist
            dist_file = os.path.join(dist_dir, f"{sku}.jpg")
            if os.path.exists(out_file):
                with open(out_file, "rb") as sf, open(dist_file, "wb") as df:
                    df.write(sf.read())
        else:
            fail_count += 1
            print(f"[{idx}/{len(items)}] FAIL {sku}: {clean_name[:40]} -> {msg}")

        # Gentle pause to avoid aggressive throttling
        time.sleep(0.35)

    print(f"\nFinished image acquisition: {success_count} succeeded, {fail_count} failed out of {len(items)}.")

if __name__ == "__main__":
    main()
