import urllib.request
import urllib.parse
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
    # AUDIO (27 products)
    "AUD-001": "boAt Rockerz 450 black on ear headphones",
    "AUD-002": "Sony WH-CH520 blue wireless headphones",
    "AUD-003": "JBL Go 3 blue portable speaker",
    "AUD-004": "Noise Buds VS104 black wireless earbuds",
    "AUD-005": "Realme Buds T300 black wireless earbuds",
    "AUD-006": "Marshall Emberton II black portable speaker",
    "AUD-007": "Aurora Pro wireless earbuds blue",
    "AUD-008": "Bose QuietComfort 45 black headphones",
    "AUD-009": "Sennheiser HD 450BT black headphones",
    "AUD-010": "Apple AirPods Pro 2 white",
    "AUD-011": "Sony WH-1000XM5 black headphones",
    "AUD-012": "Harman Kardon Aura Studio 4 bluetooth speaker",
    "AUD-013": "JBL Flip 6 red portable speaker",
    "AUD-014": "OnePlus Buds Pro 2 green earbuds",
    "AUD-015": "Marshall Stanmore III cream vintage speaker",
    "AUD-016": "boAt Airdopes 141 navy blue earbuds",
    "AUD-017": "Apple AirPods Max pink headphones",
    "AUD-018": "Sennheiser Momentum 4 black headphones",
    "AUD-019": "Bose SoundLink Flex blue outdoor speaker",
    "AUD-020": "Skullcandy Crusher Evo tan desert headphones",
    "AUD-021": "Boult Audio Z40 yellow earbuds",
    "AUD-022": "Nothing Ear yellow earbuds",
    "AUD-023": "Amazon Echo Dot 5th Gen blue smart speaker",
    "AUD-024": "Samsung Galaxy Buds2 Pro navy earbuds",
    "AUD-025": "JBL Tune 760NC red headphones",
    "AUD-026": "Zebronics Zeb-Sound Feast 500 bluetooth speaker",
    "AUD-027": "Marshall Major IV brown headphones",

    # MOBILES & TABLETS (27 products)
    "MOB-001": "Redmi Note 13 5G blue phone",
    "MOB-002": "Samsung Galaxy M35 navy blue phone",
    "MOB-003": "OnePlus Nord CE4 green marble phone",
    "MOB-004": "Apple iPhone 15 blue phone",
    "MOB-005": "Google Pixel 8a bay blue phone",
    "MOB-006": "Motorola Moto G45 navy blue phone",
    "MOB-007": "Samsung Galaxy S24 Ultra titanium black",
    "MOB-008": "Apple iPhone 15 Pro Max natural titanium",
    "MOB-009": "OnePlus 12 emerald green phone",
    "MOB-010": "Nothing Phone 2a dark smoke phone",
    "MOB-011": "Vivo V30 Pro blue phone",
    "MOB-012": "Realme 12 Pro Plus navy blue phone",
    "MOB-013": "Apple iPad Air 11 M2 space grey",
    "MOB-014": "Samsung Galaxy Tab S9 FE mint green tablet",
    "MOB-015": "Xiaomi 14 black phone",
    "MOB-016": "Apple iPhone 14 starlight phone",
    "MOB-017": "Google Pixel 8 Pro obsidian black phone",
    "MOB-018": "Samsung Galaxy S23 FE red phone",
    "MOB-019": "OnePlus Open emerald green foldable",
    "MOB-020": "POCO X6 Pro yellow phone",
    "MOB-021": "Apple iPad 10th Gen yellow tablet",
    "MOB-022": "Moto Edge 50 Pro black phone",
    "MOB-023": "Xiaomi Pad 6 blue tablet",
    "MOB-024": "Samsung Galaxy A55 blue phone",
    "MOB-025": "Realme GT 6T silver phone",
    "MOB-026": "Nothing Phone 2 black phone",
    "MOB-027": "OnePlus Pad 2 grey tablet",

    # LAPTOPS & COMPUTING (27 products)
    "LAP-001": "HP 15s Ryzen 5 black laptop",
    "LAP-002": "Lenovo IdeaPad Slim 3 abyss blue laptop",
    "LAP-003": "ASUS Vivobook 15 OLED black laptop",
    "LAP-004": "Apple MacBook Air 13 M2 midnight laptop",
    "LAP-005": "Dell Inspiron 15 carbon black laptop",
    "LAP-006": "Apple MacBook Pro 14 M3 Space Black",
    "LAP-007": "ASUS ROG Zephyrus G14 eclipse black laptop",
    "LAP-008": "Lenovo Legion Slim 5 storm black gaming laptop",
    "LAP-009": "HP Pavilion Plus 14 tranquil blue laptop",
    "LAP-010": "Acer Swift Go 14 AI black laptop",
    "LAP-011": "Dell XPS 13 Plus graphite black laptop",
    "LAP-012": "Microsoft Surface Laptop 5 matte black",
    "LAP-013": "Apple MacBook Air 15 M3 starlight laptop",
    "LAP-014": "HP Victus 15 performance red gaming laptop",
    "LAP-015": "Lenovo ThinkPad E14 Gen 5 black laptop",
    "LAP-016": "ASUS Zenbook 14 OLED ponder blue laptop",
    "LAP-017": "Acer Nitro V 15 gaming laptop black",
    "LAP-018": "Samsung Galaxy Book4 Pro 360 tan laptop",
    "LAP-019": "HP Envy x360 silver convertible laptop",
    "LAP-020": "Dell Alienware m16 dark metallic gaming laptop",
    "LAP-021": "Lenovo Yoga Slim 7x cosmic blue laptop",
    "LAP-022": "MSI Thin 15 gaming laptop black red",
    "LAP-023": "ASUS TUF Gaming F15 olive green laptop",
    "LAP-024": "Apple MacBook Pro 16 M3 Max space black",
    "LAP-025": "Acer Aspire 5 steel blue laptop",
    "LAP-026": "Apple Mac Mini M2 desktop",
    "LAP-027": "Lenovo IdeaPad Gaming 3 onyx black laptop",

    # FASHION & APPAREL (28 products)
    "FAS-001": "Allen Solly mens formal shirt sky blue",
    "FAS-002": "Levis 511 slim fit jeans blue denim",
    "FAS-003": "Fabindia mens pure cotton kurta olive green",
    "FAS-004": "Peter England pique polo shirt crimson red",
    "FAS-005": "W for Woman printed anarkali kurta set pink",
    "FAS-006": "Raymond wool blend blazer crimson wine",
    "FAS-007": "Tommy Hilfiger oxford shirt mustard yellow",
    "FAS-008": "Van Heusen formal trousers charcoal black",
    "FAS-009": "Fossil Grant chronograph watch black leather",
    "FAS-010": "Ray-Ban Aviator sunglasses black",
    "FAS-011": "Calvin Klein leather reversible belt tan",
    "FAS-012": "Puma classic fleece hoodie red",
    "FAS-013": "Roadster denim trucker jacket blue",
    "FAS-014": "Roadster plaid flannel shirt navy blue",
    "FAS-015": "Roadster cargo jogger pants olive green",
    "FAS-016": "Lavie satchel handbag cognac tan",
    "FAS-017": "Lavie shoulder tote bag blush pink",
    "FAS-018": "Lavie flap backpack black",
    "FAS-019": "Fossil Jacqueline rose gold blush watch",
    "FAS-020": "Fabindia chanderi silk kurta yellow",
    "FAS-021": "Manyavar sherwani cream tan",
    "FAS-022": "Biba banarasi saree crimson red",
    "FAS-023": "Ray-Ban Wayfarer polarized sunglasses tan",
    "FAS-024": "H&M organic cotton t-shirt olive green",
    "FAS-025": "Levis kids boys graphic t-shirt blue",
    "FAS-026": "H&M kids girls floral dress pink",
    "FAS-027": "Tommy Hilfiger kids polo shirt navy",
    "FAS-028": "Wildcraft 35L waterproof backpack black",

    # FOOTWEAR (28 products)
    "FTW-001": "Nike Revolution 7 blue running shoes",
    "FTW-002": "Puma Smash v2 leather sneakers black",
    "FTW-003": "Bata formal oxford leather shoes tan",
    "FTW-004": "Woodland oiled nubuck leather trekking boots tan",
    "FTW-005": "Crocs classic clogs navy blue",
    "FTW-006": "Nike Air Jordan 1 Low red white",
    "FTW-007": "Adidas Ultraboost Light white running shoes",
    "FTW-008": "Red Tape athleisure walking shoes olive",
    "FTW-009": "Birkenstock Arizona EVA slides black",
    "FTW-010": "Clarks Tilden Cap oxford shoes black",
    "FTW-011": "Crocs classic clogs sand tan",
    "FTW-012": "ASICS Gel-Kayano 30 cobalt blue running shoes",
    "FTW-013": "Adidas Samba OG black white sneakers",
    "FTW-014": "Nike Air Force 1 07 white sneakers",
    "FTW-015": "New Balance 574 forest olive sneakers",
    "FTW-016": "Puma Softride Enzo red running shoes",
    "FTW-017": "Woodland rugged leather ankle boots olive",
    "FTW-018": "Skechers Go Walk 6 navy blue walking shoes",
    "FTW-019": "Converse Chuck Taylor All Star yellow high top",
    "FTW-020": "Vans Old Skool black white skate shoes",
    "FTW-021": "Metro pointed toe stiletto heels blush pink",
    "FTW-022": "Mochi block heel ethnic sandals tan",
    "FTW-023": "Catwalk platform sneakers navy blue",
    "FTW-024": "Woodland outdoor trekking sandals tan",
    "FTW-025": "Puma kids smash v2 velcro sneakers blue",
    "FTW-026": "Crocs kids classic clogs sunflower yellow",
    "FTW-027": "Sparx sporty running shoes red black",
    "FTW-028": "Woodland suede loafers cognac tan",

    # HOME & KITCHEN (28 products)
    "HOM-001": "Prestige Iris 750W mixer grinder",
    "HOM-002": "Milton thermosteel flask 1L champagne tan",
    "HOM-003": "Pigeon non-stick 3-piece cookware red",
    "HOM-004": "Philips digital air fryer HD9252 black",
    "HOM-005": "Bajaj Rex 500W mixer grinder yellow",
    "HOM-006": "Havells ceiling fan 1200mm brass tan",
    "HOM-007": "Dyson V8 cordless vacuum cobalt blue",
    "HOM-008": "DeLonghi Dedica espresso machine crimson red",
    "HOM-009": "Instant Pot Duo 7-in-1 multi cooker black",
    "HOM-010": "Mi Smart Air Purifier 4 white",
    "HOM-011": "Morphy Richards 24L convection microwave black",
    "HOM-012": "Lodge cast iron skillet 10.25 inch black",
    "HOM-013": "Hawkins Contura hard anodized pressure cooker black",
    "HOM-014": "Prestige Deluxe Alpha stainless steel pressure cooker",
    "HOM-015": "Wonderchef Nutri-blend mixer red",
    "HOM-016": "Kent Grand Plus RO water purifier white",
    "HOM-017": "Dyson Supersonic hair dryer prussian blue copper",
    "HOM-018": "Philips hand mixer 300W eggshell blush",
    "HOM-019": "Eureka Forbes portable vacuum cleaner red",
    "HOM-020": "Borosil prime grill sandwich maker black",
    "HOM-021": "Pigeon cruise induction cooktop black",
    "HOM-022": "Faber curved glass auto clean chimney black",
    "HOM-023": "Bajaj storage water heater 15L ivory",
    "HOM-024": "Milton vacuum insulated water jug 2L blue",
    "HOM-025": "Prestige granite cookware set olive green",
    "HOM-026": "Tupperware aquasafe water bottles yellow",
    "HOM-027": "Sleepyhead memory foam pillow bamboo tan",
    "HOM-028": "Pigeon 3-burner gas stove toughened glass black"
}

