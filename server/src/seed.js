import bcrypt from "bcryptjs";
import { pool, tx, emit } from "./db.js";
import { topics } from "./config.js";

const CITIES = ["Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune"];
const CATS = [
  ["Audio", "audio"],
  ["Mobiles", "mobiles"],
  ["Laptops", "laptops"],
  ["Fashion", "fashion"],
  ["Home & Kitchen", "home"],
  ["Footwear", "footwear"]
];

// [sku, name, brand, category slug, price INR, description, image_url]
const P = [
  // ── AUDIO (12 Products) ────────────────────────────────────────────────────
  [
    "AUD-001",
    "Boat Rockerz Bluetooth Earphones",
    "boAt",
    "audio",
    1499,
    "Wireless Bluetooth in-ear earphones with 40-hour playback and deep bass.",
    "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-002",
    "Sony WH-CH520 Bluetooth Headphones",
    "Sony",
    "audio",
    4490,
    "Lightweight Bluetooth headphones with multipoint pairing and clear calls.",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-003",
    "JBL Go 3 Bluetooth Speaker",
    "JBL",
    "audio",
    2799,
    "Pocket-sized waterproof Bluetooth speaker with punchy sound.",
    "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-004",
    "Noise Buds VS104 Earbuds",
    "Noise",
    "audio",
    999,
    "True wireless earbuds with 45-hour playtime and quad mic ENC.",
    "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-005",
    "Realme Buds T300 Earbuds",
    "realme",
    "audio",
    2299,
    "Bluetooth 5.3 earbuds with 30dB noise cancellation.",
    "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-006",
    "Marshall Emberton II Speaker",
    "Marshall",
    "audio",
    12999,
    "Portable Bluetooth speaker with signature Marshall sound, 30+ hours.",
    "https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-007",
    "Aurora Pro Limited-Edition Earbuds",
    "Aurora",
    "audio",
    3499,
    "Limited drop: collector-edition Bluetooth earbuds. Strictly 1 unit per city for concurrency demonstration.",
    "https://images.unsplash.com/photo-1598331668826-20cecc596b86?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-008",
    "Bose QuietComfort 45 Headphones",
    "Bose",
    "audio",
    24900,
    "World-class noise cancellation, TriPort acoustic architecture, and plush synthetic leather cushions.",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-009",
    "Sennheiser HD 450BT Wireless",
    "Sennheiser",
    "audio",
    9990,
    "Active noise cancellation, 30-hour battery life, and AAC/AptX Low Latency codec support.",
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-010",
    "Apple AirPods Pro 2nd Gen",
    "Apple",
    "audio",
    24900,
    "Up to 2x more Active Noise Cancellation, Adaptive Audio, and Personalized Spatial Audio with dynamic head tracking.",
    "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-011",
    "Sony WH-1000XM5 ANC Headphones",
    "Sony",
    "audio",
    28990,
    "Industry-leading noise canceling with two processors and eight microphones for clear hands-free calls.",
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-012",
    "Harman Kardon Aura Studio 4",
    "Harman Kardon",
    "audio",
    25999,
    "Iconic transparent dome design with diamond-effect ambient light and 360-degree room-filling acoustic sound.",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80"
  ],

  // ── MOBILES (12 Products) ──────────────────────────────────────────────────
  [
    "MOB-001",
    "Redmi Note 13 5G 128GB",
    "Xiaomi",
    "mobiles",
    17999,
    "6.67-inch AMOLED, 108MP camera, 5G ready. Only 1 unit remaining in Mumbai store.",
    "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-002",
    "Samsung Galaxy M35 5G",
    "Samsung",
    "mobiles",
    19999,
    "Super AMOLED display with 6000mAh monster battery and 120Hz refresh rate.",
    "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-003",
    "OnePlus Nord CE4 5G",
    "OnePlus",
    "mobiles",
    24999,
    "Snapdragon 7 Gen 3 with 100W SUPERVOOC fast charging and Sony LYT-600 OIS camera.",
    "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-004",
    "iPhone 15 128GB",
    "Apple",
    "mobiles",
    69900,
    "A16 Bionic chip, Dynamic Island, and an advanced 48MP main camera with USB-C.",
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-005",
    "Google Pixel 8a",
    "Google",
    "mobiles",
    52999,
    "Google Tensor G3 chip, AI-powered photography, 120Hz Actua display, and 7 years of OS updates.",
    "https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-006",
    "Moto G45 5G",
    "Motorola",
    "mobiles",
    10999,
    "Clean vegan leather finish, Snapdragon 6s Gen 3, and vibrant 120Hz display.",
    "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-007",
    "Samsung Galaxy S24 Ultra",
    "Samsung",
    "mobiles",
    129999,
    "Titanium frame, 200MP camera with Galaxy AI, flat 6.8-inch QHD+ AMOLED 2X, and integrated S-Pen.",
    "https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-008",
    "iPhone 15 Pro Max 256GB",
    "Apple",
    "mobiles",
    144900,
    "Forged in titanium with aerospace-grade alloy, A17 Pro chip, Action button, and 5x optical telephoto lens.",
    "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-009",
    "OnePlus 12 5G 256GB",
    "OnePlus",
    "mobiles",
    64999,
    "Snapdragon 8 Gen 3 flagship, 4th Gen Hasselblad Camera System, and 5400mAh battery with 100W wired charging.",
    "https://images.unsplash.com/photo-1523206489230-c012c64b2b48?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-010",
    "Nothing Phone 2a 128GB",
    "Nothing",
    "mobiles",
    23999,
    "Custom Dimensity 7200 Pro processor, iconic transparent Glyph Interface, and studio-grade 50MP dual cameras.",
    "https://images.unsplash.com/photo-1530319067432-f2a729c03db5?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-011",
    "Vivo V30 Pro 5G",
    "Vivo",
    "mobiles",
    41999,
    "ZEISS professional portrait camera system, ultra-slim 3D curved 1.5K display, and smart Aura Light.",
    "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-012",
    "Realme 12 Pro+ 5G",
    "Realme",
    "mobiles",
    29999,
    "Submarine periscope portrait camera with 120X superzoom and luxury watch design by Ollivier Saveo.",
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80"
  ],

  // ── LAPTOPS (12 Products) ──────────────────────────────────────────────────
  [
    "LAP-001",
    "HP 15s Ryzen 5 Laptop",
    "HP",
    "laptops",
    42990,
    "15.6-inch FHD micro-edge display, 16GB RAM, 512GB SSD, AMD Radeon Graphics for everyday computing.",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-002",
    "Lenovo IdeaPad Slim 3",
    "Lenovo",
    "laptops",
    38990,
    "Intel Core i5 12th Gen thin-and-light laptop with military-grade durability and rapid charge.",
    "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-003",
    "ASUS Vivobook 14 OLED",
    "ASUS",
    "laptops",
    54990,
    "14-inch 2.8K 90Hz OLED display, Intel Core i5 13th Gen, 16GB RAM, and 180-degree lay-flat hinge.",
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-004",
    "MacBook Air M2 13-inch",
    "Apple",
    "laptops",
    94900,
    "Strikingly thin design with M2 chip, 13.6-inch Liquid Retina display, and up to 18 hours of battery life.",
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-005",
    "Dell Inspiron 15 Laptop",
    "Dell",
    "laptops",
    46990,
    "Intel Core i5-1235U with 16GB RAM, 512GB SSD, lift hinge design, and anti-glare FHD screen.",
    "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-006",
    "MacBook Pro 14 M3 Pro",
    "Apple",
    "laptops",
    199900,
    "Liquid Retina XDR display with ProMotion 120Hz, M3 Pro 11-core CPU, 14-core GPU, and Space Black finish.",
    "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-007",
    "ASUS ROG Zephyrus G14",
    "ASUS",
    "laptops",
    149990,
    "AMD Ryzen 9 8945HS, NVIDIA GeForce RTX 4060, 3K 120Hz OLED gaming display in an ultra-slim aluminum body.",
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-008",
    "Lenovo Legion Slim 5 Gaming",
    "Lenovo",
    "laptops",
    99990,
    "AI-tuned gaming notebook with Ryzen 7 7840HS, RTX 4050, Legion Coldfront 5.0 thermal technology.",
    "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-009",
    "HP Pavilion Plus 14 OLED",
    "HP",
    "laptops",
    74990,
    "IMAX Enhanced 2.8K OLED display, Intel Evo Core i5-13500H, and all-metal sustainable chassis.",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-010",
    "Acer Swift Go 14 AI",
    "Acer",
    "laptops",
    62990,
    "Intel Core Ultra 5 processor with dedicated Intel AI Boost NPU and dual fan TwinAir cooling.",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-011",
    "Dell XPS 13 Plus",
    "Dell",
    "laptops",
    159990,
    "Zero-lattice keyboard, seamless glass touchpad with haptics, and borderless 4K+ InfinityEdge display.",
    "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-012",
    "Microsoft Surface Laptop 5",
    "Microsoft",
    "laptops",
    104990,
    "13.5-inch PixelSense touchscreen, Intel Core i5 Evo, warm Alcantara keyboard, and Studio Mics.",
    "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?auto=format&fit=crop&w=900&q=80"
  ],

  // ── FASHION (12 Products) ──────────────────────────────────────────────────
  [
    "FAS-001",
    "Allen Solly Cotton Formal Shirt",
    "Allen Solly",
    "fashion",
    1299,
    "Slim-fit 100% combed cotton shirt tailored for business and office essentials.",
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-002",
    "Levis 511 Slim Fit Jeans",
    "Levis",
    "fashion",
    2999,
    "Classic slim-fit stretch denim woven with sustainable cottonized hemp fibers.",
    "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-003",
    "Fabindia Kurta Cotton",
    "Fabindia",
    "fashion",
    1799,
    "Authentic hand-block printed pure breathable cotton long kurta with mandarin collar.",
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-004",
    "Peter England Polo T-Shirt",
    "Peter England",
    "fashion",
    899,
    "Breathable pique knit cotton polo with ribbed collar and tailored sleeve hems.",
    "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-005",
    "W Women Anarkali Kurta Set",
    "W",
    "fashion",
    2499,
    "Festive printed Anarkali flare kurta set crafted with zari highlights and matching dupatta.",
    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-006",
    "Raymond Premium Wool Blazer",
    "Raymond",
    "fashion",
    7999,
    "Superfine worsted wool tailored single-breasted blazer with notch lapels and structured shoulder.",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-007",
    "Tommy Hilfiger Casual Oxford Shirt",
    "Tommy Hilfiger",
    "fashion",
    3999,
    "Pure organic cotton oxford weave with iconic flag chest embroidery and button-down collar.",
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-008",
    "Van Heusen Formal Trousers",
    "Van Heusen",
    "fashion",
    1899,
    "Wrinkle-resistant comfort-stretch formal trousers with sharp creased legs.",
    "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-009",
    "Fossil Minimalist Chronograph Watch",
    "Fossil",
    "fashion",
    10995,
    "Clean 42mm sunray dial, stainless steel bezel, and handcrafted genuine amber leather strap.",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-010",
    "Ray-Ban Classic Aviator Sunglasses",
    "Ray-Ban",
    "fashion",
    8290,
    "Legendary teardrop gold metal frame with G-15 crystal green UV protective polarized lenses.",
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-011",
    "Calvin Klein Leather Reversible Belt",
    "Calvin Klein",
    "fashion",
    3499,
    "Full-grain cowhide leather with matte black swivel buckle transitioning from black to cognac brown.",
    "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-012",
    "Puma Classic Relaxed Hoodie",
    "Puma",
    "fashion",
    2499,
    "Heavyweight 330gsm French terry fleece hoodie with ribbed cuffs and kangaroo pouch pocket.",
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=900&q=80"
  ],

  // ── HOME & KITCHEN (12 Products) ───────────────────────────────────────────
  [
    "HOM-001",
    "Prestige Induction Cooktop",
    "Prestige",
    "home",
    2699,
    "2000W induction cooktop with preset Indian menus, automatic voltage regulator, and crystal glass top.",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-002",
    "Milton Thermosteel Flask 1L",
    "Milton",
    "home",
    899,
    "Double-wall vacuum insulated 18/8 food-grade stainless steel flask, keeping drinks hot or cold for 24 hours.",
    "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-003",
    "Pigeon Non-Stick Cookware Set",
    "Pigeon",
    "home",
    1799,
    "Three-piece non-stick cookware set (kadhai, fry pan, flat tawa) with five-layer German stone coating.",
    "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-004",
    "Philips Air Fryer HD9200",
    "Philips",
    "home",
    6995,
    "Rapid Air technology with unique starfish design frying with up to 90% less oil, 4.1L capacity.",
    "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-005",
    "Bajaj Mixer Grinder 750W",
    "Bajaj",
    "home",
    3299,
    "Three heavy-gauge stainless steel jars with 100% copper 750W motor for tough masala and batter grinding.",
    "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-006",
    "Havells Ceiling Fan 1200mm",
    "Havells",
    "home",
    3199,
    "Energy-efficient BLDC ceiling fan with anti-dust aerodynamic blades and smart remote control.",
    "https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-007",
    "Dyson V8 Cordless Vacuum Cleaner",
    "Dyson",
    "home",
    29900,
    "Powerful 115AW suction with whole-machine HEPA filtration capturing 99.99% of microscopic dust particles.",
    "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-008",
    "De'Longhi Dedica Espresso Machine",
    "De'Longhi",
    "home",
    22990,
    "Slim 15-bar pump espresso maker with thermoblock heating and adjustable manual milk frothing wand.",
    "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-009",
    "Instant Pot Duo 7-in-1 Cooker",
    "Instant Pot",
    "home",
    8990,
    "One-touch multi-cooker replacing pressure cooker, slow cooker, rice cooker, steamer, and yogurt maker.",
    "https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-010",
    "Mi Smart Air Purifier 4",
    "Xiaomi",
    "home",
    14999,
    "CADR 400 cubic meters/hour with True HEPA 3-in-1 filtration, OLED touch display, and laser particulate sensor.",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-011",
    "Morphy Richards Microwave 25L",
    "Morphy Richards",
    "home",
    11490,
    "Convection microwave oven with 200 auto-cook menus, motorized rotisserie, and stainless steel cavity.",
    "https://images.unsplash.com/photo-1584269600519-112d071b35e6?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-012",
    "Lodge Cast Iron Skillet 10.25-inch",
    "Lodge",
    "home",
    3499,
    "Pre-seasoned with 100% natural vegetable oil for unparalleled heat retention and even campfire or stovetop searing.",
    "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=900&q=80"
  ],

  // ── FOOTWEAR (12 Products) ─────────────────────────────────────────────────
  [
    "FTW-001",
    "Nike Revolution 7 Running Shoes",
    "Nike",
    "footwear",
    3995,
    "Soft foam midsole cushioning with breathable engineered mesh upper and generative traction pattern.",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-002",
    "Puma Smash V2 Sneakers",
    "Puma",
    "footwear",
    2999,
    "Clean court-inspired tennis silhouette with soft suede upper and durable non-marking rubber outsole.",
    "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-003",
    "Bata Formal Leather Shoes",
    "Bata",
    "footwear",
    2299,
    "Hand-burnished genuine leather Oxford dress shoes with cushioned collar and slip-resistant sole.",
    "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-004",
    "Adidas Adilette Slides",
    "Adidas",
    "footwear",
    1599,
    "Quick-drying contoured Cloudfoam footbed with iconic 3-Stripes bandage upper for effortless locker or lounge comfort.",
    "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-005",
    "Woodland Trekking Boots",
    "Woodland",
    "footwear",
    5495,
    "Heavy-duty waterproof nubuck leather high-ankle outdoor boots with deep-lugged rubber grip.",
    "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-006",
    "Skechers Go Walk Shoes",
    "Skechers",
    "footwear",
    4299,
    "Ultra-lightweight responsive ULTRA GO cushioning with high-rebound Air-Cooled Goga Mat insole.",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-007",
    "Nike Air Jordan 1 Low",
    "Nike",
    "footwear",
    8995,
    "Encapsulated Air-Sole unit with genuine leather upper, stitched Wings logo on heel, and iconic rubber cupsole.",
    "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-008",
    "Adidas Ultraboost Light",
    "Adidas",
    "footwear",
    13999,
    "Light BOOST midsole technology delivering maximum energy return, Primeknit+ textile upper, and Continental rubber outsole.",
    "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-009",
    "New Balance 574 Core Sneakers",
    "New Balance",
    "footwear",
    7499,
    "Heritage ENCAP midsole cushioning with premium suede and mesh upper in quintessential neutral grey.",
    "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-010",
    "Clarks Tilden Cap Oxford Shoes",
    "Clarks",
    "footwear",
    6999,
    "Full-grain rich black leather with discreet elastic gore panels and OrthoLite footbed with Cushion Soft technology.",
    "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-011",
    "Crocs Classic Unisex Clogs",
    "Crocs",
    "footwear",
    2995,
    "Incredibly light and buoyant Croslite foam construction with pivoting heel straps and ventilation ports.",
    "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-012",
    "ASICS Gel-Kayano 30 Stability",
    "ASICS",
    "footwear",
    15999,
    "4D GUIDANCE SYSTEM with pureGEL technology and lightweight FF BLAST PLUS ECO cushioning for smooth road running.",
    "https://images.unsplash.com/photo-1562183241-b937e95585b6?auto=format&fit=crop&w=900&q=80"
  ]
];

