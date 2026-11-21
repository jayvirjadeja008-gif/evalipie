import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, ArrowUpDown, X, Sparkles } from "lucide-react";
import { api, ApiError } from "../api";
import { useApp } from "../store";
import { ProductCard } from "../components/ProductCard";
import { HeroStage } from "../components/HeroStage";
import { Empty, ErrorBox, Skeleton } from "../components/ui";
import type { Category, Facets, Product } from "../types";

interface SearchRes {
  total: number;
  items: Product[];
  facets: Facets;
  took?: number;
}
const SIZE = 12;

export default function Storefront() {
  const [sp, setSp] = useSearchParams();
  const { city: myCity, cities: appCities } = useApp();

  const q = sp.get("q") || "";
  const category = sp.get("category") || "";
  const city = sp.get("city") || "";
  const sort = sp.get("sort") || "";
  const min = sp.get("min") || "";
  const max = sp.get("max") || "";
  const page = Number(sp.get("page") || 1);

  // New filters from specification
  const subcat = sp.get("subcat") || "";
  const gender = sp.get("gender") || "";
  const brand = sp.get("brand") || "";
  const size = sp.get("size") || "";
  const colour = sp.get("colour") || "";
  const discount = sp.get("discount") || "";

  const [data, setData] = useState<SearchRes | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState({ min, max });
  const [telemetryPulse, setTelemetryPulse] = useState(0);

  const catalogRef = useRef<HTMLDivElement>(null);
  const allCities = appCities.length > 0 ? appCities : ["Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune"];

  useEffect(() => {
    api<Category[]>("/categories").then(setCats).catch(() => {});
  }, []);
  useEffect(() => setPrice({ min, max }), [min, max]);

  const set = (patch: Record<string, string>) => {
    const n = new URLSearchParams(sp);
    Object.entries({ page: "", ...patch }).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    setSp(n);
  };

  const clearAll = () => {
    setSp(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(
    q || category || subcat || city || min || max || gender || brand || size || discount || sp.get("deals") === "true"
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setFallback(false);
    const p = new URLSearchParams({ size: String(SIZE), page: String(page) });
    if (q) p.set("q", q);
    if (category) p.set("category", category);
    if (subcat) p.set("subcat", subcat);
    if (city) p.set("city", city);
    if (min) p.set("minPrice", min);
    if (max) p.set("maxPrice", max);
    if (sort) p.set("sort", sort);
    if (gender) p.set("gender", gender);
    if (brand) p.set("brand", brand);
    if (size) p.set("itemSize", size);
    if (colour) p.set("colour", colour);
    if (discount) p.set("discount", discount);
    if (sp.get("deals") === "true") p.set("deals", "true");

    try {
      const res = await api<SearchRes>(`/search?${p}`);
      setData(res);
      setTelemetryPulse((prev) => prev + 1);
    } catch (e) {
      if (e instanceof ApiError && e.status === 503 && !q && !city && !min && !max) {
        try {
          const r = await api<{ total: number; items: Product[] }>(
            `/products?size=${SIZE}&page=${page}${category ? `&category=${category}` : ""}${subcat ? `&subcat=${subcat}` : ""}${
              sp.get("deals") === "true" ? "&deals=true" : ""
            }${brand ? `&brand=${brand}` : ""}${discount ? `&discount=${discount}` : ""}`
          );
          setData({ ...r, facets: { categories: [], cities: [], price: { min: null, max: null } } });
          setFallback(true);
        } catch (e2: any) {
          setErr(e2.message);
        }
      } else {
        setErr((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [q, category, subcat, city, min, max, sort, page, gender, brand, size, colour, discount, sp]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = data ? Math.ceil(data.total / SIZE) : 0;
  const count = (slug: string) => data?.facets.categories.find((c) => c.slug === slug)?.count;

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      {/* 1. Architectural 3D Hero Stage & Live Aiven Pipeline Strip */}
      {!q && !category && page === 1 && !hasActiveFilters && (
        <HeroStage onExploreClick={scrollToCatalog} telemetryTrigger={telemetryPulse} />
      )}

      {/* 2. Storefront Catalog Grid */}
      <div ref={catalogRef} className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sidebar Filters - Exact visual design matching user specifications */}
        <aside className="w-full lg:w-[260px] shrink-0" aria-label="Filters">
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm font-sans">
            {/* Header: Filters & Clear all */}
            <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6]">
              <h2 className="text-xl font-bold tracking-tight text-[#111827]">Filters</h2>
              <button
                type="button"
                onClick={clearAll}
                className="text-sm font-semibold text-[#1D4ED8] hover:text-[#1E40AF] transition-colors"
              >
                Clear all
              </button>
            </div>

            {/* 1. Gender */}
            <div className="pt-4 pb-5 border-b border-[#F3F4F6]">
              <h3 className="text-base font-bold text-[#111827] mb-3">Gender</h3>
              <div className="space-y-2.5">
                {["Men", "Women", "Kids"].map((g) => {
                  const isChecked = gender === g.toLowerCase();
                  return (
                    <label
                      key={g}
                      className="flex items-center gap-3 cursor-pointer text-[#1F2937] hover:text-[#111827] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => set({ gender: isChecked ? "" : g.toLowerCase() })}
                        className="w-4 h-4 rounded-[3px] border-[#D1D5DB] text-[#1D4ED8] accent-[#1D4ED8] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-sm font-normal select-none">{g}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 2. Category */}
            <div className="pt-4 pb-5 border-b border-[#F3F4F6]">
              <h3 className="text-base font-bold text-[#111827] mb-3">Category</h3>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {[
                  { label: "Tops, T-shirts & Outerwear", key: "tops", isCat: false },
                  { label: "Jeans, Chinos & Joggers", key: "bottoms", isCat: false },
                  { label: "Dresses, Sarees & Kurtas", key: "ethnic", isCat: false },
                  { label: "Sneakers, Loafers & Heels", key: "footwear", isCat: true },
                  { label: "Bags, Watches & Eyewear", key: "accessories", isCat: false },
                  { label: "Audio & Wireless Sound", key: "audio", isCat: true },
                  { label: "Mobiles & Accessories", key: "mobiles", isCat: true },
                  { label: "Laptops & Productivity", key: "laptops", isCat: true },
                  { label: "Home & Kitchen Appliances", key: "home", isCat: true },
                ].map((item) => {
                  const isChecked = item.isCat ? category === item.key && !subcat : subcat === item.key;
                  return (
                    <label
                      key={item.label}
                      className="flex items-center gap-3 cursor-pointer text-[#1F2937] hover:text-[#111827] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            set({ category: "", subcat: "" });
                          } else if (item.isCat) {
                            set({ category: item.key, subcat: "" });
                          } else {
                            set({ subcat: item.key, category: "" });
                          }
                        }}
                        className="w-4 h-4 rounded-[3px] border-[#D1D5DB] text-[#1D4ED8] accent-[#1D4ED8] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-sm font-normal select-none leading-snug">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. Brand */}
            <div className="pt-4 pb-5 border-b border-[#F3F4F6]">
              <h3 className="text-base font-bold text-[#111827] mb-3">Brand</h3>
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {[
                  "Roadster", "Allen Solly", "Fabindia", "Lavie", "Fossil",
                  "Sony", "Apple", "boAt", "Nike", "Adidas",
                  "Puma", "Samsung", "Dell", "HP", "Woodland",
                  "Prestige", "Philips"
                ].map((b) => {
                  const isChecked = brand.toLowerCase() === b.toLowerCase();
                  return (
                    <label
                      key={b}
                      className="flex items-center gap-3 cursor-pointer text-[#1F2937] hover:text-[#111827] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => set({ brand: isChecked ? "" : b })}
                        className="w-4 h-4 rounded-[3px] border-[#D1D5DB] text-[#1D4ED8] accent-[#1D4ED8] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-sm font-normal select-none">{b}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 4. Price Range */}
            <div className="pt-4 pb-5 border-b border-[#F3F4F6]">
              <h3 className="text-base font-bold text-[#111827] mb-3">Price Range</h3>
              <div className="space-y-2.5">
                {[
                  { label: "All Prices", minVal: "", maxVal: "" },
                  { label: "Under ₹1,000", minVal: "", maxVal: "1000" },
                  { label: "₹1,000 – ₹2,500", minVal: "1000", maxVal: "2500" },
                  { label: "Above ₹2,500", minVal: "2500", maxVal: "" },
                ].map((pr) => {
                  const isSelected =
                    (!min && !max && pr.minVal === "" && pr.maxVal === "") ||
                    (min === pr.minVal && max === pr.maxVal);
                  return (
                    <label
                      key={pr.label}
                      className="flex items-center gap-3 cursor-pointer text-[#1F2937] hover:text-[#111827] transition-colors"
                    >
                      <input
                        type="radio"
                        name="priceRangeFilter"
                        checked={isSelected}
                        onChange={() => set({ min: pr.minVal, max: pr.maxVal })}
                        className="w-4 h-4 border-[#D1D5DB] text-[#1D4ED8] accent-[#1D4ED8] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-sm font-normal select-none">{pr.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 5. Size */}
            <div className="pt-4 pb-5 border-b border-[#F3F4F6]">
              <h3 className="text-base font-bold text-[#111827] mb-3">Size</h3>
              <div className="flex flex-wrap gap-2">
                {["S", "M", "L", "XL", "Free"].map((s) => {
                  const isSelected = size === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set({ size: isSelected ? "" : s })}
                      className={`min-w-[42px] px-3.5 py-1.5 rounded-lg border text-sm font-bold text-center transition-all ${
                        isSelected
                          ? "border-[#111827] bg-[#111827] text-white"
                          : "border-[#D1D5DB] bg-white text-[#111827] hover:border-gray-400"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Discount */}
            <div className="pt-4">
              <h3 className="text-base font-bold text-[#111827] mb-3">Discount</h3>
              <div className="space-y-2.5">
                {[
                  { label: "All Discounts", value: "" },
                  { label: "30% or more", value: "30" },
                  { label: "40% or more", value: "40" },
                  { label: "50% or more", value: "50" },
                ].map((d) => {
                  const isSelected = (!discount && !d.value) || discount === d.value;
                  return (
                    <label
                      key={d.label}
                      className="flex items-center gap-3 cursor-pointer text-[#1F2937] hover:text-[#111827] transition-colors"
                    >
                      <input
                        type="radio"
                        name="discountRadio"
                        checked={isSelected}
                        onChange={() => set({ discount: d.value })}
                        className="w-4 h-4 border-[#D1D5DB] text-[#1D4ED8] accent-[#1D4ED8] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-sm font-normal select-none">{d.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Catalog View */}
        <section aria-live="polite" id="catalog-section" className="min-w-0">
          {/* Results Header */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#E4E2DA] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111]">
                  {sp.get("deals") === "true" ? (
                    <span className="flex items-center gap-2">
                      <span>FLASH SALE: UP TO 70% OFF</span>
                      <span className="font-mono text-xs font-bold bg-[#B84A27] text-white px-2 py-0.5 rounded-[1px]">
                        ACTIVE DEALS
                      </span>
                    </span>
                  ) : q ? (
                    `SEARCH: "${q.toUpperCase()}"`
                  ) : category ? (
                    cats.find((c) => c.slug === category)?.name.toUpperCase() || category.toUpperCase()
                  ) : brand ? (
                    `BRAND: ${brand.toUpperCase()}`
                  ) : (
                    "STOREFRONT CATALOG"
                  )}
                </h2>
              </div>
              <p className="font-mono text-xs text-[#5A5852] mt-0.5">
                {loading
                  ? "QUERYING AIVEN DISTRIBUTED OPENSEARCH CLUSTER..."
                  : `${data?.total ?? 0} PHYSICAL UNITS AUDITED ACROSS INDIAN HUBS`}
                {data?.took !== undefined && ` · ${data.took}ms`}
                {fallback && " · DATABASE RECOVERY FALLBACK ACTIVE"}
              </p>
            </div>

            {/* Sort & Quick Filter Controls */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-[#5A5852]">
                <ArrowUpDown strokeWidth={1.5} size={14} />
                <span>ORDER BY:</span>
              </div>
              <select
                className="input !text-xs !py-1 font-mono font-semibold"
                value={sort}
                onChange={(e) => set({ sort: e.target.value })}
              >
                <option value="">RELEVANCE</option>
                <option value="price_asc">PRICE: LOW TO HIGH</option>
                <option value="price_desc">PRICE: HIGH TO LOW</option>
                <option value="newest">RECENT RELEASES</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="text-[#8E8A82]">APPLIED:</span>
              {gender && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFFFFF] border border-[#E4E2DA] rounded-[1px] text-[#111111]">
                  <span>Gender: {gender.toUpperCase()}</span>
                  <button type="button" onClick={() => set({ gender: "" })}>
                    <X size={11} className="hover:text-[#B84A27]" />
                  </button>
                </span>
              )}
              {category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFFFFF] border border-[#E4E2DA] rounded-[1px] text-[#111111]">
                  <span>Category: {category.toUpperCase()}</span>
                  <button type="button" onClick={() => set({ category: "", q: "" })}>
                    <X size={11} className="hover:text-[#B84A27]" />
                  </button>
                </span>
              )}
              {subcat && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFFFFF] border border-[#E4E2DA] rounded-[1px] text-[#111111]">
                  <span>
                    Category:{" "}
                    {
                      {
                        tops: "Tops & Outerwear",
                        bottoms: "Jeans & Joggers",
                        ethnic: "Ethnic Wear",
                        shoes: "Footwear",
                        accessories: "Accessories",
                        watches: "Watches",
                        bags: "Bags",
                        western: "Western Wear",
                        sportswear: "Sportswear",
                      }[subcat] || subcat.toUpperCase()
                    }
                  </span>
                  <button type="button" onClick={() => set({ subcat: "" })}>
                    <X size={11} className="hover:text-[#B84A27]" />
                  </button>
                </span>
              )}
              {brand && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFFFFF] border border-[#E4E2DA] rounded-[1px] text-[#111111]">
                  <span>Brand: {brand.toUpperCase()}</span>
                  <button type="button" onClick={() => set({ brand: "" })}>
                    <X size={11} className="hover:text-[#B84A27]" />
                  </button>
                </span>
              )}
              {(min || max) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFFFFF] border border-[#E4E2DA] rounded-[1px] text-[#111111]">
                  <span>
                    Price: {min ? `₹${min}` : "₹0"} - {max ? `₹${max}` : "Any"}
                  </span>
                  <button type="button" onClick={() => set({ min: "", max: "" })}>
                    <X size={11} className="hover:text-[#B84A27]" />
                  </button>
                </span>
              )}
              {size && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFFFFF] border border-[#E4E2DA] rounded-[1px] text-[#111111]">
                  <span>Size: {size}</span>
                  <button type="button" onClick={() => set({ size: "" })}>
                    <X size={11} className="hover:text-[#B84A27]" />
                  </button>
                </span>
              )}
              {discount && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#B84A27] text-white rounded-[1px]">
                  <span>{discount}%+ OFF</span>
                  <button type="button" onClick={() => set({ discount: "" })}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {city && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFFFFF] border border-[#E4E2DA] rounded-[1px] text-[#111111]">
                  <span>Hub: {city.toUpperCase()}</span>
                  <button type="button" onClick={() => set({ city: "" })}>
                    <X size={11} className="hover:text-[#B84A27]" />
                  </button>
                </span>
              )}
              {q && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFFFFF] border border-[#E4E2DA] rounded-[1px] text-[#111111]">
                  <span>Query: "{q}"</span>
                  <button type="button" onClick={() => set({ q: "" })}>
                    <X size={11} className="hover:text-[#B84A27]" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Results Grid / Loading State */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} />
              ))}
            </div>
          ) : err ? (
            <ErrorBox message={err} onRetry={load} />
          ) : !data || data.items.length === 0 ? (
            <Empty
              title="NO STOCK CORRESPONDS TO CRITERIA"
              hint="Try clearing filters or adjusting your search parameters to view inventory across our national stores."
              action={
                <button type="button" onClick={clearAll} className="btn-primary !text-xs">
                  RESET ALL FILTERS
                </button>
              }
            />
          ) : (
            <div className="space-y-8">
              {/* Product Cards Grid with 3D Spatial Transitions */}
              <div
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                style={{ perspective: "1400px" }}
              >
                {data.items.map((p, idx) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: Math.min(idx * 0.04, 0.3),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <ProductCard p={p} />
                  </motion.div>
                ))}
              </div>

              {/* Minimalist Pagination Bar */}
              {pages > 1 && (
                <div className="flex items-center justify-between border-t border-[#E4E2DA] pt-4 font-mono text-xs">
                  <span className="text-[#5A5852]">
                    SHOWING PAGE {page} OF {pages} ({data.total} TOTAL)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => set({ page: String(page - 1) })}
                      className="px-3 py-1 border border-[#E4E2DA] bg-[#FFFFFF] text-[#111111] hover:border-[#111111] disabled:opacity-30 disabled:pointer-events-none rounded-[1px] transition-colors"
                    >
                      PREV
                    </button>
                    {Array.from({ length: pages }).map((_, i) => {
                      const pNum = i + 1;
                      if (pNum === 1 || pNum === pages || (pNum >= page - 1 && pNum <= page + 1)) {
                        return (
                          <button
                            key={pNum}
                            type="button"
                            onClick={() => set({ page: String(pNum) })}
                            className={`w-7 h-7 border text-center transition-colors rounded-[1px] ${
                              page === pNum
                                ? "border-[#111111] bg-[#111111] text-white font-bold"
                                : "border-[#E4E2DA] bg-[#FFFFFF] text-[#111111] hover:border-[#111111]"
                            }`}
                          >
                            {pNum}
                          </button>
                        );
                      }
                      if (pNum === page - 2 || pNum === page + 2) {
                        return (
                          <span key={pNum} className="px-1 text-[#8E8A82]">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    <button
                      type="button"
                      disabled={page >= pages}
                      onClick={() => set({ page: String(page + 1) })}
                      className="px-3 py-1 border border-[#E4E2DA] bg-[#FFFFFF] text-[#111111] hover:border-[#111111] disabled:opacity-30 disabled:pointer-events-none rounded-[1px] transition-colors"
                    >
                      NEXT
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