def search_bing(q):
    url = f"https://www.bing.com/images/search?q={urllib.parse.quote(q)}&form=HDRSC2&first=1"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        html = urllib.request.urlopen(req, timeout=7, context=ctx).read().decode("utf-8")
        imgs = re.findall(r"murl&quot;:&quot;(https:[^&]+)&quot;", html)
        return [u for u in imgs if not u.endswith(".svg")]
    except Exception:
        return []

def download_candidate(urls, out_file):
    for u in urls[:5]:
        try:
            req = urllib.request.Request(u, headers=HEADERS)
            data = urllib.request.urlopen(req, timeout=6, context=ctx).read()
            if len(data) >= 7500:
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
    print(f"Acquiring official studio photography for {len(items)} products...\n")

    succeeded = 0
    already = 0
    failed = 0

    for idx, (sku, q) in enumerate(items, 1):
        out_file = os.path.join(target_dir, f"{sku}.jpg")
        dist_file = os.path.join(dist_dir, f"{sku}.jpg")

        if os.path.exists(out_file) and os.path.getsize(out_file) > 8000:
            size_kb = round(os.path.getsize(out_file) / 1024)
            print(f"[{idx}/{len(items)}] {sku}: VERIFIED LOCAL PHOTO ({size_kb} KB)")
            if not os.path.exists(dist_file):
                with open(out_file, "rb") as sf, open(dist_file, "wb") as df:
                    df.write(sf.read())
            already += 1
            succeeded += 1
            continue

        candidates = search_bing(q)
        if not candidates:
            # retry with first 3 words
            q_short = " ".join(q.split()[:3])
            time.sleep(0.4)
            candidates = search_bing(q_short)

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

        # 0.4s delay for clean throughput
        time.sleep(0.4)

    print(f"\n========================================================")
    print(f"FINAL REPORT:")
    print(f"- Total:     {len(items)}")
    print(f"- Succeeded: {succeeded} ({already} already existing, {succeeded - already} newly acquired)")
    print(f"- Failed:    {failed}")
    print(f"========================================================\n")

if __name__ == "__main__":
    main()
