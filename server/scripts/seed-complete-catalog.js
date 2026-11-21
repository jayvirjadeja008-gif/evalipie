import bcrypt from "bcryptjs";
import { pool, query, tx } from "../src/db.js";
import { os, INDEX, ensureIndex } from "../src/search.js";
import { buildProductDoc } from "../src/productDoc.js";

const CITIES = ["Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune"];

const FIRST_NAMES = [
  "Aarav", "Pooja", "Karthik", "Ananya", "Vikram", "Deepa", "Rohan", "Sneha",
  "Aditya", "Meera", "Arjun", "Tanvi", "Siddharth", "Nisha", "Gaurav", "Divya",
  "Rishi", "Ishaan", "Kavita", "Sanjay", "Rahul", "Priya", "Amit", "Shreya",
  "Manish", "Swati", "Harish", "Pooja", "Naveen", "Preeti", "Alok", "Sunita"
];

const LAST_NAMES = [
  "Sharma", "Mehta", "Iyer", "Deshmukh", "Rathore", "Nair", "Verma", "Kulkarni",
  "Swaminathan", "Sen", "Kapur", "Joshi", "Menon", "Reddy", "Patel", "Banerjee",
  "Bose", "Chawla", "Rao", "Hegde", "Bhat", "Nambiar", "Mukherjee", "Gupta"
];

const REVIEW_POOLS = {
  audio: [
    { rating: 5, comment: "Crisp highs, rich mids, and punchy deep bass. Active noise cancellation easily isolates city commute rumble." },
    { rating: 5, comment: "Battery backup is exceptional. Easily 35+ hours of real-world playback. Delivered securely in tamper-evident packaging." },
    { rating: 4, comment: "Very comfortable for extended remote work calls. Mic beamforming is clear and multipoint switching works seamlessly." },
    { rating: 5, comment: "Pristine studio build quality and genuine manufacturer serial. Soundstage is remarkably wide." },
    { rating: 4, comment: "Solid ergonomic fit and rapid USB-C charging. Tremendous value for money at this sale discount." },
    { rating: 5, comment: "The acoustic balance is studio-accurate. Low latency gaming mode is great for video streaming." },
    { rating: 3, comment: "Decent audio balance. Ear-tips took a moment of adjustment to get the perfect passive seal for gym workouts." }
  ],
  mobiles: [
    { rating: 5, comment: "120Hz AMOLED display is butter smooth. Primary camera captures stunning dynamic range even in low light." },
    { rating: 5, comment: "Blazing fast processor and zero thermal throttling while multitasking. Factory unlocked Indian retail unit." },
    { rating: 4, comment: "Battery easily lasts a full demanding workday. 50% top-up in under 20 minutes with fast charger." },
    { rating: 5, comment: "Haptic feedback and display contrast are absolute flagship tier. Tamper-evident express delivery." },
    { rating: 4, comment: "Clean UI without bloatware. Data migration from my old device finished in under 10 minutes." },
    { rating: 5, comment: "Incredible telephoto zoom stability. Display brightness under direct sunlight is best in class." },
    { rating: 3, comment: "Great hardware performance. Loudspeakers are clear, though could use a touch more sub-bass resonance." }
  ],
  laptops: [
    { rating: 5, comment: "Compilation and render times cut dramatically. Display color gamut is vibrant and keyboard travel is tactile." },
    { rating: 5, comment: "Battery endurance is extraordinary. 13+ hours of continuous development without reaching for the charger." },
    { rating: 4, comment: "Whisper-quiet thermals and rigid aerospace-grade aluminum chassis. Handles multiple Docker containers effortlessly." },
    { rating: 5, comment: "OLED panel color accuracy is studio reference grade. Verified manufacturer warranty confirmed." },
    { rating: 4, comment: "Precision glass trackpad is best in class. Fast Wi-Fi 6E throughput and crisp 1080p web camera." },
    { rating: 5, comment: "Lightweight ultrabook form factor that slips easily into my backpack for daily city travel." },
    { rating: 3, comment: "High sustained performance under full CPU/GPU loads, though fans become audible during 4K exports." }
  ],
  fashion: [
    { rating: 5, comment: "Pure breathable fabric with structured tailoring. Fits true to size and retains crisp form after washing." },
    { rating: 4, comment: "Color shade matches the studio photography accurately. Pairs effortlessly with both formal and casual bottoms." },
    { rating: 5, comment: "Premium weave and comfortable drape. Lightweight and perfect for Indian tropical weather." },
    { rating: 4, comment: "Neat collar and seam reinforcement. Durable stitching that holds up well to repeated wear." },
    { rating: 5, comment: "Elevated design details and fine hand-feel. Got compliments on the first day wearing it to the office." },
    { rating: 4, comment: "Authentic branded garment with original tags. Excellent discount during the live flash sale." },
    { rating: 3, comment: "High quality material. If you prefer a slightly relaxed or oversized drape, recommend sizing up by one." }
  ],
  footwear: [
    { rating: 5, comment: "Incredible arch support and plush responsive cushioning. Walked 12,000 steps with zero foot fatigue." },
    { rating: 5, comment: "Outsole grip on wet pavements is rock-solid. Engineered mesh upper keeps feet well-ventilated." },
    { rating: 4, comment: "Sleek silhouette that looks sharp with joggers, denim, or chinos. Original box packaging was spotless." },
    { rating: 5, comment: "Comfortable right out of the box with virtually zero break-in period required. Fits true to size." },
    { rating: 4, comment: "Durable rubber lugs and sturdy heel counter. Excellent daily trainer for morning runs." },
    { rating: 5, comment: "Premium leather finish and supple footbed. Wore it to a wedding reception with zero discomfort." },
    { rating: 3, comment: "Very stylish silhouette. The foam cushioning feels slightly firm for long marathon runs but great for casual walks." }
  ],
  home: [
    { rating: 5, comment: "Heats rapidly and cooks evenly. Heavy-gauge base prevents scorching and works seamlessly on induction." },
    { rating: 5, comment: "Sturdy construction and architectural aesthetic on the kitchen countertop. An instant staple in our daily routine." },
    { rating: 4, comment: "Intuitive controls and cleans effortlessly with warm water. Arrived double-boxed with protective foam." },
    { rating: 5, comment: "Durable stainless steel grade and cool-touch ergonomic handles. Built to last for years." },
    { rating: 4, comment: "Very efficient power consumption and remarkably quiet motor operation during daily food prep." },
    { rating: 5, comment: "Exceeded expectations in daily performance. Makes healthy cooking fast and hassle-free." },
    { rating: 3, comment: "Performs reliably for daily household needs. Capacity is slightly more compact than envisioned." }
  ]
};

