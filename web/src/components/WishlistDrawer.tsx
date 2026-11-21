import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Heart, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useApp } from "../store";
import { inr } from "../api";
import { getProductFallback } from "../utils/images";
import { StockMeter } from "./StockMeter";

export function WishlistDrawer() {
  const { wishlist, isWishlistOpen, setIsWishlistOpen, toggleWishlist, setQty, city, cart } = useApp();
  const nav = useNavigate();

  if (!isWishlistOpen) return null;

  const handleMoveToCart = async (product: any) => {
    const inCart = cart?.items.find((i) => i.productId === product.id)?.quantity ?? 0;
    await setQty(product.id, inCart + 1);
    await toggleWishlist(product);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#111111]/45 backdrop-blur-sm transition-opacity"
        onClick={() => setIsWishlistOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-[#FFFFFF] border-l border-[#E4E2DA] shadow-architectural flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#E4E2DA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart strokeWidth={1.5} size={16} className="text-[#B84A27] fill-[#B84A27]" />
              <h2 className="font-display font-bold text-sm tracking-tight text-[#111111]">
                SAVED SPECIFICATIONS ({wishlist.length})
              </h2>
            </div>
            <button
              onClick={() => setIsWishlistOpen(false)}
              className="p-1 text-[#5A5852] hover:text-[#111111] transition-colors rounded-[1px]"
              aria-label="Close Wishlist"
            >
              <X strokeWidth={1.5} size={18} />
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-[#E4E2DA]">
            {wishlist.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-[2px] bg-[#ECEAE2] border border-[#E4E2DA] flex items-center justify-center text-[#5A5852]">
                  <Heart strokeWidth={1.5} size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-[#111111]">YOUR WISHLIST IS EMPTY</h3>
                  <p className="font-mono text-xs text-[#5A5852] mt-1">
                    Save products from the catalog to monitor inventory and price movements.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWishlistOpen(false)}
                  className="btn-ghost text-xs mt-2"
                >
                  Browse Catalog
                </button>
              </div>
            ) : (
              wishlist.map((item) => {
                const stockQty = item.stock?.[city] ?? 0;
                const price = item.price;
                const mrp = item.mrp || Math.round(price * 1.35);
                const discount = item.discount_percent || Math.max(5, Math.round(((mrp - price) / mrp) * 100));

                return (
                  <div key={item.id} className="py-4 flex gap-4 items-start">
                    <img
                      src={item.image_url || getProductFallback(item.category, item.name, item.sku)}
                      alt={item.name}
                      className="w-16 h-16 object-cover border border-[#E4E2DA] bg-[#F6F5F0] shrink-0 rounded-[1px]"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getProductFallback(
                          item.category,
                          item.name,
                          item.sku
                        );
                      }}
                    />

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/product/${item.id}`}
                          onClick={() => setIsWishlistOpen(false)}
                          className="font-display text-xs font-bold text-[#111111] truncate hover:text-[#B84A27] transition-colors"
                        >
                          {item.name}
                        </Link>
                        <button
                          onClick={() => toggleWishlist(item)}
                          className="text-[#8E8A82] hover:text-[#B84A27] transition-colors p-0.5 shrink-0"
                          title="Remove from wishlist"
                        >
                          <Trash2 strokeWidth={1.5} size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-[#111111]">{inr(price)}</span>
                        {mrp > price && (
                          <span className="text-[#5A5852] line-through text-[11px]">{inr(mrp)}</span>
                        )}
                        {discount > 0 && (
                          <span className="text-[9px] font-bold text-white bg-[#B84A27] px-1 py-0.2 rounded-[1px]">
                            {discount}% OFF
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="font-mono text-[10px] text-[#5A5852]">
                          {stockQty > 0 ? (
                            <span className="text-[#1B4332] font-semibold">{stockQty} in {city}</span>
                          ) : (
                            <span className="text-[#B84A27] font-semibold">Out of Stock in {city}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={stockQty === 0}
                          onClick={() => handleMoveToCart(item)}
                          className="btn-primary !text-[11px] !py-1 !px-2 flex items-center gap-1 disabled:opacity-40"
                        >
                          <ShoppingBag strokeWidth={1.5} size={11} />
                          <span>MOVE TO CART</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {wishlist.length > 0 && (
            <div className="p-4 border-t border-[#E4E2DA] bg-[#F6F5F0] flex items-center justify-between text-xs font-mono">
              <span className="text-[#5A5852]">{wishlist.length} specifications saved</span>
              <button
                type="button"
                onClick={() => setIsWishlistOpen(false)}
                className="btn-ghost !text-xs !py-1"
              >
                Close Drawer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WishlistDrawer;
