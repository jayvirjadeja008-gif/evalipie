import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, ShieldCheck, RefreshCw, Compass, Database, Plus, Minus, Heart, Star } from "lucide-react";
import { api, inr } from "../api";
import { useApp } from "../store";
import { StockMeter } from "../components/StockMeter";
import { ErrorBox, Spinner } from "../components/ui";
import { getProductFallback } from "../utils/images";
import { PincodeChecker } from "../components/PincodeChecker";
import { ReviewsSection } from "../components/ReviewsSection";
import type { Product } from "../types";

export default function ProductPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { city, setCity, user, login, cart, setQty, toast, cities, isWishlisted, toggleWishlist, liveRatingUpdates } = useApp();
  const [p, setP] = useState<Product | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [n, setN] = useState(1);
  const [busy, setBusy] = useState(false);

  const prodId = p ? p.id : Number(id);
  const liveUpdate = liveRatingUpdates[prodId];
  const currentRating = liveUpdate ? liveUpdate.rating : (p?.rating ?? 4.5);
  const currentCount = liveUpdate ? liveUpdate.count : (p?.review_count ?? 12);
  const isJustUpdated = Boolean(liveUpdate && Date.now() - liveUpdate.timestamp < 4500);

  // 3D Rotatable Showcase Stage with Inertia
  const [rotY, setRotY] = useState(0);
  const [rotX, setRotX] = useState(0);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const animFrame = useRef<number | null>(null);

  const allCities = cities.length > 0 ? cities : ["Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune"];

  const load = () => {
    setErr(null);
    api<Product>(`/products/${id}`).then(setP).catch((e) => setErr(e.message));
  };
  useEffect(load, [id]); // eslint-disable-line

  // Inertia decay loop
  useEffect(() => {
    const loop = () => {
      if (!isDragging.current) {
        if (Math.abs(velocity.current.x) > 0.05 || Math.abs(velocity.current.y) > 0.05) {
          velocity.current.x *= 0.93;
          velocity.current.y *= 0.93;
          setRotY((prev) => prev + velocity.current.x);
          setRotX((prev) => Math.max(-25, Math.min(25, prev + velocity.current.y)));
        }
      }
      animFrame.current = requestAnimationFrame(loop);
    };
    animFrame.current = requestAnimationFrame(loop);
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    velocity.current = { x: 0, y: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };

    const vx = dx * 0.45;
    const vy = -dy * 0.35;
    velocity.current = { x: vx, y: vy };

    setRotY((prev) => prev + vx);
    setRotX((prev) => Math.max(-25, Math.min(25, prev + vy)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const resetRotation = () => {
    setRotY(0);
    setRotX(0);
    velocity.current = { x: 0, y: 0 };
  };

  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!p) return <Spinner label="FETCHING INVENTORY SPECIFICATION" />;

  const qty = p.stock[city] ?? 0;
  const inCart = cart?.items.find((i) => i.productId === p.id)?.quantity ?? 0;

  async function add() {
    setBusy(true);
    try {
      if (!user) {
        await login("demo@stocksync.in", "demo123");
      }
      await setQty(p!.id, inCart + n);
      toast(`Added ${n} × ${p!.name} to cart`);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  // Calculate dynamic 3D shadow offset based on angle
  const radY = (rotY * Math.PI) / 180;
  const shadowOffsetX = -Math.sin(radY) * 20;
  const shadowOffsetY = 16 + Math.cos(radY) * 6;

  return (
    <motion.div
      initial={{ opacity: 0, transform: "scale(0.94) translateZ(-80px) rotateY(3deg)" }}
      animate={{ opacity: 1, transform: "scale(1) translateZ(0px) rotateY(0deg)" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
      style={{ perspective: "1400px" }}
    >
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-[#5A5852] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft strokeWidth={1.5} size={14} />
          <span>BACK TO CATALOG</span>
        </Link>
        <div className="font-mono text-xs text-[#5A5852] flex items-center gap-2">
          <span>SKU: {p.sku}</span>
          <span className="text-[#E4E2DA]">|</span>
          <span className="uppercase text-[#1B4332] flex items-center gap-1">
            <Database strokeWidth={1.5} size={12} />
            <span>LIVE INVENTORY AUDIT</span>
          </span>
        </div>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        {/* 3D Spatial Showcase Viewer Stage */}
        <div className="flex flex-col">
          <div
            className="relative w-full aspect-square border border-[#E4E2DA] bg-[#FFFFFF] flex items-center justify-center select-none overflow-hidden cursor-grab active:cursor-grabbing"
            style={{ perspective: "1000px" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Architectural Grid Background */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(#E4E2DA 1px, transparent 1px), radial-gradient(#E4E2DA 1px, #FFFFFF 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            {/* Turntable Base Indicator */}
            <div
              className="absolute bottom-6 w-48 h-12 rounded-[50%] border border-[#E4E2DA] bg-[#ECEAE2]/40 pointer-events-none"
              style={{
                transform: `rotateX(75deg) rotateZ(${rotY}deg)`,
                transformStyle: "preserve-3d",
              }}
            />

            {/* Dynamic Directional Cast Shadow */}
            <div
              className="absolute bottom-10 w-44 h-8 rounded-[50%] bg-[#111111]/10 filter blur-md pointer-events-none transition-all duration-75"
              style={{
                transform: `translate(${shadowOffsetX}px, ${shadowOffsetY}px) scale(${1 - Math.abs(rotX) * 0.01})`,
              }}
            />

            {/* 3D Rotatable Object Layer */}
            <div
              className="relative w-3/4 h-3/4 flex items-center justify-center pointer-events-none"
              style={{
                transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(30px)`,
                transformStyle: "preserve-3d",
                transition: isDragging.current ? "none" : "transform 0.05s linear",
              }}
            >
              <img
                src={p.image_url || getProductFallback(p.category, p.name, p.sku)}
                alt={p.name}
                draggable={false}
                className="max-h-full max-w-full object-contain filter drop-shadow-md select-none rounded-[2px]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getProductFallback(p.category, p.name, p.sku);
                }}
              />
            </div>

            {/* Top Interactive Indicator */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 font-mono text-[10px] text-[#5A5852] bg-white/90 border border-[#E4E2DA] px-2 py-1">
              <Compass strokeWidth={1.5} size={12} className="text-[#B84A27]" />
              <span>SPATIAL VIEW: {Math.round(rotY % 360)}°</span>
            </div>

            {/* Reset Button */}
            {(rotY !== 0 || rotX !== 0) && (
              <button
                type="button"
                onClick={resetRotation}
                className="absolute top-3 right-3 flex items-center gap-1 font-mono text-[10px] text-[#5A5852] hover:text-[#111111] bg-white/90 border border-[#E4E2DA] px-2 py-1 transition-colors"
                title="Reset angle"
              >
                <RefreshCw strokeWidth={1.5} size={11} />
                <span>RESET</span>
              </button>
            )}

            {/* Hint */}
            <div className="absolute bottom-3 text-center w-full font-mono text-[10px] text-[#8E8A82] pointer-events-none">
              DRAG HORIZONTALLY / VERTICALLY TO INSPECT
            </div>
          </div>
        </div>

        {/* Product Details & Inventory Specification */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-[#5A5852]">
                <span className="font-bold">{p.brand.toUpperCase()}</span>
                <span>·</span>
                <span className="uppercase text-[#B84A27]">{p.category_name}</span>
              </div>

              {/* Rating badge with Real-Time Reactive Pulse */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-[1px] font-bold transition-all duration-300 ${
                    isJustUpdated
                      ? "bg-[#B84A27] text-white scale-105 shadow-sm"
                      : "bg-[#ECEAE2] text-[#111111]"
                  }`}
                >
                  <span>{currentRating}</span>
                  <Star
                    strokeWidth={1.5}
                    size={11}
                    className={isJustUpdated ? "fill-white text-white" : "fill-[#B84A27] text-[#B84A27]"}
                  />
                  {isJustUpdated && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping ml-0.5" />
                  )}
                </span>
                <span className="text-[#8E8A82]">({currentCount} verified reviews)</span>
              </div>
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight text-[#111111] leading-tight">
              {p.name}
            </h1>

            {/* Discounted Pricing Display */}
            {(() => {
              const mrp = p.mrp || Math.round(p.price * 1.35);
              const discount = p.discount_percent || Math.max(5, Math.round(((mrp - p.price) / mrp) * 100));

              return (
                <div className="flex flex-wrap items-baseline gap-3 pt-2">
                  <span className="font-mono text-3xl font-bold text-[#111111]">
                    {inr(p.price)}
                  </span>
                  {mrp > p.price && (
                    <span className="font-mono text-lg text-[#5A5852] line-through">
                      {inr(mrp)}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="font-mono text-xs font-bold text-white bg-[#B84A27] px-2 py-0.5 rounded-[1px]">
                      {discount}% OFF
                    </span>
                  )}
                  <span className="font-mono text-xs text-[#5A5852] ml-auto">GST INCLUSIVE</span>
                </div>
              );
            })()}
          </div>

          <p className="text-sm text-[#5A5852] leading-relaxed border-t border-[#E4E2DA] pt-4 font-sans">
            {p.description}
          </p>

          {/* 6-digit Indian Pincode Delivery Checker */}
          <PincodeChecker />

          {/* Real-time Inventory Audit Matrix across all 6 Indian Cities */}
          <div className="border border-[#E4E2DA] bg-[#FFFFFF] p-5 rounded-[2px] shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#E4E2DA] pb-2.5">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#111111]">
                <ShieldCheck strokeWidth={1.5} size={15} className="text-[#1B4332]" />
                <span>PHYSICAL STORE INVENTORY</span>
              </div>
              <span className="font-mono text-[10px] text-[#5A5852]">ALL 6 METROS</span>
            </div>

            <ul className="divide-y divide-[#E4E2DA]">
              {allCities.map((c) => {
                const isSelected = c === city;
                const storeStock = p.stock[c] ?? 0;
                return (
                  <li key={c} className="flex items-center justify-between py-2.5 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setCity(c)}
                      className={`flex items-center gap-2 transition-colors ${
                        isSelected
                          ? "font-bold text-[#111111] border-b border-[#111111]"
                          : "text-[#5A5852] hover:text-[#111111]"
                      }`}
                    >
                      <span>{c.toUpperCase()}</span>
                      {isSelected && (
                        <span className="text-[10px] text-[#B84A27] font-semibold">[YOUR CART]</span>
                      )}
                    </button>
                    <StockMeter qty={storeStock} city={c} />
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Cart Quantity & Wishlist Action Bar */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[#111111] bg-[#FFFFFF] h-11">
                <button
                  type="button"
                  className="px-3.5 h-full text-sm text-[#111111] hover:bg-[#ECEAE2] transition-colors"
                  aria-label="Decrease quantity"
                  onClick={() => setN(Math.max(1, n - 1))}
                >
                  <Minus strokeWidth={1.5} size={14} />
                </button>
                <span className="w-10 text-center font-mono text-sm font-bold text-[#111111]">
                  {n}
                </span>
                <button
                  type="button"
                  className="px-3.5 h-full text-sm text-[#111111] hover:bg-[#ECEAE2] transition-colors"
                  aria-label="Increase quantity"
                  onClick={() => setN(Math.min(Math.max(qty - inCart, 1), n + 1))}
                  disabled={qty === 0 || inCart + n >= qty}
                >
                  <Plus strokeWidth={1.5} size={14} />
                </button>
              </div>

              <button
                type="button"
                className="btn-accent flex-1 !h-11 !text-xs flex items-center justify-center gap-2"
                disabled={qty === 0 || busy || inCart >= qty}
                onClick={add}
              >
                <ShoppingBag strokeWidth={1.5} size={16} />
                <span>
                  {qty === 0
                    ? `SOLD OUT IN ${city.toUpperCase()}`
                    : inCart >= qty
                    ? "MAX QUANTITY IN CART"
                    : busy
                    ? "COMMITTING RESERVATION..."
                    : `ADD TO CART · ${inr(p.price * n)}`}
                </span>
              </button>

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={() => toggleWishlist(p)}
                className={`h-11 px-3.5 border transition-colors flex items-center justify-center rounded-[2px] ${
                  isWishlisted(p.id)
                    ? "bg-[#ECEAE2] border-[#B84A27] text-[#B84A27]"
                    : "bg-white border-[#E4E2DA] text-[#5A5852] hover:border-[#111111] hover:text-[#111111]"
                }`}
                title={isWishlisted(p.id) ? "Remove from Wishlist" : "Save to Wishlist"}
              >
                <Heart
                  strokeWidth={1.5}
                  size={18}
                  className={isWishlisted(p.id) ? "fill-[#B84A27] text-[#B84A27]" : ""}
                />
              </button>
            </div>

            <p className="font-mono text-[11px] text-[#5A5852] flex items-center gap-1.5">
              <ShieldCheck strokeWidth={1.5} size={13} className="text-[#1B4332]" />
              <span>Row-level locking guarantees no overselling across Indian branches.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Ratings & Verified Reviews Section */}
      <ReviewsSection productId={p.id} />
    </motion.div>
  );
}