// [sku, name, brand, category slug, price INR, mrp INR, color, sizes, description, image_url]
const ALL_PRODUCTS = [
  // ════════════════════════════════════════════════════════════════════════════
  // 1. AUDIO (27 Products)
  // ════════════════════════════════════════════════════════════════════════════
  [
    "AUD-001",
    "boAt Rockerz 450 Bluetooth On-Ear Headphones",
    "boAt",
    "audio",
    1499,
    3990,
    "black",
    "Free",
    "High-definition 40mm dynamic drivers, 15-hour playback, plush foam earcups, and signature boAt rockin' bass. Matte Black finish.",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-002",
    "Sony WH-CH520 Wireless Bluetooth Headphones",
    "Sony",
    "audio",
    4490,
    5990,
    "blue",
    "Free",
    "Up to 50 hours battery life with quick charge, multipoint Bluetooth connection, DSEE digital sound enhancement, in vibrant Sky Blue.",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-003",
    "JBL Go 3 Ultra-Portable Waterproof Bluetooth Speaker",
    "JBL",
    "audio",
    2799,
    3999,
    "blue",
    "Free",
    "JBL Pro Sound in a compact rugged form factor. IP67 waterproof and dustproof with integrated loop cord in vivid Ocean Blue.",
    "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-004",
    "Noise Buds VS104 True Wireless Earbuds",
    "Noise",
    "audio",
    999,
    3499,
    "black",
    "Free",
    "45-hour total playtime with Instacharge, 13mm speaker drivers, quad mic with environmental noise cancellation in Carbon Black.",
    "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-005",
    "Realme Buds T300 ANC Wireless Earbuds",
    "realme",
    "audio",
    2299,
    3999,
    "black",
    "Free",
    "30dB Active Noise Cancellation, 360-degree spatial audio effect, 12.4mm dynamic bass boost driver in sleek Matte Black.",
    "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-006",
    "Marshall Emberton II Portable Bluetooth Speaker",
    "Marshall",
    "audio",
    12999,
    17999,
    "black",
    "Free",
    "True Stereophonic multi-directional sound with 30+ hours of portable playtime and IP67 water-resistance in Black and Brass.",
    "https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-007",
    "Aurora Pro Limited-Edition Studio Earbuds",
    "Aurora",
    "audio",
    3499,
    6999,
    "blue",
    "Free",
    "Limited drop: precision acoustic titanium diaphragm earbuds in Electric Aurora Neon Blue. Strictly 1 unit per city for concurrency demonstration.",
    "https://images.unsplash.com/photo-1598331668826-20cecc596b86?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-008",
    "Bose QuietComfort 45 Noise Cancelling Headphones",
    "Bose",
    "audio",
    24900,
    29900,
    "black",
    "Free",
    "World-class acoustic noise cancelling, Aware Mode, TriPort acoustic architecture, and plush synthetic leather cushions in Triple Black.",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-009",
    "Sennheiser HD 450BT Wireless ANC Headphones",
    "Sennheiser",
    "audio",
    9990,
    14990,
    "black",
    "Free",
    "Active noise cancellation, 30-hour battery life, high-quality wireless codec support including AAC and AptX Low Latency in Matte Black.",
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-010",
    "Apple AirPods Pro 2nd Gen with USB-C MagSafe",
    "Apple",
    "audio",
    21990,
    24900,
    "blush",
    "Free",
    "H2 chip, up to 2x more Active Noise Cancellation, Adaptive Audio, Conversation Awareness, and Personalized Spatial Audio in Pearl White / Blush.",
    "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-011",
    "Sony WH-1000XM5 Premium Noise Cancelling Headphones",
    "Sony",
    "audio",
    28990,
    34990,
    "black",
    "Free",
    "Two processors control 8 microphones for unparalleled noise cancellation. Auto NC Optimizer, 30-hour battery, in Obsidian Black.",
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-012",
    "Harman Kardon Aura Studio 4 Bluetooth Speaker",
    "Harman Kardon",
    "audio",
    25999,
    32999,
    "black",
    "Free",
    "Iconic transparent dome design with diamond-effect ambient illumination and 360-degree room-filling acoustic sound in Smoky Black.",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-013",
    "JBL Flip 6 Waterproof Portable Bluetooth Speaker",
    "JBL",
    "audio",
    9999,
    13999,
    "crimson",
    "Free",
    "2-way speaker system delivering powerful JBL Original Pro Sound. 12 hours playtime, PartyBoost compatible in vibrant Crimson Red.",
    "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-014",
    "OnePlus Buds Pro 2 ANC Wireless Earbuds",
    "OnePlus",
    "audio",
    8999,
    11999,
    "olive",
    "Free",
    "Co-created with Dynaudio, MelodyBoost dual drivers, 48dB Smart Adaptive Noise Cancellation in signature Arbor Olive Green.",
    "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-015",
    "Marshall Stanmore III Bluetooth Home Speaker",
    "Marshall",
    "audio",
    34999,
    41999,
    "tan",
    "Free",
    "Re-engineered wider soundstage, vintage aesthetic, brass control knobs, and rich analog warm tonality in Classic Vintage Cream Tan.",
    "https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-016",
    "boAt Airdopes 141 ANC True Wireless Earbuds",
    "boAt",
    "audio",
    1299,
    4490,
    "navy",
    "Free",
    "32dB Active Noise Cancellation, 42 hours total playtime, ENx technology quad mics, Beast Mode 50ms low latency in Deep Navy Blue.",
    "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-017",
    "Apple AirPods Max Over-Ear Wireless Headphones",
    "Apple",
    "audio",
    54900,
    59900,
    "blush",
    "Free",
    "Apple-designed dynamic driver, computational audio with H1 chips, knit-mesh canopy and memory foam ear cushions in Pink Blush.",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-018",
    "Sennheiser Momentum 4 Wireless ANC Headphones",
    "Sennheiser",
    "audio",
    27990,
    34990,
    "black",
    "Free",
    "Audiophile-inspired 42mm transducer system, adaptive noise cancellation, remarkable 60-hour battery life in Matte Black.",
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-019",
    "Bose SoundLink Flex Bluetooth Outdoor Speaker",
    "Bose",
    "audio",
    13900,
    15900,
    "blue",
    "Free",
    "PositionIQ technology automatically optimizes sound orientation. Waterproof, dustproof, floatable design in Stone Blue.",
    "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-020",
    "Skullcandy Crusher Evo Sensory Bass Headphones",
    "Skullcandy",
    "audio",
    14999,
    19999,
    "tan",
    "Free",
    "Patented adjustable Sensory Haptic Bass, Personal Sound audio profiling with Audiodo, 40-hour battery in Desert Tan.",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-021",
    "Boult Audio Z40 True Wireless Earbuds",
    "Boult",
    "audio",
    999,
    4999,
    "yellow",
    "Free",
    "60 hours massive playtime, Zen Mode environmental noise cancellation, 10mm BoomX tech drivers in Vibrant Mustard Yellow.",
    "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-022",
    "Nothing Ear (a) High-Resolution Wireless Earbuds",
    "Nothing",
    "audio",
    6999,
    9999,
    "yellow",
    "Free",
    "Smart Active Noise Cancellation up to 45dB, LDAC high-res audio certification, iconic transparent bubble case in Bright Yellow.",
    "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-023",
    "Amazon Echo Dot 5th Gen Smart Speaker with Alexa",
    "Amazon",
    "audio",
    4499,
    5499,
    "blue",
    "Free",
    "Bigger vibrant sound with deeper bass and clearer vocals. Voice-controlled smart home hub with motion sensor in Deep Sky Blue.",
    "https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-024",
    "Samsung Galaxy Buds2 Pro Studio Earbuds",
    "Samsung",
    "audio",
    11999,
    19999,
    "navy",
    "Free",
    "24-bit Hi-Fi audio, 3 high-SNR microphones for intelligent ANC, 360 Audio with direct multi-channel in Midnight Navy.",
    "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-025",
    "JBL Tune 760NC Over-Ear Noise Cancelling Headphones",
    "JBL",
    "audio",
    5499,
    7999,
    "crimson",
    "Free",
    "Active Noise Cancelling with JBL Pure Bass Sound, lightweight foldable over-ear design, 35-hour battery in Crimson Red.",
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-026",
    "Zebronics Zeb-Sound Feast 500 Bluetooth Boombox",
    "Zebronics",
    "audio",
    3999,
    7999,
    "olive",
    "Free",
    "50W RMS output with dual passive radiators, RGB LED accents, IPX5 water resistance, shoulder carry strap in Rugged Olive.",
    "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "AUD-027",
    "Marshall Major IV On-Ear Foldable Bluetooth Headphones",
    "Marshall",
    "audio",
    11999,
    14999,
    "tan",
    "Free",
    "Signature Marshall sound, 80+ solid hours of wireless playtime, wireless charging capability in Classic Brown / Tan.",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80"
  ],

  // ════════════════════════════════════════════════════════════════════════════
  // 2. MOBILES & TABLETS (27 Products)
  // ════════════════════════════════════════════════════════════════════════════
  [
    "MOB-001",
    "Redmi Note 13 5G 128GB Ocean Blue",
    "Xiaomi",
    "mobiles",
    16999,
    20999,
    "blue",
    "Free",
    "6.67-inch FHD+ 120Hz AMOLED display, 108MP primary camera, MediaTek Dimensity 6080, slim 7.6mm design in Ocean Blue. Strictly 1 unit in Mumbai store.",
    "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-002",
    "Samsung Galaxy M35 5G 128GB Moonlight Navy",
    "Samsung",
    "mobiles",
    17999,
    24499,
    "navy",
    "Free",
    "Super AMOLED 120Hz display with massive 6000mAh battery, 50MP OIS camera, Exynos 1380 5nm chip in Moonlight Navy.",
    "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-003",
    "OnePlus Nord CE4 5G 128GB Celadon Marble",
    "OnePlus",
    "mobiles",
    24999,
    26999,
    "olive",
    "Free",
    "Snapdragon 7 Gen 3, 100W SUPERVOOC charging, Sony LYT-600 OIS camera, 5500mAh battery in elegant Celadon Marble Olive.",
    "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-004",
    "Apple iPhone 15 128GB Pastel Blue",
    "Apple",
    "mobiles",
    69900,
    79900,
    "blue",
    "Free",
    "A16 Bionic chip, Dynamic Island, advanced 48MP main camera with 2x Telephoto, color-infused durable back glass in Pastel Blue.",
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-005",
    "Google Pixel 8a 128GB Bay Blue",
    "Google",
    "mobiles",
    47999,
    52999,
    "blue",
    "Free",
    "Google Tensor G3 chip, Best Take, Magic Editor AI photography, 120Hz Actua display, 7 years of Pixel Drops in Bay Blue.",
    "https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-006",
    "Moto G45 5G 128GB Navy Marine Vegan Leather",
    "Motorola",
    "mobiles",
    10999,
    12999,
    "navy",
    "Free",
    "Premium vegan leather finish, Snapdragon 6s Gen 3, vibrant 120Hz display with Dolby Atmos stereo speakers in Navy Marine.",
    "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-007",
    "Samsung Galaxy S24 Ultra 5G 256GB Titanium Black",
    "Samsung",
    "mobiles",
    124999,
    134999,
    "black",
    "Free",
    "Titanium frame, 200MP camera with Galaxy AI ProVisual Engine, flat 6.8-inch QHD+ Dynamic AMOLED 2X, integrated S-Pen in Titanium Black.",
    "https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-008",
    "Apple iPhone 15 Pro Max 256GB Natural Titanium Tan",
    "Apple",
    "mobiles",
    144900,
    159900,
    "tan",
    "Free",
    "Forged in aerospace-grade titanium, A17 Pro chip, Action button, 5x optical telephoto lens, USB 3 transfer speeds in Natural Titanium / Tan.",
    "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-009",
    "OnePlus 12 5G 256GB Emerald Green",
    "OnePlus",
    "mobiles",
    61999,
    69999,
    "olive",
    "Free",
    "Snapdragon 8 Gen 3 flagship platform, 4th Gen Hasselblad Camera System, 5400mAh battery with 100W wired & 50W AIRVOOC charging in Emerald Olive.",
    "https://images.unsplash.com/photo-1523206489230-c012c64b2b48?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-010",
    "Nothing Phone (2a) 128GB Dark Smoke Black",
    "Nothing",
    "mobiles",
    21999,
    25999,
    "black",
    "Free",
    "Custom Dimensity 7200 Pro chipset, iconic transparent Glyph Interface, studio-grade 50MP dual cameras in Dark Smoke Black.",
    "https://images.unsplash.com/photo-1530319067432-f2a729c03db5?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-011",
    "Vivo V30 Pro 5G 256GB Andaman Blue",
    "Vivo",
    "mobiles",
    39999,
    46999,
    "blue",
    "Free",
    "ZEISS professional portrait camera system with Sony IMX920 sensor, ultra-slim 3D curved 1.5K 120Hz display in shimmering Andaman Blue.",
    "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-012",
    "Realme 12 Pro+ 5G 256GB Submarine Navy",
    "Realme",
    "mobiles",
    28999,
    34999,
    "navy",
    "Free",
    "Submarine periscope portrait camera with 120X superzoom, luxury watch design dial crafted by Ollivier Saveo in Submarine Navy.",
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-013",
    "Apple iPad Air 11-inch M2 128GB Space Grey",
    "Apple",
    "mobiles",
    56900,
    59900,
    "black",
    "Free",
    "Blazing M2 chip, Liquid Retina display, landscape 12MP front camera with Center Stage, Apple Pencil Pro support in Space Grey / Black.",
    "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-014",
    "Samsung Galaxy Tab S9 FE 128GB Mint Olive",
    "Samsung",
    "mobiles",
    34999,
    44999,
    "olive",
    "Free",
    "10.9-inch 90Hz display, bundled IP68 water-resistant S-Pen, dual AKG speakers, 8000mAh battery in Mint Olive.",
    "https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-015",
    "Xiaomi 14 5G 512GB Leica Optics Black",
    "Xiaomi",
    "mobiles",
    59999,
    79999,
    "black",
    "Free",
    "Snapdragon 8 Gen 3, Leica Summilux optical lens with 50MP Light Fusion 900 sensor, ultra-compact 6.36-inch form factor in Velvet Black.",
    "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-016",
    "Apple iPhone 14 128GB Starlight Blush",
    "Apple",
    "mobiles",
    58999,
    69900,
    "blush",
    "Free",
    "6.1-inch Super Retina XDR display, advanced dual-camera system, Photonic Engine, all-day battery life in Starlight Blush.",
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-017",
    "Google Pixel 8 Pro 128GB Obsidian Black",
    "Google",
    "mobiles",
    79999,
    106999,
    "black",
    "Free",
    "Google Tensor G3, immersive 6.7-inch Super Actua display, triple rear camera with 5x telephoto, Video Boost with Night Sight in Obsidian Black.",
    "https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-018",
    "Samsung Galaxy S23 FE 5G 128GB Sunset Crimson",
    "Samsung",
    "mobiles",
    39999,
    59999,
    "crimson",
    "Free",
    "Dynamic AMOLED 2X 120Hz display, pro-grade 50MP camera with Nightography, aluminum frame in vibrant Sunset Crimson.",
    "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-019",
    "OnePlus Open Foldable 512GB Emerald Dusk",
    "OnePlus",
    "mobiles",
    139999,
    149999,
    "olive",
    "Free",
    "Dual 2K 120Hz ProXDR displays, Hasselblad camera with 64MP periscope telephoto, featherweight titanium and carbon fiber alloy in Emerald Olive.",
    "https://images.unsplash.com/photo-1523206489230-c012c64b2b48?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-020",
    "POCO X6 Pro 5G 256GB Racing Yellow",
    "POCO",
    "mobiles",
    23999,
    30999,
    "yellow",
    "Free",
    "MediaTek Dimensity 8300-Ultra, CrystalRes 1.5K 120Hz Flow AMOLED, 64MP OIS triple camera in iconic Racing Yellow vegan leather.",
    "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-021",
    "Apple iPad 10th Gen 64GB Vibrant Yellow",
    "Apple",
    "mobiles",
    32900,
    39900,
    "yellow",
    "Free",
    "10.9-inch Liquid Retina display, A14 Bionic chip, landscape 12MP Ultra Wide front camera, USB-C connectivity in playful Sunshine Yellow.",
    "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-022",
    "Moto Edge 50 Pro 5G 256GB Black Beauty",
    "Motorola",
    "mobiles",
    29999,
    36999,
    "black",
    "Free",
    "World's first Pantone validated 144Hz curved display, Snapdragon 7 Gen 3, 125W TurboPower charging in handcrafted Black Beauty acetate.",
    "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-023",
    "Xiaomi Pad 6 128GB Mist Blue 11-inch",
    "Xiaomi",
    "mobiles",
    24999,
    39999,
    "blue",
    "Free",
    "11-inch 2.8K 144Hz display, Snapdragon 870, quad stereo speakers with Dolby Atmos, unibody metal chassis in Mist Blue.",
    "https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-024",
    "Samsung Galaxy A55 5G 128GB Ice Blue",
    "Samsung",
    "mobiles",
    36999,
    42999,
    "blue",
    "Free",
    "Metal frame, Gorilla Glass Victus+, 50MP OIS camera, Samsung Knox Vault security with 4 OS upgrades in Awesome Ice Blue.",
    "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-025",
    "Realme GT 6T 5G 256GB Fluid Silver Blush",
    "Realme",
    "mobiles",
    30999,
    35999,
    "blush",
    "Free",
    "Snapdragon 7+ Gen 3, 6000-nit ultra-bright 8T LTPO display, 120W SUPERVOOC charging with 5500mAh battery in Fluid Blush.",
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-026",
    "Nothing Phone (2) 256GB Dark Grey Black",
    "Nothing",
    "mobiles",
    34999,
    49999,
    "black",
    "Free",
    "Snapdragon 8+ Gen 1, custom Glyph Composer, 6.7-inch flexible LTPO OLED, dual 50MP Sony sensors in Dark Grey / Black.",
    "https://images.unsplash.com/photo-1530319067432-f2a729c03db5?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "MOB-027",
    "OnePlus Pad 2 128GB Nimbus Navy Grey",
    "OnePlus",
    "mobiles",
    37999,
    44999,
    "navy",
    "Free",
    "Snapdragon 8 Gen 3 flagship tablet, 12.1-inch 3K 144Hz ReadFit display, 6-speaker spatial audio system in Nimbus Navy.",
    "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80"
  ],

  // ════════════════════════════════════════════════════════════════════════════
  // 3. LAPTOPS & COMPUTING (27 Products)
  // ════════════════════════════════════════════════════════════════════════════
  [
    "LAP-001",
    "HP 15s Ryzen 5 16GB RAM 512GB SSD Jet Black",
    "HP",
    "laptops",
    42990,
    54990,
    "black",
    "Free",
    "15.6-inch FHD micro-edge anti-glare display, AMD Ryzen 5 5500U, 16GB DDR4 RAM, 512GB NVMe SSD, fast charge in Jet Black.",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-002",
    "Lenovo IdeaPad Slim 3 Abyss Blue 15.6-inch",
    "Lenovo",
    "laptops",
    36990,
    51990,
    "blue",
    "Free",
    "Intel Core i3 12th Gen, 8GB RAM, 512GB SSD, FHD IPS display with privacy shutter webcam in Abyss Blue.",
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-003",
    "ASUS Vivobook 15 OLED Indie Black Thin & Light",
    "ASUS",
    "laptops",
    54990,
    74990,
    "black",
    "Free",
    "15.6-inch FHD OLED display with 600 nits peak brightness, Intel Core i5 13th Gen, 16GB RAM, 512GB SSD in Indie Black.",
    "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-004",
    "Apple MacBook Air 13-inch M2 256GB Midnight Navy",
    "Apple",
    "laptops",
    89900,
    99900,
    "navy",
    "Free",
    "Strikingly thin unibody design, Apple M2 chip with 8-core CPU, 13.6-inch Liquid Retina display, MagSafe 3 charging in Midnight Navy.",
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-005",
    "Dell Inspiron 15 3520 16GB RAM Carbon Black",
    "Dell",
    "laptops",
    47990,
    62990,
    "black",
    "Free",
    "Intel Core i5 12th Gen, 16GB DDR4, 512GB SSD, 120Hz refresh display, lift hinge for ergonomic typing in Carbon Black.",
    "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-006",
    "Apple MacBook Pro 14-inch M3 Pro Space Black",
    "Apple",
    "laptops",
    189900,
    199900,
    "black",
    "Free",
    "Apple M3 Pro chip with 11-core CPU and 14-core GPU, 18GB Unified Memory, Liquid Retina XDR display, up to 18 hours battery in Space Black.",
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-007",
    "ASUS ROG Zephyrus G14 Gaming Laptop Eclipse Black",
    "ASUS",
    "laptops",
    149990,
    179990,
    "black",
    "Free",
    "AMD Ryzen 9 8945HS, NVIDIA GeForce RTX 4060, 3K 120Hz OLED ROG Nebula display, CNC aluminum chassis in Eclipse Black.",
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-008",
    "Lenovo Legion Slim 5 Gen 8 Gaming Storm Black",
    "Lenovo",
    "laptops",
    99990,
    129990,
    "black",
    "Free",
    "AMD Ryzen 7 7840HS, NVIDIA RTX 4060 8GB GDDR6, 16-inch WQXGA 165Hz display, Legion Coldfront 5.0 thermals in Storm Black.",
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-009",
    "HP Pavilion Plus 14 OLED Tranquil Blue",
    "HP",
    "laptops",
    74990,
    92990,
    "blue",
    "Free",
    "Intel Core Ultra 5 125H AI processor, 14-inch 2.8K 120Hz IMAX Enhanced OLED, 16GB LPDDR5x, 512GB SSD in Tranquil Blue.",
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-010",
    "Acer Swift Go 14 AI OLED Thin Laptop",
    "Acer",
    "laptops",
    62990,
    79990,
    "black",
    "Free",
    "Intel Core Ultra 5 125H with dedicated Intel AI Boost NPU, 14-inch OLED CineCrystal display, dual fan cooling in Pure Black.",
    "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-011",
    "Dell XPS 13 Plus Ultrabook Graphite Black",
    "Dell",
    "laptops",
    139990,
    169990,
    "black",
    "Free",
    "Seamless glass touchpad, zero-lattice keyboard, capacitive touch function row, 13.4-inch FHD+ InfinityEdge display in Graphite Black.",
    "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-012",
    "Microsoft Surface Laptop 5 Matte Black Touchscreen",
    "Microsoft",
    "laptops",
    94990,
    112990,
    "black",
    "Free",
    "Intel Core i5 12th Gen Evo, 13.5-inch PixelSense touchscreen with Dolby Vision IQ, Omnisonic speakers in Matte Black metal.",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-013",
    "Apple MacBook Air 15-inch M3 Starlight Blush",
    "Apple",
    "laptops",
    124900,
    134900,
    "blush",
    "Free",
    "Spacious 15.3-inch Liquid Retina display, M3 chip with hardware-accelerated ray tracing, up to 18 hours battery life in Starlight Blush.",
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-014",
    "HP Victus 15 Gaming Laptop Performance Crimson Red",
    "HP",
    "laptops",
    58990,
    76990,
    "crimson",
    "Free",
    "AMD Ryzen 5 7535HS, NVIDIA GeForce RTX 2050, 15.6-inch 144Hz FHD IPS display, OMEN Gaming Hub control in Performance Crimson.",
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-015",
    "Lenovo ThinkPad E14 Gen 5 Business Laptop Black",
    "Lenovo",
    "laptops",
    61990,
    82990,
    "black",
    "Free",
    "MIL-SPEC 810H tested durability, Intel Core i5 13th Gen, 16GB RAM, iconic TrackPoint navigation, fingerprint reader in Classic Black.",
    "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-016",
    "ASUS Zenbook 14 OLED Ponder Navy Blue",
    "ASUS",
    "laptops",
    89990,
    112990,
    "navy",
    "Free",
    "Intel Core Ultra 7 155H, 14-inch 3K 120Hz ASUS Lumina OLED display, 75Wh battery with 15 hours life, 1.2kg ultralight in Ponder Navy.",
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-017",
    "Acer Nitro V 15 Gaming Laptop Obsidian Black",
    "Acer",
    "laptops",
    67990,
    84990,
    "black",
    "Free",
    "Intel Core i5 13th Gen 13420H, NVIDIA GeForce RTX 4050 6GB GDDR6, 144Hz FHD IPS, dual intake cooling in Obsidian Black.",
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-018",
    "Samsung Galaxy Book4 Pro 360 Moonstone Tan",
    "Samsung",
    "laptops",
    154990,
    179990,
    "tan",
    "Free",
    "2-in-1 convertible touchscreen with bundled S-Pen, Intel Core Ultra 7, Dynamic AMOLED 2X 120Hz in Champagne Moonstone Tan.",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-019",
    "HP Envy x360 2-in-1 Touchscreen Laptop Silver Blush",
    "HP",
    "laptops",
    82990,
    104990,
    "blush",
    "Free",
    "360-degree hinge, AMD Ryzen 7 7730U, 15.6-inch edge-to-edge touchscreen, 5MP IR privacy camera with manual shutter in Soft Blush.",
    "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-020",
    "Dell Alienware m16 R2 Gaming Laptop Dark Metallic",
    "Dell",
    "laptops",
    179990,
    219990,
    "black",
    "Free",
    "Intel Core Ultra 7 155H, NVIDIA GeForce RTX 4070 8GB, 240Hz QHD+ display, AlienFX per-key RGB lighting in Dark Metallic Black.",
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-021",
    "Lenovo Yoga Slim 7x Copilot+ AI PC Cosmic Blue",
    "Lenovo",
    "laptops",
    139990,
    164990,
    "blue",
    "Free",
    "Snapdragon X Elite processor with 45 TOPS NPU, 14.5-inch 3K 90Hz PureSight OLED, 70Wh battery in Cosmic Blue.",
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-022",
    "MSI Thin 15 Gaming Laptop Crimson Accent Black",
    "MSI",
    "laptops",
    49990,
    69990,
    "crimson",
    "Free",
    "Intel Core i5 12th Gen, NVIDIA GeForce RTX 3050, 144Hz IPS display, brushed aluminum chassis with red backlit keyboard in Crimson Accent Black.",
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-023",
    "ASUS TUF Gaming F15 Mecha Military Olive",
    "ASUS",
    "laptops",
    59990,
    79990,
    "olive",
    "Free",
    "Intel Core i5 11th Gen, NVIDIA RTX 3050, 144Hz adaptive sync, MIL-STD-810H certified military grade chassis in Mecha Olive.",
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-024",
    "Apple MacBook Pro 16-inch M3 Max Space Black",
    "Apple",
    "laptops",
    349900,
    399900,
    "black",
    "Free",
    "Apple M3 Max with 16-core CPU, 40-core GPU, 48GB unified memory, 16.2-inch Liquid Retina XDR display, 22-hour battery life in Space Black.",
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-025",
    "Acer Aspire 5 15.6-inch Core i5 Steel Navy",
    "Acer",
    "laptops",
    44990,
    59990,
    "navy",
    "Free",
    "Intel Core i5 13th Gen, 16GB DDR4, 512GB SSD, Acer TNR solution for AI noise reduction on calls in Steel Navy Blue.",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-026",
    "Apple Mac Mini M2 Pro Desktop Workstation",
    "Apple",
    "laptops",
    119900,
    129900,
    "black",
    "Free",
    "Apple M2 Pro chip with 10-core CPU and 16-core GPU, 16GB unified memory, four Thunderbolt 4 ports, compact aluminum powerhouse in Space Grey / Black.",
    "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "LAP-027",
    "Lenovo IdeaPad Gaming 3 Onyx Black",
    "Lenovo",
    "laptops",
    52990,
    72990,
    "black",
    "Free",
    "AMD Ryzen 5 6600H, NVIDIA RTX 3050, 120Hz IPS FHD, signature blue accent rear vents, rapid charge 50% in 30 mins in Onyx Black.",
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80"
  ],

  // ════════════════════════════════════════════════════════════════════════════
  // 4. FASHION & APPAREL (28 Products)
  // ════════════════════════════════════════════════════════════════════════════
  [
    "FAS-001",
    "Allen Solly Men's Slim Fit Sky Blue Formal Shirt",
    "Allen Solly",
    "fashion",
    1299,
    2199,
    "blue",
    "S, M, L, XL",
    "100% premium long-staple cotton, semi-cutaway collar, single cuff, crisp breathable weave. Men's formal tops and shirts collection in Sky Blue.",
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-002",
    "Levi's 511 Slim Fit Men's Classic Blue Denim Jeans",
    "Levi's",
    "fashion",
    2199,
    3999,
    "blue",
    "S, M, L, XL",
    "Between a skinny and straight fit. Cut close without being too tight, stretch denim with authentic washed whiskers. Men's jeans and chinos in Indigo Blue.",
    "https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-003",
    "Fabindia Men's Pure Cotton Handblock Olive Green Kurta",
    "Fabindia",
    "fashion",
    1890,
    2690,
    "olive",
    "S, M, L, XL",
    "Handblock printed artisan cotton kurta with a mandarin collar, mother-of-pearl buttons, side slits. Men's ethnic kurtas and festive wear in Earthy Olive.",
    "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-004",
    "Peter England Men's Classic Pique Polo T-Shirt Crimson",
    "Peter England",
    "fashion",
    799,
    1499,
    "crimson",
    "S, M, L, XL",
    "100% combed cotton pique knit, ribbed polo collar and sleeve cuffs, subtle embroidered crest on chest. Men's casual tops and t-shirts in Crimson Red.",
    "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-005",
    "W for Woman Women's Printed Anarkali Kurta Set Blush Pink",
    "W for Woman",
    "fashion",
    2799,
    5499,
    "blush",
    "S, M, L, XL",
    "Flared Anarkali kurta crafted from soft viscose georgette with zari thread embroidery, churidar pants, and a sheer dupatta. Women's dresses and kurtas in Blush Pink.",
    "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-006",
    "Raymond Men's Premium Wool Blend Crimson Wine Blazer",
    "Raymond",
    "fashion",
    5999,
    9999,
    "crimson",
    "M, L, XL",
    "Tailored single-breasted blazer with notch lapels, structured chest piece, dual back vents in luxurious wool blend. Men's outerwear in Crimson Wine.",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-007",
    "Tommy Hilfiger Men's Oxford Mustard Yellow Casual Shirt",
    "Tommy Hilfiger",
    "fashion",
    3499,
    5999,
    "yellow",
    "S, M, L, XL",
    "Pure organic cotton heavy Oxford weave, button-down collar, embroidered flag logo on chest pocket. Men's casual tops and shirts in Mustard Yellow.",
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-008",
    "Van Heusen Men's Flat-Front Charcoal Black Formal Trousers",
    "Van Heusen",
    "fashion",
    1699,
    2799,
    "black",
    "S, M, L, XL",
    "Wrinkle-resistant poly-viscose blend, comfort expandable waistband, slant side pockets. Men's trousers, chinos, and pants in Charcoal Black.",
    "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-009",
    "Fossil Grant Chronograph Men's Matte Black Leather Watch",
    "Fossil",
    "fashion",
    9495,
    13995,
    "black",
    "Free",
    "44mm stainless steel case, Roman numeral markers, stopwatch sub-dials, genuine interchangeable black leather strap. Men's watches and bags in Matte Black.",
    "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-010",
    "Ray-Ban Classic Aviator Sunglasses G-15 Black Lens",
    "Ray-Ban",
    "fashion",
    7890,
    9590,
    "black",
    "Free",
    "Original teardrop metal frame, crystal green/black G-15 UV protection lenses, clear silicone nose pads. Unisex eyewear and sunglasses in Polished Black.",
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-011",
    "Calvin Klein Men's Reversible Rich Cognac Tan Leather Belt",
    "Calvin Klein",
    "fashion",
    2499,
    4499,
    "tan",
    "S, M, L, XL",
    "Hand-finished full-grain Italian leather, swivel plaque buckle switching between rich cognac tan and black. Men's accessories in Cognac Tan.",
    "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-012",
    "Puma Classic Relaxed Fleece Hoodie Crimson Scarlet",
    "Puma",
    "fashion",
    1999,
    3999,
    "crimson",
    "S, M, L, XL",
    "Brushed fleece interior, kangaroo pocket, drawcord hood, ribbed cuffs, embroidered Archive No.1 logo. Men's tops and outerwear in Crimson Scarlet.",
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-013",
    "Roadster Men's Washed Indigo Blue Denim Trucker Jacket",
    "Roadster",
    "fashion",
    1799,
    3499,
    "blue",
    "S, M, L, XL",
    "Rugged heavy-weight cotton denim jacket with copper shank buttons, flap chest pockets, adjustable waist tabs. Men's outerwear and tops in Indigo Blue.",
    "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-014",
    "Roadster Men's Casual Plaid Checkered Navy Blue Shirt",
    "Roadster",
    "fashion",
    899,
    1999,
    "navy",
    "S, M, L, XL",
    "Soft brushed cotton twill flannel shirt with spread collar, twin patch pockets, curved hem. Men's casual tops and shirts in Deep Navy Blue.",
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-015",
    "Roadster Men's Olive Cargo Multi-Pocket Jogger Pants",
    "Roadster",
    "fashion",
    1299,
    2599,
    "olive",
    "S, M, L, XL",
    "Stretch cotton twill cargo joggers with elasticated waistband and ankle cuffs, 6 tactical utility pockets. Men's jeans, chinos, and joggers in Tactical Olive.",
    "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-016",
    "Lavie Women's Structured Satchel Handbag Rich Cognac Tan",
    "Lavie",
    "fashion",
    1899,
    4299,
    "tan",
    "Free",
    "Textured premium faux leather satchel with metal feet, dual top handles, detachable crossbody strap. Women's bags and accessories in Cognac Tan.",
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-017",
    "Lavie Women's Quilted Shoulder Tote Bag Blush Pink",
    "Lavie",
    "fashion",
    1699,
    3899,
    "blush",
    "Free",
    "Spacious chevron quilted shoulder tote with gold chain strap detail, zip divider pocket, fits 13-inch laptop. Women's bags in Soft Blush Pink.",
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-018",
    "Lavie Women's Elegant Flap Backpack Matte Black",
    "Lavie",
    "fashion",
    1599,
    3499,
    "black",
    "Free",
    "Chic city daypack with magnetic flap closure, interior organizers, adjustable padded shoulder straps. Women's bags in Matte Black.",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-019",
    "Fossil Jacqueline Women's Rose Gold Blush Mesh Watch",
    "Fossil",
    "fashion",
    8995,
    12495,
    "blush",
    "Free",
    "36mm slim profile case, Roman numerals with date window, stainless steel rose gold mesh strap. Women's watches in Rose Gold / Blush.",
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-020",
    "Fabindia Women's Chanderi Silk Embroidered Mustard Yellow Kurta",
    "Fabindia",
    "fashion",
    2490,
    3490,
    "yellow",
    "S, M, L, XL",
    "Lustrous Chanderi silk blend with delicate zari needlework around the round neck, three-quarter sleeves. Women's kurtas, sarees, and dresses in Mustard Yellow.",
    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-021",
    "Manyavar Men's Royal Silk Blend Embroidered Cream Tan Sherwani",
    "Manyavar",
    "fashion",
    9999,
    14999,
    "tan",
    "M, L, XL",
    "Royal festive sherwani with self-design jacquard weave, Mandarin collar with stone buttons, churidar set. Men's ethnic kurtas and festive wear in Cream Tan.",
    "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-022",
    "Biba Women's Festive Floral Banarasi Saree Crimson Red",
    "Biba",
    "fashion",
    3999,
    7999,
    "crimson",
    "Free",
    "Woven Banarasi silk saree with ornate golden floral jaal and broad pallu border, includes matching unstitched blouse piece. Women's sarees in Crimson Red.",
    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-023",
    "Ray-Ban Wayfarer Polarized Sunglasses Matte Tortoise Tan",
    "Ray-Ban",
    "fashion",
    8490,
    10290,
    "tan",
    "Free",
    "Iconic square acetate silhouette, crystal brown polarized lenses, metal temple rivets. Unisex eyewear and sunglasses in Matte Tortoise Tan.",
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-024",
    "H&M Men's Relaxed Fit Organic Cotton Tee Forest Olive",
    "H&M",
    "fashion",
    799,
    1299,
    "olive",
    "S, M, L, XL",
    "Heavyweight organic cotton jersey, dropped shoulders, ribbed crew neckline. Men's casual tops and t-shirts in Forest Olive Green.",
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-025",
    "Levi's Kids Boys Graphic Crewneck T-Shirt Royal Blue",
    "Levi's",
    "fashion",
    699,
    1299,
    "blue",
    "S, M, L",
    "100% soft breathable cotton jersey with classic Levi's batwing logo print. Kids boys tops and t-shirts collection in Royal Blue.",
    "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-026",
    "H&M Kids Girls Floral Ruffled Dress Blush Pink",
    "H&M",
    "fashion",
    999,
    1799,
    "blush",
    "S, M, L",
    "Lightweight cotton voile dress with ruffled cap sleeves, all-over wildflower floral print, gathered waist. Kids girls dresses in Soft Blush Pink.",
    "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-027",
    "Tommy Hilfiger Kids Embroidered Polo Shirt Navy Blue",
    "Tommy Hilfiger",
    "fashion",
    1499,
    2799,
    "navy",
    "S, M, L",
    "Classic pique cotton knit with two-button placket, signature tipping on ribbed collar and cuffs. Kids boys tops and polo shirts in Navy Blue.",
    "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FAS-028",
    "Wildcraft Men's 35L Waterproof Tech Backpack Obsidian Black",
    "Wildcraft",
    "fashion",
    1899,
    3499,
    "black",
    "Free",
    "Reinforced ripstop nylon, multi-tier organizers, padded 15.6-inch laptop compartment with airflow back panel. Men's bags and backpacks in Obsidian Black.",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80"
  ],

  // ════════════════════════════════════════════════════════════════════════════
  // 5. FOOTWEAR (28 Products)
  // ════════════════════════════════════════════════════════════════════════════
  [
    "FTW-001",
    "Nike Revolution 7 Men's Road Running Shoes Royal Blue",
    "Nike",
    "footwear",
    2695,
    3695,
    "blue",
    "S, M, L, XL",
    "Soft foam midsole, breathable engineered mesh upper, generative traction rubber outsole. Men's sneakers and running shoes in Royal Blue.",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-002",
    "Puma Smash V2 Leather Low-Top Sneakers Black",
    "Puma",
    "footwear",
    2199,
    3999,
    "black",
    "S, M, L, XL",
    "Tennis-inspired silhouette with soft leather upper, SoftFoam+ comfort insert sockliner, durable rubber outsole. Men's casual sneakers in Black.",
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-003",
    "Bata Men's Formal Oxford Genuine Leather Shoes Cognac Tan",
    "Bata",
    "footwear",
    1799,
    2999,
    "tan",
    "S, M, L, XL",
    "Full-grain leather upper with closed-lacing Oxford construction, cushioned footbed, anti-skid TPR sole. Men's formal leather shoes and loafers in Cognac Tan.",
    "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-004",
    "Woodland Men's Oiled Nubuck Leather Trekking Boots Tan",
    "Woodland",
    "footwear",
    4195,
    5495,
    "tan",
    "S, M, L, XL",
    "Heavy-duty oiled nubuck leather, rust-proof hexagonal eyelets, deep grooved lug rubber sole for rough outdoor terrain. Men's boots in Rustic Tan.",
    "https://images.unsplash.com/photo-1542841791-1925b02a2bbb?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-005",
    "Crocs Classic Unisex Lightweight Foam Clogs Navy Blue",
    "Crocs",
    "footwear",
    2295,
    2995,
    "navy",
    "S, M, L, XL",
    "Legendary Croslite foam cushioning, pivoting heel straps for a secure fit, ventilation ports shed water and debris. Unisex clogs, slides, and sandals in Navy Blue.",
    "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-006",
    "Nike Air Jordan 1 Low Retro Basketball Shoes Crimson Red",
    "Nike",
    "footwear",
    8995,
    10295,
    "crimson",
    "S, M, L, XL",
    "Encapsulated Air-Sole unit provides lightweight cushioning, genuine leather upper with stitched Wings logo on heel. Men's sneakers and shoes in Chicago Crimson Red.",
    "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-007",
    "Adidas Ultraboost Light Running Shoes Cloud White Blush",
    "Adidas",
    "footwear",
    12999,
    18999,
    "blush",
    "S, M, L, XL",
    "Lightest BOOST foam yet with 30% lighter material, Linear Energy Push system, Primeknit+ textile upper in Cloud White / Blush.",
    "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-008",
    "Red Tape Men's Athleisure Lightweight Walking Shoes Olive",
    "Red Tape",
    "footwear",
    1599,
    4999,
    "olive",
    "S, M, L, XL",
    "Breathable flyknit mesh upper, memory foam insole, ultra-flexible EVA sole for all-day city walking. Men's sneakers and walking shoes in Tactical Olive.",
    "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-009",
    "Birkenstock Arizona EVA Waterproof Double-Strap Slides Black",
    "Birkenstock",
    "footwear",
    3990,
    4490,
    "black",
    "S, M, L, XL",
    "Anatomically shaped footbed made of ultra-light, shock-absorbent, skin-friendly EVA foam with two adjustable pin buckles. Unisex slides and sandals in Black.",
    "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-010",
    "Clarks Men's Tilden Cap Full-Grain Leather Oxford Derby Black",
    "Clarks",
    "footwear",
    5499,
    7999,
    "black",
    "S, M, L, XL",
    "Supple full-grain leather with discreet elastic stretch gores, OrthoLite footbed with Cushion Soft technology. Men's formal leather shoes and loafers in Black.",
    "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-011",
    "Crocs Classic Unisex Clogs Warm Sand Tan",
    "Crocs",
    "footwear",
    2495,
    2995,
    "tan",
    "S, M, L, XL",
    "Lightweight waterproof Croslite construction, room for Jibbitz charms, odor-resistant and easy to clean. Unisex clogs, slides, and sandals in Warm Sand Tan.",
    "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-012",
    "ASICS Gel-Kayano 30 Stability Road Running Shoes Cobalt Blue",
    "ASICS",
    "footwear",
    12999,
    15999,
    "blue",
    "S, M, L, XL",
    "4D GUIDANCE SYSTEM adaptive stability, PureGEL rearfoot technology, lightweight FF BLAST PLUS ECO cushioning. Men's running shoes and sneakers in Cobalt Blue.",
    "https://images.unsplash.com/photo-1562183241-b937e95585b6?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-013",
    "Adidas Samba OG Leather Indoor Retro Sneakers Black White",
    "Adidas",
    "footwear",
    7999,
    9999,
    "black",
    "S, M, L, XL",
    "Soft leather upper with suede T-toe overlay, 3-Stripes branding, low-profile gum rubber outsole. Unisex iconic retro sneakers in Black and White.",
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-014",
    "Nike Air Force 1 '07 Basketball Sneakers Triple White Blush",
    "Nike",
    "footwear",
    7495,
    8195,
    "blush",
    "S, M, L, XL",
    "Stitched leather overlays on the upper, Nike Air cushioning originally designed for hoops, perforated toe box in Crisp White with Soft Blush accents.",
    "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-015",
    "New Balance 574 Core Heritage Casual Sneakers Forest Olive",
    "New Balance",
    "footwear",
    6999,
    8999,
    "olive",
    "S, M, L, XL",
    "Suede and mesh upper, lightweight ENCAP midsole cushioning combining soft foam with durable polyurethane rim in Forest Olive Green.",
    "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-016",
    "Puma Softride Enzo Men's Athletic Running Shoes Crimson Red",
    "Puma",
    "footwear",
    2799,
    5499,
    "crimson",
    "S, M, L, XL",
    "SOFTRIDE foam technology for extreme cushioning and all-day comfort, progressive bootie upper with bold collar branding in Crimson Red.",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-017",
    "Woodland Men's Rugged Casual Leather Ankle Boots Olive Green",
    "Woodland",
    "footwear",
    3995,
    5295,
    "olive",
    "S, M, L, XL",
    "High-top padded ankle support, full-grain rugged leather, reinforced heel and toe bumpers, oil-resistant cleated tread. Men's boots in Tactical Olive.",
    "https://images.unsplash.com/photo-1542841791-1925b02a2bbb?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-018",
    "Skechers Go Walk 6 Slip-On Breathable Walking Shoes Navy Blue",
    "Skechers",
    "footwear",
    3499,
    5999,
    "navy",
    "S, M, L, XL",
    "High-rebound ultra-lightweight Hyper Pillar Technology, Air-Cooled Goga Mat breathable insole, stretch fit knit upper in Deep Navy Blue.",
    "https://images.unsplash.com/photo-1562183241-b937e95585b6?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-019",
    "Converse Chuck Taylor All Star High-Top Canvas Sneakers Yellow",
    "Converse",
    "footwear",
    3299,
    4499,
    "yellow",
    "S, M, L, XL",
    "Timeless high-top canvas upper, star ankle patch, rubber toe cap, OrthoLite insole for stepped-up comfort in Sunflower Yellow.",
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-020",
    "Vans Old Skool Skate Shoes Canvas & Suede Black",
    "Vans",
    "footwear",
    3799,
    4999,
    "black",
    "S, M, L, XL",
    "Durable suede and canvas uppers, re-enforced toe caps, supportive padded collars, signature rubber waffle outsoles in Core Black and White.",
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-021",
    "Metro Women's Pointed-Toe Elegant Stiletto Heels Blush Pink",
    "Metro",
    "footwear",
    1990,
    3490,
    "blush",
    "S, M, L, XL",
    "3-inch slender stiletto heel, cushioned inner sock, slip-on pointed pump silhouette in gloss Blush Pink patent.",
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-022",
    "Mochi Women's Block Heel Handcrafted Ethnic Sandals Tan",
    "Mochi",
    "footwear",
    1690,
    2990,
    "tan",
    "S, M, L, XL",
    "Comfortable 2-inch block heel, braided faux leather cross straps with elasticated ankle slingback. Women's sandals, loafers, and heels in Warm Tan.",
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-023",
    "Catwalk Women's Chunky Platform Fashion Sneakers Midnight Navy",
    "Catwalk",
    "footwear",
    2199,
    3999,
    "navy",
    "S, M, L, XL",
    "1.8-inch elevated lightweight platform sole, padded collar, breathable multi-panel upper in Midnight Navy.",
    "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-024",
    "Woodland Men's Outdoor Waterproof Trekking Sandals Tan",
    "Woodland",
    "footwear",
    2495,
    3295,
    "tan",
    "S, M, L, XL",
    "Quick-drying nubuck straps, triple hook-and-loop adjustable closures, contoured footbed with rugged grooved rubber sole. Men's sandals in Earth Tan.",
    "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-025",
    "Puma Kids Boys Smash V2 Hook & Loop Sneakers Royal Blue",
    "Puma",
    "footwear",
    1499,
    2799,
    "blue",
    "S, M, L",
    "Double hook-and-loop velcro straps for easy on-off, durable synthetic leather upper, non-marking rubber outsole. Kids boys sneakers in Royal Blue.",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-026",
    "Crocs Kids Classic Clogs Sunflower Yellow",
    "Crocs",
    "footwear",
    1795,
    2295,
    "yellow",
    "S, M, L",
    "Featherweight Croslite foam clogs, pivoting heel strap for custom fit, easy to clean water-friendly design. Kids clogs and sandals in Sunflower Yellow.",
    "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-027",
    "Sparx Men's Sporty Running Shoes Crimson & Black",
    "Sparx",
    "footwear",
    999,
    1699,
    "crimson",
    "S, M, L, XL",
    "Engineered mesh upper for airflow, dual-density phylon midsole, anti-skid grooved rubber pods. Men's budget running shoes in Crimson and Black.",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "FTW-028",
    "Woodland Men's Handstitched Suede Loafers Cognac Tan",
    "Woodland",
    "footwear",
    3295,
    4495,
    "tan",
    "S, M, L, XL",
    "Genuine suede leather slip-on driving moccasins with handstitched toe detailing and flexible pebble rubber pod sole. Men's loafers in Cognac Tan.",
    "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=900&q=80"
  ],

  // ════════════════════════════════════════════════════════════════════════════
  // 6. HOME & KITCHEN (28 Products)
  // ════════════════════════════════════════════════════════════════════════════
  [
    "HOM-001",
    "Prestige Iris 750W 3-Jar Mixer Grinder Glossy Black",
    "Prestige",
    "home",
    2899,
    4495,
    "black",
    "Free",
    "Heavy-duty 750-watt pure copper motor, 3 stainless steel multipurpose jars with transparent lids, 3-speed control with whip pulse in Glossy Black.",
    "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-002",
    "Milton Thermosteel Flip Lid Vacuum Flask 1L Champagne Tan",
    "Milton",
    "home",
    999,
    1490,
    "tan",
    "Free",
    "Double-walled 304 food-grade stainless steel with copper coating inside. Keeps beverages hot or cold for 24 hours in Champagne Tan.",
    "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-003",
    "Pigeon by Stovekraft Non-Stick 3-Piece Cookware Set Cherry Crimson",
    "Pigeon",
    "home",
    1499,
    3495,
    "crimson",
    "Free",
    "Includes 24cm fry pan, 24cm kadai with stainless steel lid, and flat tawa. 5-layer Greblon non-stick coating in Cherry Crimson Red.",
    "https://images.unsplash.com/photo-1584990347449-389f417fec74?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-004",
    "Philips Digital Air Fryer HD9252 4.1L Rapid Air Deep Black",
    "Philips",
    "home",
    6999,
    11995,
    "black",
    "Free",
    "Patented Rapid Air starfish design cooks with up to 90% less fat. Touch screen with 7 presets, keep warm mode in Deep Black.",
    "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-005",
    "Bajaj Rex 500W Mixer Grinder Sunburst Yellow Accent",
    "Bajaj",
    "home",
    1999,
    3210,
    "yellow",
    "Free",
    "500-watt titan motor with overload protection, rust-proof stainless steel jars, ergonomic handles with Sunburst Yellow Accents.",
    "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-006",
    "Havells Festiva 1200mm Decorative Ceiling Fan Antique Brass Tan",
    "Havells",
    "home",
    2899,
    4290,
    "tan",
    "Free",
    "High-speed 390 RPM motor with aerodynamically contoured blades, metallic paint finish with decorative canopy trims in Antique Brass / Tan.",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-007",
    "Dyson V8 Cordless Stick Vacuum Cleaner Cobalt Blue Wand",
    "Dyson",
    "home",
    29900,
    39900,
    "blue",
    "Free",
    "Dyson digital motor V8 spins at up to 110,000rpm. Up to 40 minutes fade-free suction, whole-machine advanced filtration in Cobalt Blue Wand.",
    "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-008",
    "De'Longhi Dedica Deluxe Pump Espresso Machine Gloss Crimson Red",
    "De'Longhi",
    "home",
    21990,
    28990,
    "crimson",
    "Free",
    "15-bar professional pressure pump, Thermoblock rapid heating technology, manual milk frothing steam wand in slim 6-inch Gloss Crimson Red.",
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-009",
    "Instant Pot Duo 7-in-1 Electric Pressure Cooker 6L Brushed Black",
    "Instant Pot",
    "home",
    8999,
    13999,
    "black",
    "Free",
    "Replaces 7 kitchen appliances: pressure cooker, slow cooker, rice cooker, steamer, sauté pan, yogurt maker, food warmer in Brushed Stainless / Black.",
    "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-010",
    "Mi Smart Air Purifier 4 with True HEPA Filter Blush White",
    "Xiaomi",
    "home",
    13999,
    19999,
    "blush",
    "Free",
    "CADR up to 400m3/h, 360-degree filtration traps 99.97% of particles as small as 0.3 microns, smart OLED touch display in Minimalist Blush White.",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-011",
    "Morphy Richards 24L Convection Microwave Oven Mirror Black",
    "Morphy Richards",
    "home",
    11499,
    16995,
    "black",
    "Free",
    "Bake, grill, reheat, and defrost with 200 auto-cook menus, motorized rotisserie, stainless steel cavity in Mirror Glass Black.",
    "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-012",
    "Lodge 10.25-inch Pre-Seasoned Cast Iron Skillet Deep Black",
    "Lodge",
    "home",
    3499,
    4999,
    "black",
    "Free",
    "Crafted in South Pittsburg, Tennessee. Seasoned with 100% natural vegetable oil for superior heat retention and even searing in Deep Black.",
    "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-013",
    "Hawkins Contura Hard Anodized 3L Pressure Cooker Jet Black",
    "Hawkins",
    "home",
    1775,
    2150,
    "black",
    "Free",
    "Curved body design for easy stirring, 3.25mm extra-thick base, hard anodized body doesn't react with acidic foods in Jet Black.",
    "https://images.unsplash.com/photo-1584990347449-389f417fec74?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-014",
    "Prestige Deluxe Alpha Stainless Steel 3L Pressure Cooker Champagne Tan",
    "Prestige",
    "home",
    2199,
    2850,
    "tan",
    "Free",
    "Heavy-gauge Alpha base induction compatible, unique pressure indicator, controlled gasket release system in Warm Champagne Polished Steel.",
    "https://images.unsplash.com/photo-1584990347449-389f417fec74?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-015",
    "Wonderchef Nutri-blend 400W Mixer Blender Machine Crimson Red",
    "Wonderchef",
    "home",
    2499,
    5000,
    "crimson",
    "Free",
    "High-speed 22,000 RPM super-fast motor, surgical-grade 4-wing stainless steel blades extracts every micro-nutrient in Gloss Crimson Red.",
    "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-016",
    "Kent Grand Plus RO + UV + UF Water Purifier Pure White Blush",
    "Kent",
    "home",
    14999,
    20000,
    "blush",
    "Free",
    "Multi-stage purification with in-tank UV disinfection, Mineral RO technology retains essential natural minerals, 9L storage in Pure White / Blush.",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-017",
    "Dyson Supersonic Hair Dryer Prussian Blue & Rich Copper",
    "Dyson",
    "home",
    32900,
    39900,
    "blue",
    "Free",
    "Intelligent heat control protects hair from extreme heat damage. V9 digital motor with magnetic styling attachments in Prussian Blue & Copper.",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-018",
    "Philips Daily Collection 300W Hand Mixer Eggshell Blush",
    "Philips",
    "home",
    1899,
    2495,
    "blush",
    "Free",
    "Cone-shaped beaters work up to 20% faster, 5 speed settings plus turbo function, lightweight ergonomic body in Soft Eggshell Blush.",
    "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-019",
    "Eureka Forbes Quick Clean DX Portable Vacuum Cleaner Crimson",
    "Eureka Forbes",
    "home",
    3299,
    4999,
    "crimson",
    "Free",
    "1200-watt suction motor, automatic cord winder, dust bag full indicator, 3 swivel wheels for 360-degree mobility in Sporty Crimson Red.",
    "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-020",
    "Borosil Prime Grill Sandwich Maker Non-Stick Matte Black",
    "Borosil",
    "home",
    1699,
    2590,
    "black",
    "Free",
    "700W heating element, deep ribbed non-stick grill plates, automatic temperature cut-off, upright storage latch in Matte Black.",
    "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-021",
    "Pigeon Cruise 1800W Induction Cooktop Glossy Black",
    "Pigeon",
    "home",
    1599,
    3195,
    "black",
    "Free",
    "7 preset Indian cooking menus, dual heat sensor technology, high-grade micro-crystal glass plate with LED digital display in Glossy Black.",
    "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-022",
    "Faber 60cm 1200m3/h Curved Glass Auto-Clean Chimney Black",
    "Faber",
    "home",
    11990,
    24990,
    "black",
    "Free",
    "Thermal auto-clean technology with oil collector, gesture control with wave sensor, baffle filter-less design in Toughened Black Glass.",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-023",
    "Bajaj New Shakti 15L Storage Water Heater Ivory Blush",
    "Bajaj",
    "home",
    5799,
    9950,
    "blush",
    "Free",
    "Titanium Armor Technology tank coating, swirl flow technology for 20% more hot water, 8-bar pressure rated for high-rise buildings in Ivory Blush.",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-024",
    "Milton Glassy Vacuum Insulated Water Jug 2L Ocean Blue",
    "Milton",
    "home",
    1299,
    1890,
    "blue",
    "Free",
    "PUF insulated thermal dispenser jug with leak-proof tap and integrated carry handle. Keeps water ice cold for up to 12 hours in Ocean Blue.",
    "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-025",
    "Prestige Omega Deluxe Granite 3-Piece Cookware Set Olive Green",
    "Prestige",
    "home",
    2599,
    4250,
    "olive",
    "Free",
    "Granite spatter non-stick coating with 5-layer German technology, metal spoon friendly, dishwasher safe in Rustic Olive Green.",
    "https://images.unsplash.com/photo-1584990347449-389f417fec74?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-026",
    "Tupperware Aquasafe 1L Water Bottles (Set of 4) Multicolor Yellow",
    "Tupperware",
    "home",
    999,
    1400,
    "yellow",
    "Free",
    "100% virgin food-grade plastic, spill-proof fliptop cap, ergonomic silhouette fits standard refrigerator door pockets in Sunburst Yellow.",
    "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-027",
    "Sleepyhead Orthopedic Memory Foam Pillow Cooling Bamboo Tan",
    "Sleepyhead",
    "home",
    1699,
    2999,
    "tan",
    "Free",
    "High-density pressure-relieving memory foam with pinhole ventilation and breathable antibacterial bamboo fabric cover in Natural Tan.",
    "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80"
  ],
  [
    "HOM-028",
    "Pigeon Glass Top 3-Burner Gas Stove Toughened Glass Black",
    "Pigeon",
    "home",
    2999,
    5995,
    "black",
    "Free",
    "High-thermal-efficiency brass tri-pin burners, shatterproof black toughened glass top, ergonomic nylon control knobs in Obsidian Black.",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80"
  ]
];

