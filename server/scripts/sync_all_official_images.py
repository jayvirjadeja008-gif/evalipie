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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
}

PRODUCT_QUERIES = {
    # AUDIO
    "AUD-001": "boAt Rockerz 450 black",
    "AUD-002": "Sony WH-CH520 blue",
    "AUD-003": "JBL Go 3 blue",
    "AUD-004": "Noise Buds VS104 black",
    "AUD-005": "Realme Buds T300 black",
    "AUD-006": "Marshall Emberton II black",
    "AUD-007": "Aurora Pro wireless earbuds blue",
    "AUD-008": "Bose QuietComfort 45 black",
    "AUD-009": "Sennheiser HD 450BT black",
    "AUD-010": "Apple AirPods Pro 2 white",
    "AUD-011": "Sony WH-1000XM5 black",
    "AUD-012": "Harman Kardon Aura Studio 4",
    "AUD-013": "JBL Flip 6 red",
    "AUD-014": "OnePlus Buds Pro 2 green",
    "AUD-015": "Marshall Stanmore III cream",
    "AUD-016": "boAt Airdopes 141 navy",
    "AUD-017": "Apple AirPods Max pink",
    "AUD-018": "Sennheiser Momentum 4 black",
    "AUD-019": "Bose SoundLink Flex blue",
    "AUD-020": "Skullcandy Crusher Evo tan",
    "AUD-021": "Boult Audio Z40 yellow",
    "AUD-022": "Nothing Ear yellow",
    "AUD-023": "Amazon Echo Dot 5th Gen blue",
    "AUD-024": "Samsung Galaxy Buds2 Pro navy",
    "AUD-025": "JBL Tune 760NC red",
    "AUD-026": "Zebronics Zeb-Sound Feast 500",
    "AUD-027": "Marshall Major IV brown",

    # MOBILES & TABLETS
    "MOB-001": "Redmi Note 13 blue",
    "MOB-002": "Samsung Galaxy M35 navy",
    "MOB-003": "OnePlus Nord CE4 green",
    "MOB-004": "Apple iPhone 15 blue",
    "MOB-005": "Google Pixel 8a bay blue",
    "MOB-006": "Motorola Moto G45 navy",
    "MOB-007": "Samsung Galaxy S24 Ultra titanium black",
    "MOB-008": "Apple iPhone 15 Pro Max natural titanium",
    "MOB-009": "OnePlus 12 green",
    "MOB-010": "Nothing Phone 2a dark smoke",
    "MOB-011": "Vivo V30 Pro blue",
    "MOB-012": "Realme 12 Pro Plus navy",
    "MOB-013": "Apple iPad Air M2 space grey",
    "MOB-014": "Samsung Galaxy Tab S9 FE mint green",
    "MOB-015": "Xiaomi 14 black",
    "MOB-016": "Apple iPhone 14 starlight",
    "MOB-017": "Google Pixel 8 Pro obsidian",
    "MOB-018": "Samsung Galaxy S23 FE red",
    "MOB-019": "OnePlus Open emerald",
    "MOB-020": "POCO X6 Pro yellow",
    "MOB-021": "Apple iPad 10th Gen yellow",
    "MOB-022": "Moto Edge 50 Pro black",
    "MOB-023": "Xiaomi Pad 6 blue",
    "MOB-024": "Samsung Galaxy A55 blue",
    "MOB-025": "Realme GT 6T silver",
    "MOB-026": "Nothing Phone 2 black",
    "MOB-027": "OnePlus Pad 2 grey",

    # LAPTOPS & COMPUTING
    "LAP-001": "HP 15s Ryzen 5 black",
    "LAP-002": "Lenovo IdeaPad Slim 3 blue",
    "LAP-003": "ASUS Vivobook 15 OLED black",
    "LAP-004": "Apple MacBook Air 13 M2 midnight",
    "LAP-005": "Dell Inspiron 15 black",
    "LAP-006": "Apple MacBook Pro 14 M3 Space Black",
    "LAP-007": "ASUS ROG Zephyrus G14 black",
    "LAP-008": "Lenovo Legion Slim 5 black",
    "LAP-009": "HP Pavilion Plus 14 blue",
    "LAP-010": "Acer Swift Go 14 AI black",
    "LAP-011": "Dell XPS 13 Plus black",
    "LAP-012": "Microsoft Surface Laptop 5 black",
    "LAP-013": "Apple MacBook Air 15 M3 starlight",
    "LAP-014": "HP Victus 15 red",
    "LAP-015": "Lenovo ThinkPad E14 Gen 5 black",
    "LAP-016": "ASUS Zenbook 14 OLED blue",
    "LAP-017": "Acer Nitro V 15 black",
    "LAP-018": "Samsung Galaxy Book4 Pro 360",
    "LAP-019": "HP Envy x360 silver",
    "LAP-020": "Dell Alienware m16 black",
    "LAP-021": "Lenovo Yoga Slim 7x blue",
    "LAP-022": "MSI Thin 15 black",
    "LAP-023": "ASUS TUF Gaming F15 olive",
    "LAP-024": "Apple MacBook Pro 16 M3 Max space black",
    "LAP-025": "Acer Aspire 5 blue",
    "LAP-026": "Apple Mac Mini M2",
    "LAP-027": "Lenovo IdeaPad Gaming 3 black",

    # FASHION & APPAREL
    "FAS-001": "Allen Solly mens formal shirt sky blue",
    "FAS-002": "Levis 511 slim jeans blue",
    "FAS-003": "Fabindia mens kurta olive",
    "FAS-004": "Peter England polo red",
    "FAS-005": "W for Woman anarkali kurta pink",
    "FAS-006": "Raymond blazer wine red",
    "FAS-007": "Tommy Hilfiger oxford shirt yellow",
    "FAS-008": "Van Heusen formal trousers black",
    "FAS-009": "Fossil Grant chronograph watch black",
    "FAS-010": "Ray-Ban Aviator sunglasses black",
    "FAS-011": "Calvin Klein leather belt tan",
    "FAS-012": "Puma hoodie red",
    "FAS-013": "Roadster denim jacket blue",
    "FAS-014": "Roadster plaid shirt navy",
    "FAS-015": "Roadster cargo joggers olive",
    "FAS-016": "Lavie satchel handbag tan",
    "FAS-017": "Lavie shoulder tote pink",
    "FAS-018": "Lavie backpack black",
    "FAS-019": "Fossil Jacqueline rose gold watch",
    "FAS-020": "Fabindia women kurta yellow",
    "FAS-021": "Manyavar sherwani cream tan",
    "FAS-022": "Biba banarasi saree red",
    "FAS-023": "Ray-Ban Wayfarer tortoise tan",
    "FAS-024": "H&M t-shirt olive green",
    "FAS-025": "Levis kids boys t-shirt blue",
    "FAS-026": "H&M kids girls dress pink",
    "FAS-027": "Tommy Hilfiger kids polo navy",
    "FAS-028": "Wildcraft 35L backpack black",

    # FOOTWEAR
    "FTW-001": "Nike Revolution 7 blue",
    "FTW-002": "Puma Smash v2 black",
    "FTW-003": "Bata oxford leather shoes tan",
    "FTW-004": "Woodland nubuck trekking boots tan",
    "FTW-005": "Crocs classic clogs navy",
    "FTW-006": "Nike Air Jordan 1 Low red",
    "FTW-007": "Adidas Ultraboost Light white",
    "FTW-008": "Red Tape walking shoes olive",
    "FTW-009": "Birkenstock Arizona EVA slides black",
    "FTW-010": "Clarks Tilden Cap oxford black",
    "FTW-011": "Crocs classic clogs tan",
    "FTW-012": "ASICS Gel-Kayano 30 blue",
    "FTW-013": "Adidas Samba OG black white",
    "FTW-014": "Nike Air Force 1 07 white",
    "FTW-015": "New Balance 574 olive",
    "FTW-016": "Puma Softride Enzo red",
    "FTW-017": "Woodland ankle boots olive",
    "FTW-018": "Skechers Go Walk 6 navy",
    "FTW-019": "Converse Chuck Taylor All Star yellow",
    "FTW-020": "Vans Old Skool black",
    "FTW-021": "Metro stiletto heels pink",
    "FTW-022": "Mochi block heel sandals tan",
    "FTW-023": "Catwalk platform sneakers navy",
    "FTW-024": "Woodland trekking sandals tan",
    "FTW-025": "Puma kids sneakers blue",
    "FTW-026": "Crocs kids clogs yellow",
    "FTW-027": "Sparx running shoes red",
    "FTW-028": "Woodland suede loafers tan",

    # HOME & KITCHEN
    "HOM-001": "Prestige Iris 750W mixer grinder",
    "HOM-002": "Milton thermosteel flask 1L tan",
    "HOM-003": "Pigeon non-stick cookware red",
    "HOM-004": "Philips digital air fryer HD9252 black",
    "HOM-005": "Bajaj Rex 500W mixer grinder",
    "HOM-006": "Havells ceiling fan 1200mm tan",
    "HOM-007": "Dyson V8 cordless vacuum blue",
    "HOM-008": "DeLonghi Dedica espresso red",
    "HOM-009": "Instant Pot Duo 7-in-1 black",
    "HOM-010": "Mi Smart Air Purifier 4 white",
    "HOM-011": "Morphy Richards microwave 24L black",
    "HOM-012": "Lodge cast iron skillet 10.25 black",
    "HOM-013": "Hawkins Contura pressure cooker black",
    "HOM-014": "Prestige Deluxe Alpha pressure cooker",
    "HOM-015": "Wonderchef Nutri-blend red",
    "HOM-016": "Kent Grand Plus water purifier white",
    "HOM-017": "Dyson Supersonic hair dryer blue",
    "HOM-018": "Philips hand mixer 300W",
    "HOM-019": "Eureka Forbes vacuum cleaner red",
    "HOM-020": "Borosil sandwich maker black",
    "HOM-021": "Pigeon induction cooktop black",
    "HOM-022": "Faber curved glass chimney black",
    "HOM-023": "Bajaj water heater 15L",
    "HOM-024": "Milton water jug 2L blue",
    "HOM-025": "Prestige granite cookware olive",
    "HOM-026": "Tupperware water bottles yellow",
    "HOM-027": "Sleepyhead memory foam pillow tan",
    "HOM-028": "Pigeon 3 burner gas stove black"
}

