import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Trash2, ArrowRight, ShieldCheck, ShoppingBag, Plus, Minus } from "lucide-react";
import { useApp } from "../store";
import { inr, inrPaise } from "../api";
import { StockMeter } from "./StockMeter";
import { getProductFallback } from "../utils/images";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, setQty, city, setCity, cities, user } = useApp();
  const nav = useNavigate();

  const totalCount = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const cityList = cities.length > 0 ? cities : ["Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune"];

  const handleCheckout = () => {
    onClose();
    if (!user) {
      nav(`/login?next=${encodeURIComponent("/cart")}`);
    } else {
      nav("/cart");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-[#FFFFFF] border-l border-[#E4E2DA] shadow-hover3d flex flex-col transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping Cart Drawer"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#E4E2DA] px-6 py-4 bg-[#F6F5F0]">
          <div className="flex items-center gap-2">
            <ShoppingBag strokeWidth={1.5} size={18} className="text-[#111111]" />
            <h2 className="font-display text-base font-bold tracking-tight text-[#111111]">
              CART [{totalCount}]
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#5A5852] hover:text-[#111111] hover:bg-[#ECEAE2] transition-colors rounded-[2px]"
            aria-label="Close cart drawer"
          >
            <X strokeWidth={1.5} size={18} />
          </button>
        </div>

        {/* City Fulfillment Dispatch Bar */}
        <div className="border-b border-[#E4E2DA] bg-[#ECEAE2] px-6 py-2.5 flex items-center justify-between text-xs font-mono">
          <span className="text-[#5A5852]">DISPATCH CITY:</span>
          <select
            className="bg-transparent font-mono text-xs font-bold text-[#111111] focus:outline-none cursor-pointer border-b border-[#111111]/30 pb-0.5"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            {cityList.map((c) => (
              <option key={c} value={c} className="bg-white text-ink font-sans">
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[#E4E2DA]">
          {!cart || cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 border border-[#E4E2DA] bg-[#F6F5F0] flex items-center justify-center text-[#8E8A82]">
                <ShoppingBag strokeWidth={1.5} size={24} />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-[#111111]">Your cart is currently empty</p>
                <p className="text-xs text-[#5A5852] mt-1">Select items from the catalog to reserve physical stock.</p>
              </div>
              <button onClick={onClose} className="btn-ghost text-xs">
                Browse Catalog
              </button>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.productId} className="py-4 flex gap-4 items-start">
                <img
                  src={item.image_url || getProductFallback("", item.name, item.sku)}
                  alt={item.name}
                  className="w-16 h-16 object-cover border border-[#E4E2DA] bg-[#F6F5F0] shrink-0 rounded-[1px]"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = getProductFallback("", item.name, item.sku);
                  }}
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/product/${item.productId}`}
                      onClick={onClose}
                      className="font-display text-xs font-bold text-[#111111] truncate hover:text-[#B84A27] transition-colors"
                    >
                      {item.name}
                    </Link>
                    <button
                      onClick={() => setQty(item.productId, 0)}
                      className="text-[#8E8A82] hover:text-[#B84A27] transition-colors p-0.5 shrink-0"
                      title="Remove item"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 strokeWidth={1.5} size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#111111]">
                      {inr(item.price)}
                    </span>
                    <StockMeter qty={item.available} city={city} />
                  </div>

                  {!item.inStock && (
                    <p className="text-[10px] font-mono text-[#B84A27]">
                      {item.available === 0 ? "OUT OF STOCK IN " + city.toUpperCase() : `ONLY ${item.available} LEFT`}
                    </p>
                  )}

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex items-center border border-[#E4E2DA] bg-[#F6F5F0]">
                      <button
                        onClick={() => setQty(item.productId, item.quantity - 1)}
                        className="px-2 py-1 text-xs text-[#111111] hover:bg-[#E4E2DA] transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus strokeWidth={1.5} size={12} />
                      </button>
                      <span className="font-mono text-xs font-semibold w-7 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => setQty(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= 99 || item.quantity >= item.available}
                        className="px-2 py-1 text-xs text-[#111111] hover:bg-[#E4E2DA] disabled:opacity-30 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus strokeWidth={1.5} size={12} />
                      </button>
                    </div>
                    <span className="font-mono text-xs text-[#5A5852] ml-auto">
                      {inr(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {cart && cart.items.length > 0 && (
          <div className="border-t border-[#E4E2DA] p-6 bg-[#F6F5F0] space-y-4">
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-[#5A5852]">
                <span>ITEMS TOTAL</span>
                <span>{inrPaise(cart.totalPaise)}</span>
              </div>
              <div className="flex justify-between text-[#5A5852]">
                <span>STORE PICKUP / DELIVERY</span>
                <span className="text-[#1B4332]">FREE (EXPRESS)</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#111111] pt-2 border-t border-[#E4E2DA]">
                <span>TOTAL PAYABLE</span>
                <span>{inrPaise(cart.totalPaise)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#5A5852]">
              <ShieldCheck strokeWidth={1.5} size={14} className="text-[#1B4332]" />
              <span>POSTGRESQL ROW-LOCK VERIFIED AT CHECKOUT</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCheckout}
                disabled={!cart.canCheckout}
                className="btn-accent col-span-2 !py-2.5 flex items-center justify-center gap-2"
              >
                <span>PROCEED TO SECURE CHECKOUT</span>
                <ArrowRight strokeWidth={1.5} size={15} />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
