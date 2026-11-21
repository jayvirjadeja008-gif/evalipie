import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, ShoppingBag, Check, Loader2, Heart, Star } from "lucide-react";
import type { Product } from "../types";
import { inr } from "../api";
import { useApp } from "../store";
import { StockMeter } from "./StockMeter";
import { getProductFallback } from "../utils/images";

export function ProductCard({ p }: { p: Product }) {
  const { city, user, login, setQty, cart, toast, isWishlisted, toggleWishlist, liveRatingUpdates } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const [tilt, setTilt] = useState({ x: 0, y: 0, shadowX: 0, shadowY: 4 });
  const [isHovered, setIsHovered] = useState(false);

  const liveUpdate = liveRatingUpdates[p.id];
  const currentRating = liveUpdate ? liveUpdate.rating : (p.rating ?? 4.5);
  const currentCount = liveUpdate ? liveUpdate.count : (p.review_count ?? 12);
  const isJustUpdated = Boolean(liveUpdate && Date.now() - liveUpdate.timestamp < 4500);

  const qty = p.stock?.[city] ?? 0;
  const inCart = cart?.items.find((i) => i.productId === p.id)?.quantity ?? 0;
  const wishlisted = isWishlisted(p.id);

  const mrp = p.mrp || Math.round(p.price * 1.35);
  const discount = p.discount_percent || Math.max(5, Math.round(((mrp - p.price) / mrp) * 100));

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10; // max 10 deg
    const rotateY = ((x - centerX) / centerX) * 10;

    setTilt({
      x: rotateX,
      y: rotateY,
      shadowX: (centerX - x) * 0.14,
      shadowY: (centerY - y) * 0.14 + 10,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0, shadowX: 0, shadowY: 4 });
  };

  async function add(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (qty === 0 || busy || inCart >= qty) return;
    setBusy(true);
    try {
      if (!user) {
        await login("demo@stocksync.in", "demo123");
      }
      await setQty(p.id, inCart + 1);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1400);
      toast(`Added ${p.name} to cart`);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="perspective-stage h-full"
      style={{ perspective: "1200px" }}
    >
      <article
        className="group relative flex flex-col h-full bg-[#FFFFFF] border border-[#E4E2DA] hover:border-[#111111] transition-all duration-150 ease-out rounded-[2px] preserve-3d"
        style={{
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(8px)`
            : "rotateX(0deg) rotateY(0deg) translateZ(0px)",
          boxShadow: isHovered
            ? `${tilt.shadowX}px ${tilt.shadowY}px 28px rgba(17, 17, 17, 0.11), 0 2px 4px rgba(17, 17, 17, 0.04)`
            : "0 1px 3px rgba(17, 17, 17, 0.04)",
        }}
      >
        {/* Studio Product Photography Container (aspect-[4/3], object-cover, subtle hover zoom) */}
        <div className="relative block overflow-hidden aspect-[4/3] bg-[#F6F5F0] border-b border-[#E4E2DA]">
          <Link
            to={`/product/${p.id}`}
            className="w-full h-full block overflow-hidden"
          >
            <div
              className="w-full h-full overflow-hidden transition-transform duration-300 ease-out"
              style={{
                transform: isHovered ? "translateZ(24px)" : "translateZ(0px)",
                transformStyle: "preserve-3d",
              }}
            >
              <img
                src={p.image_url || getProductFallback(p.category, p.name, p.sku)}
                alt={p.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getProductFallback(p.category, p.name, p.sku);
                }}
              />
            </div>
          </Link>

          {/* Floating SKU badge on higher Z-plane */}
          <div
            className="absolute top-2.5 left-2.5 font-mono text-[10px] text-[#5A5852] bg-white/95 border border-[#E4E2DA] px-2 py-0.5 rounded-[1px] transition-transform duration-200 pointer-events-none"
            style={{
              transform: isHovered ? "translateZ(30px)" : "translateZ(0px)",
            }}
          >
            {p.sku}
          </div>

          {/* Monochrome Heart Wishlist Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(p);
            }}
            className="absolute top-2.5 right-2.5 bg-white/95 border border-[#E4E2DA] p-1.5 text-[#111111] hover:text-[#B84A27] transition-all rounded-[1px] z-10 shadow-sm"
            style={{
              transform: isHovered ? "translateZ(30px)" : "translateZ(0px)",
            }}
            title={wishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
            aria-label="Wishlist toggle"
          >
            <Heart
              strokeWidth={1.5}
              size={13}
              className={wishlisted ? "text-[#B84A27] fill-[#B84A27]" : "text-[#5A5852]"}
            />
          </button>
        </div>

        {/* Product Meta & Controls */}
        <div className="flex flex-1 flex-col p-4 gap-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#5A5852]">
            <span className="uppercase">{p.brand}</span>
            <div className="flex items-center gap-1.5">
              {/* Compact Rating Badge with Real-Time Reactive Pulse */}
              <div className="flex items-center gap-1">
                <span
                  className={`flex items-center gap-0.5 px-1.5 py-0.2 rounded-[1px] font-semibold text-[10px] transition-all duration-300 ${
                    isJustUpdated
                      ? "bg-[#B84A27] text-white scale-105 shadow-sm"
                      : "bg-[#ECEAE2] text-[#111111]"
                  }`}
                >
                  <span>{currentRating}</span>
                  <Star
                    strokeWidth={1.5}
                    size={9}
                    className={isJustUpdated ? "fill-white text-white" : "fill-[#B84A27] text-[#B84A27]"}
                  />
                  {isJustUpdated && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping ml-0.5" />
                  )}
                </span>
                <span className="text-[10px] text-[#5A5852] font-mono">({currentCount})</span>
              </div>
              <span className="uppercase text-[10px] bg-[#ECEAE2] px-1.5 py-0.2 rounded-[1px]">
                {p.category_name}
              </span>
            </div>
          </div>

          <Link
            to={`/product/${p.id}`}
            className="font-display text-sm font-bold text-[#111111] hover:text-[#B84A27] transition-colors line-clamp-2 leading-snug"
          >
            {p.name}
          </Link>

          {/* Real-time Branch Stock Availability */}
          <div className="mt-auto pt-2 border-t border-[#E4E2DA]/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#5A5852] uppercase">{city} Branch:</span>
              <StockMeter qty={qty} city={city} compact />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-base font-bold text-[#111111]">
                    {inr(p.price)}
                  </span>
                  {mrp > p.price && (
                    <span className="font-mono text-xs text-[#5A5852] line-through">
                      {inr(mrp)}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="font-mono text-[9px] font-bold text-white bg-[#B84A27] px-1 py-0.2 rounded-[1px]">
                      {discount}% OFF
                    </span>
                  )}
                </div>
                <span className="block font-mono text-[10px] text-[#8E8A82]">TAX INCL.</span>
              </div>

              {/* Functional ADD Button with immediate feedback & zero login friction */}
              <button
                type="button"
                onClick={add}
                disabled={qty === 0 || busy || inCart >= qty}
                className={`!py-1.5 !px-3 text-xs flex items-center gap-1.5 font-mono font-bold transition-all ${
                  justAdded
                    ? "btn-forest !border-[#1B4332]"
                    : inCart > 0
                    ? "btn-accent"
                    : "btn-primary"
                }`}
                title={qty === 0 ? "Sold out in " + city : `Add ${p.name} to cart`}
              >
                {busy ? (
                  <>
                    <Loader2 strokeWidth={2} size={13} className="animate-spin" />
                    <span>ADDING...</span>
                  </>
                ) : justAdded ? (
                  <>
                    <Check strokeWidth={2} size={13} />
                    <span>ADDED</span>
                  </>
                ) : qty === 0 ? (
                  <span>SOLD OUT</span>
                ) : inCart >= qty ? (
                  <span>MAX IN CART</span>
                ) : inCart > 0 ? (
                  <>
                    <ShoppingBag strokeWidth={1.5} size={13} />
                    <span>ADD ({inCart})</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag strokeWidth={1.5} size={13} />
                    <span>ADD</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

export default ProductCard;