def get_vqd(q):
    try:
        t_url = f"https://duckduckgo.com/?q={urllib.parse.quote(q)}"
        req = urllib.request.Request(t_url, headers=HEADERS)
        html = urllib.request.urlopen(req, timeout=6, context=ctx).read().decode("utf-8")
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
        res = urllib.request.urlopen(req, timeout=6, context=ctx).read().decode("utf-8")
        data = json.loads(res)
        return [r["image"] for r in data.get("results", []) if r.get("image") and not r["image"].endswith(".svg")]
    except Exception:
        return []

def search_wikimedia(q):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(q)}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url&format=json"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "StockSync/1.0 (dev@stocksync.in)"})
        res = urllib.request.urlopen(req, timeout=6, context=ctx).read().decode("utf-8")
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

def main():
    target_dir = "stocksync/web/public/products"
    dist_dir = "stocksync/web/dist/products"
    os.makedirs(target_dir, exist_ok=True)
    os.makedirs(dist_dir, exist_ok=True)

    items = list(PRODUCT_QUERIES.items())
    print(f"Total tailored products to download: {len(items)}\n")

    succeeded = 0
    already = 0
    failed = 0

    for idx, (sku, q) in enumerate(items, 1):
        out_file = os.path.join(target_dir, f"{sku}.jpg")
        dist_file = os.path.join(dist_dir, f"{sku}.jpg")

        if os.path.exists(out_file) and os.path.getsize(out_file) > 8000:
            size_kb = round(os.path.getsize(out_file) / 1024)
            print(f"[{idx}/{len(items)}] {sku}: ALREADY EXISTS ({size_kb} KB)")
            if not os.path.exists(dist_file):
                with open(out_file, "rb") as sf, open(dist_file, "wb") as df:
                    df.write(sf.read())
            already += 1
            succeeded += 1
            continue

        candidates = search_ddg(q)
        if not candidates:
            time.sleep(0.5)
            # Try without color
            q_short = " ".join(q.split()[:-1])
            candidates = search_ddg(q_short)
        if not candidates:
            candidates = search_wikimedia(q)

        ok, size, src = download_candidate(candidates, out_file)
        if ok:
            size_kb = round(size / 1024)
            print(f"[{idx}/{len(items)}] {sku}: DOWNLOADED ({size_kb} KB) -> {src[:60]}")
            with open(out_file, "rb") as sf, open(dist_file, "wb") as df:
                df.write(sf.read())
            succeeded += 1
        else:
            print(f"[{idx}/{len(items)}] {sku}: FAILED for query '{q}'")
            failed += 1

        time.sleep(1.2)

    print(f"\n========================================================")
    print(f"FINAL REPORT:")
    print(f"- Total:     {len(items)}")
    print(f"- Succeeded: {succeeded} ({already} already existing, {succeeded - already} newly acquired)")
    print(f"- Failed:    {failed}")
    print(f"========================================================\n")

if __name__ == "__main__":
    main()
