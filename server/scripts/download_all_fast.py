import urllib.request
import urllib.parse
import re
import time
import os
import ssl
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys

sys.path.insert(0, os.path.dirname(__file__))
from acquire_all_exact_images_bing import PRODUCT_QUERIES

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
}

def search_bing(q):
    url = f"https://www.bing.com/images/search?q={urllib.parse.quote(q)}&form=HDRSC2&first=1"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        html = urllib.request.urlopen(req, timeout=8, context=ctx).read().decode("utf-8")
        imgs = re.findall(r"murl&quot;:&quot;(https:[^&]+)&quot;", html)
        return [u for u in imgs if not u.endswith(".svg")]
    except Exception:
        return []

def download_candidate(urls, out_file):
    for u in urls[:5]:
        try:
            req = urllib.request.Request(u, headers=HEADERS)
            data = urllib.request.urlopen(req, timeout=7, context=ctx).read()
            if len(data) >= 7500:
                with open(out_file, "wb") as f:
                    f.write(data)
                return True, len(data), u
        except Exception:
            continue
    return False, 0, ""

def process_product(sku, query_str, target_dir, dist_dir):
    out_file = os.path.join(target_dir, f"{sku}.jpg")
    dist_file = os.path.join(dist_dir, f"{sku}.jpg")

    if os.path.exists(out_file) and os.path.getsize(out_file) > 8000:
        if not os.path.exists(dist_file):
            with open(out_file, "rb") as sf, open(dist_file, "wb") as df:
                df.write(sf.read())
        return sku, True, os.path.getsize(out_file), "ALREADY_EXISTS"

    candidates = search_bing(query_str)
    if not candidates:
        time.sleep(0.3)
        q_short = " ".join(query_str.split()[:3])
        candidates = search_bing(q_short)

    ok, size, src = download_candidate(candidates, out_file)
    if ok:
        with open(out_file, "rb") as sf, open(dist_file, "wb") as df:
            df.write(sf.read())
        return sku, True, size, src[:60]
    else:
        return sku, False, 0, f"FAILED for query: {query_str}"

def main():
    target_dir = os.path.abspath("stocksync/web/public/products")
    dist_dir = os.path.abspath("stocksync/web/dist/products")
    os.makedirs(target_dir, exist_ok=True)
    os.makedirs(dist_dir, exist_ok=True)

    items = list(PRODUCT_QUERIES.items())
    print(f"Acquiring official studio photography for {len(items)} products with 6 concurrent threads...\n")

    succeeded = 0
    failed = 0

    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(process_product, sku, q, target_dir, dist_dir): sku for sku, q in items}
        for idx, f in enumerate(as_completed(futures), 1):
            sku, ok, size, info = f.result()
            if ok:
                succeeded += 1
                size_kb = round(size / 1024)
                print(f"[{idx}/{len(items)}] {sku}: OK ({size_kb} KB) -> {info}")
            else:
                failed += 1
                print(f"[{idx}/{len(items)}] {sku}: FAIL -> {info}")

    print(f"\n========================================================")
    print(f"REPORT: Succeeded: {succeeded}/{len(items)}, Failed: {failed}")
    print(f"========================================================\n")

if __name__ == "__main__":
    main()