await pool.query("TRUNCATE order_items, orders, cart_items, carts, inventory_movements, inventory, stock_alerts, notifications, processed_events, outbox, order_stats, products, categories, users RESTART IDENTITY CASCADE");

const admin = await bcrypt.hash("admin123", 10);
const demo = await bcrypt.hash("demo123", 10);

await tx(async (c) => {
  await c.query("INSERT INTO users(email,name,password_hash,role) VALUES ($1,'StockSync Admin',$2,'admin'), ($3,'Demo Customer',$4,'customer')",
    ["admin@stocksync.in", admin, "demo@stocksync.in", demo]);
  const catId = {};
  for (const [name, slug] of CATS) catId[slug] = (await c.query("INSERT INTO categories(name,slug) VALUES ($1,$2) RETURNING id", [name, slug])).rows[0].id;
  let seedIdx = 0;
  for (const [sku, name, brand, cat, price, desc, imgUrl] of P) {
    const id = (await c.query("INSERT INTO products(sku,name,brand,description,category_id,price_paise,image_url) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [sku, name, brand, desc, catId[cat], price * 100, imgUrl])).rows[0].id;

    for (const [ci, city] of CITIES.entries()) {
      let q = 0;
      if (sku === "AUD-007") {
        // Concurrency Demo Item 1: Exactly 1 unit in Bengaluru
        q = city === "Bengaluru" ? 1 : 0;
      } else if (sku === "MOB-001") {
        // Concurrency Demo Item 2: Exactly 1 unit in Mumbai
        q = city === "Mumbai" ? 1 : 12;
      } else {
        q = 8 + ((seedIdx * 11 + ci * 7) % 35);
      }

      if (q === 0) continue;
      await c.query("INSERT INTO inventory(product_id, city, quantity) VALUES ($1,$2,$3)", [id, city, q]);
      await c.query("INSERT INTO inventory_movements(product_id, city, delta, quantity_after, reason) VALUES ($1,$2,$3,$3,'seed')", [id, city, q]);
    }
    await emit(c, topics.products, id, "product.changed", { productId: id, change: "seed" });
    seedIdx++;
  }
});

const n = (await pool.query("SELECT (SELECT count(*) FROM products) p, (SELECT count(*) FROM inventory) i, (SELECT count(*) FROM outbox) o")).rows[0];
console.log(`[seed] ${n.p} products with dedicated verified studio photography, ${n.i} inventory rows across 6 cities, ${n.o} outbox events queued`);
console.log("[seed] admin: admin@stocksync.in / admin123 | customer: demo@stocksync.in / demo123");
await pool.end();