async function seedCompleteCatalog() {
  console.log(`[seed-complete-catalog] Starting seed of ${ALL_PRODUCTS.length} curated products...`);

  // Ensure DB columns exist
  await query("ALTER TABLE products ADD COLUMN IF NOT EXISTS color VARCHAR(40) DEFAULT 'black'");
  await query("ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT DEFAULT 'S, M, L, XL, Free'");
  await query("ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp_paise BIGINT");
  await query("ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(2, 1) DEFAULT 4.5");
  await query("ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 12");

  // Fetch category map
  const { rows: catRows } = await query("SELECT id, slug FROM categories");
  const catMap = Object.fromEntries(catRows.map((r) => [r.slug, r.id]));

  let insertedCount = 0;
  let updatedCount = 0;
  const productIds = [];

  for (let idx = 0; idx < ALL_PRODUCTS.length; idx++) {
    const [sku, name, brand, catSlug, price, mrp, color, sizes, desc, imgUrl] = ALL_PRODUCTS[idx];
    const categoryId = catMap[catSlug];
    if (!categoryId) {
      console.warn(`Category slug not found: ${catSlug}`);
      continue;
    }

    const pricePaise = Math.round(price * 100);
    const mrpPaise = Math.round(mrp * 100);

    // Check if product with this SKU already exists
    const { rows: existing } = await query("SELECT id FROM products WHERE sku = $1", [sku]);

    let prodId;
    if (existing.length > 0) {
      prodId = existing[0].id;
      await query(
        `UPDATE products
            SET name = $1, brand = $2, description = $3, category_id = $4,
                price_paise = $5, mrp_paise = $6, color = $7, sizes = $8, image_url = $9, active = true, updated_at = now()
          WHERE id = $10`,
        [name, brand, desc, categoryId, pricePaise, mrpPaise, color, sizes, imgUrl, prodId]
      );
      updatedCount++;
    } else {
      const { rows: ins } = await query(
        `INSERT INTO products (sku, name, brand, description, category_id, price_paise, mrp_paise, color, sizes, image_url, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
         RETURNING id`,
        [sku, name, brand, desc, categoryId, pricePaise, mrpPaise, color, sizes, imgUrl]
      );
      prodId = ins[0].id;
      insertedCount++;
    }
    productIds.push({ id: prodId, sku, catSlug, idx });

    // Inventory allocation across the 6 cities
    for (let ci = 0; ci < CITIES.length; ci++) {
      const city = CITIES[ci];
      let qty = 0;
      if (sku === "AUD-007") {
        // Concurrency Demo Item 1: Exactly 1 unit in Bengaluru
        qty = city === "Bengaluru" ? 1 : 0;
      } else if (sku === "MOB-001") {
        // Concurrency Demo Item 2: Exactly 1 unit in Mumbai
        qty = city === "Mumbai" ? 1 : 16;
      } else {
        qty = 15 + ((idx * 13 + ci * 7) % 45);
      }

      await query(
        `INSERT INTO inventory (product_id, city, quantity, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (product_id, city) DO UPDATE SET quantity = $3, updated_at = now()`,
        [prodId, city, qty]
      );
    }
  }

  console.log(`[seed-complete-catalog] Database updated: ${insertedCount} inserted, ${updatedCount} updated.`);

  // ════════════════════════════════════════════════════════════════════════════
  // 2. SEED VERIFIED CUSTOMER REVIEWS
  // ════════════════════════════════════════════════════════════════════════════
  console.log("[seed-complete-catalog] Seeding authentic verified customer reviews...");
  await query("TRUNCATE reviews RESTART IDENTITY CASCADE");

  let reviewInsertCount = 0;
  for (const { id: prodId, sku, catSlug, idx } of productIds) {
    const templatePool = REVIEW_POOLS[catSlug] || REVIEW_POOLS.audio;
    // Generate between 5 and 11 reviews per product
    const count = 5 + (idx % 7);
    const usedCombinations = new Set();

    for (let r = 0; r < count; r++) {
      const first = FIRST_NAMES[(idx * 7 + r * 11) % FIRST_NAMES.length];
      const last = LAST_NAMES[(idx * 5 + r * 13) % LAST_NAMES.length];
      const reviewerName = `${first} ${last}`;
      const city = CITIES[(idx + r) % CITIES.length];

      const template = templatePool[(idx * 3 + r) % templatePool.length];
      // Jitter review date within the last 45 days
      const daysAgo = 1 + ((idx * 3 + r * 5) % 45);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      await query(
        `INSERT INTO reviews (product_id, user_name, city, rating, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [prodId, reviewerName, city, template.rating, template.comment, createdAt]
      );
      reviewInsertCount++;
    }

    // Compute dynamic rating and review_count
    const { rows: stats } = await query(
      `SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*)::int as count
         FROM reviews WHERE product_id = $1`,
      [prodId]
    );

    const avgRating = Number(stats[0]?.avg_rating || 4.5);
    const totalCount = Number(stats[0]?.count || count);

    await query(
      "UPDATE products SET rating = $1, review_count = $2 WHERE id = $3",
      [avgRating, totalCount, prodId]
    );
  }

  console.log(`[seed-complete-catalog] Inserted ${reviewInsertCount} authentic reviews across ${productIds.length} products.`);

  // ════════════════════════════════════════════════════════════════════════════
  // 3. OPENSEARCH INDEXING
  // ════════════════════════════════════════════════════════════════════════════
  console.log("[seed-complete-catalog] Synchronizing complete catalog into OpenSearch index...");
  await ensureIndex();

  let indexedCount = 0;
  for (const { id: prodId } of productIds) {
    const doc = await buildProductDoc(prodId);
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
  const totalInOS = (await os.count({ index: INDEX })).body.count;

  console.log(`[seed-complete-catalog] Successfully indexed ${indexedCount} products. OpenSearch total document count: ${totalInOS}`);

  const { rows: totalP } = await query("SELECT count(*) FROM products");
  const { rows: totalI } = await query("SELECT count(*) FROM inventory");
  const { rows: totalR } = await query("SELECT count(*) FROM reviews");

  console.log(`\n════════════════════════════════════════════════════════════════`);
  console.log(`CATALOG EXPANSION COMPLETE:`);
  console.log(`- PostgreSQL Products:   ${totalP[0].count}`);
  console.log(`- Multi-City Inventory:  ${totalI[0].count} rows across 6 cities`);
  console.log(`- Verified Reviews:      ${totalR[0].count} reviews`);
  console.log(`- OpenSearch Indexed:    ${totalInOS} documents`);
  console.log(`════════════════════════════════════════════════════════════════\n`);

  await pool.end();
}

seedCompleteCatalog().catch((err) => {
  console.error("FATAL: Seed catalog failed:", err);
  process.exit(1);
});
