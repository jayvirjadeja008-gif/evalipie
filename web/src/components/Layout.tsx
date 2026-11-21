import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search, ShoppingBag, MapPin, User, LogOut, Shield, Heart, HelpCircle, Navigation } from "lucide-react";
import { api } from "../api";
import { useApp } from "../store";
import { SpatialDepthTransition } from "./SpatialDepthTransition";
import { SystemTelemetryDrawer } from "./SystemTelemetryDrawer";
import { CartDrawer } from "./CartDrawer";
import { WishlistDrawer } from "./WishlistDrawer";
import { CustomerCareDrawer } from "./CustomerCareDrawer";
import { LiveSaleBanner } from "./LiveSaleBanner";
import { LiveReviewTicker } from "./LiveReviewTicker";
import { CategoryNavStrip } from "./CategoryNavStrip";

function SearchBox() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  const [sugg, setSugg] = useState<{ id: number; name: string; category_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(sp.get("q") || ""); }, [sp]);
  useEffect(() => {
    if (q.trim().length < 2) { setSugg([]); return; }
    const t = setTimeout(() => {
      api<typeof sugg>(`/search/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => { setSugg(r); setActive(-1); })
        .catch(() => setSugg([]));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const go = (term: string) => {
    setOpen(false);
    nav(term ? `/?q=${encodeURIComponent(term)}` : "/");
  };

  return (
    <div ref={box} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(active >= 0 ? sugg[active].name : q.trim());
        }}
        className="relative flex items-center"
      >
        <span className="absolute left-3.5 text-ink-secondary pointer-events-none">
          <Search strokeWidth={1.5} size={15} />
        </span>
        <input
          className="w-full bg-[#FFFFFF] border border-[#E4E2DA] focus:border-[#111111] text-[#111111] placeholder:text-[#8E8A82] text-xs py-2.5 pl-10 pr-4 rounded-[2px] transition-colors focus:outline-none font-sans"
          placeholder="Search products, brands, models (typo-tolerant)..."
          aria-label="Search products"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, sugg.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(""); go(""); }}
            className="absolute right-3 text-[10px] font-mono text-[#8E8A82] hover:text-[#111111]"
          >
            ESC
          </button>
        )}
      </form>

      {open && sugg.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full z-40 mt-1.5 bg-[#FFFFFF] border border-[#E4E2DA] shadow-architectural py-1 rounded-[2px] divide-y divide-[#E4E2DA]/40 max-h-72 overflow-y-auto"
          role="listbox"
        >
          {sugg.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button
                className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs ${
                  i === active ? "bg-[#ECEAE2]" : "hover:bg-[#F6F5F0]"
                }`}
                onMouseDown={() => nav(`/product/${s.id}`)}
              >
                <span className="font-medium text-[#111111]">{s.name}</span>
                <span className="font-mono text-[10px] text-[#5A5852] uppercase bg-[#ECEAE2] px-1.5 py-0.5 rounded-[1px]">
                  {s.category_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Layout() {
  const {
    user,
    logout,
    openGateway,
    cart,
    city,
    setCity,
    cities,
    detectLocation,
    wishlistCount,
    setIsWishlistOpen,
    setIsSupportOpen,
  } = useApp();
  const count = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  const cityList = cities.length > 0 ? cities : ["Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune"];

  const handleDetectCity = async () => {
    setLocating(true);
    await detectLocation();
    setLocating(false);
  };

  return (
    <div className="relative min-h-screen bg-[#F6F5F0] overflow-x-hidden font-sans" style={{ perspective: "1400px" }}>
      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Wishlist Drawer */}
      <WishlistDrawer />

      {/* Customer Care & Help Center Drawer */}
      <CustomerCareDrawer />

      {/* Main Page Stage - Transforms with 3D Depth Push when Cart Drawer opens */}
      <div
        className="flex min-h-screen flex-col pb-12 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: isCartOpen
            ? "scale(0.92) translateZ(-100px) rotateY(4deg)"
            : "scale(1) translateZ(0px) rotateY(0deg)",
          transformOrigin: "left center",
          filter: isCartOpen ? "brightness(0.94)" : "none",
          pointerEvents: isCartOpen ? "none" : "auto",
        }}
      >
        {/* Top Architectural Header */}
        <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E4E2DA]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 select-none group">
              <img
                src="/assets/evalipie-logo-transparent.png"
                alt="EvaliPie Market"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-display text-base font-bold tracking-tight text-[#111111]">
                    EVALIPIE
                  </span>
                  <span className="font-mono text-[9px] font-bold bg-[#B84A27] text-white px-1.5 py-0.2 rounded-[1px]">
                    MARKET
                  </span>
                </div>
                <span className="font-mono text-[9px] text-[#5A5852] tracking-wider mt-0.5">
                  REAL-TIME RETAIL
                </span>
              </div>
            </Link>

            {/* Global Typo-tolerant Search Box */}
            <div className="order-3 w-full md:order-none md:w-auto md:flex-1 md:max-w-md">
              <SearchBox />
            </div>

            {/* Navigation, City Selector & Drawers */}
            <nav className="ml-auto flex items-center gap-2 text-xs font-mono">
              {/* City Fulfillment Selector with Location Auto-Detect */}
              <div className="flex items-center border border-[#E4E2DA] bg-[#F6F5F0] px-2 py-1 text-xs text-[#111111] rounded-[2px] hover:border-[#111111] transition-colors">
                <MapPin strokeWidth={1.5} size={13} className="text-[#B84A27] shrink-0" />
                <select
                  className="cursor-pointer bg-transparent font-mono text-xs font-semibold focus:outline-none text-[#111111] pl-1 pr-1.5"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  aria-label="City fulfillment hub"
                >
                  {cityList.map((c) => (
                    <option key={c} value={c} className="bg-white text-ink font-sans">
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleDetectCity}
                  disabled={locating}
                  className="p-1 text-[#5A5852] hover:text-[#B84A27] transition-colors border-l border-[#E4E2DA]/60 pl-1.5"
                  title="Auto-detect nearest Indian retail hub via GPS"
                  aria-label="Auto-detect nearest hub"
                >
                  <Navigation strokeWidth={1.5} size={11} className={locating ? "animate-spin text-[#B84A27]" : ""} />
                </button>
              </div>

              {/* Wishlist Button with Counter */}
              <button
                type="button"
                onClick={() => setIsWishlistOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-transparent hover:border-[#E4E2DA] rounded-[2px] text-[#5A5852] hover:text-[#111111] transition-colors"
                title="View saved specifications"
              >
                <Heart strokeWidth={1.5} size={13} className={wishlistCount > 0 ? "text-[#B84A27] fill-[#B84A27]" : ""} />
                <span>WISHLIST</span>
                {wishlistCount > 0 && (
                  <span className="font-mono text-[10px] font-bold bg-[#111111] text-white px-1.5 py-0.2 rounded-[1px]">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Support & Customer Care Drawer Trigger */}
              <button
                type="button"
                onClick={() => setIsSupportOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-transparent hover:border-[#E4E2DA] rounded-[2px] text-[#5A5852] hover:text-[#111111] transition-colors"
                title="Customer Care & Help Center"
              >
                <HelpCircle strokeWidth={1.5} size={13} />
                <span>SUPPORT</span>
              </button>

              {user && (
                <NavLink
                  to="/orders"
                  className={({ isActive }) =>
                    `px-3 py-1.5 border border-transparent rounded-[2px] hover:border-[#E4E2DA] transition-colors ${
                      isActive ? "bg-[#ECEAE2] text-[#111111] font-bold" : "text-[#5A5852]"
                    }`
                  }
                >
                  ORDERS
                </NavLink>
              )}

              {user?.role === "admin" && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 border border-transparent rounded-[2px] hover:border-[#E4E2DA] transition-colors ${
                      isActive ? "bg-[#ECEAE2] text-[#111111] font-bold" : "text-[#5A5852]"
                    }`
                  }
                >
                  <Shield strokeWidth={1.5} size={13} />
                  <span>ADMIN</span>
                </NavLink>
              )}

              {/* 3D Depth-Push Cart Trigger Button */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center gap-2 border border-[#111111] bg-[#FFFFFF] px-3 py-1.5 text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF] transition-colors rounded-[2px]"
                aria-label={`Open shopping cart with ${count} items`}
              >
                <ShoppingBag strokeWidth={1.5} size={14} />
                <span className="font-bold">CART</span>
                {count > 0 && (
                  <span className="font-mono text-[11px] font-bold bg-[#B84A27] text-white px-1.5 py-0.2 rounded-[1px]">
                    {count}
                  </span>
                )}
              </button>

              {user ? (
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#E4E2DA] bg-[#FFFFFF] rounded-[2px] text-xs font-mono text-[#111111]"
                    title={`Signed in as ${user.email}`}
                  >
                    <User strokeWidth={1.5} size={13} className="text-[#B84A27]" />
                    <span className="font-bold truncate max-w-[120px]">{user.name.toUpperCase()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-1 px-2.5 py-1.5 border border-[#E4E2DA] hover:border-[#111111] bg-[#FFFFFF] hover:bg-[#F6F5F0] rounded-[2px] text-[#5A5852] hover:text-[#111111] transition-colors text-xs font-mono"
                    title="Log out and return to Login Gateway"
                  >
                    <LogOut strokeWidth={1.5} size={13} />
                    <span>LOG OUT</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openGateway}
                  className="btn-primary !py-1.5 !px-3.5 text-xs font-mono flex items-center gap-1.5"
                  title="Sign in or create account"
                >
                  <User strokeWidth={1.5} size={13} />
                  <span>SIGN IN</span>
                </button>
              )}
            </nav>
          </div>

          {/* Feature 2: Live Sale & Flash Deal Strip directly under the nav bar */}
          <LiveSaleBanner />

          {/* Sub-Navigation Category Strip */}
          <CategoryNavStrip />
        </header>

        {/* Page Content with 3D Spatial Depth Push & Glide Transition */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
          <SpatialDepthTransition />
        </main>

        {/* Minimal Architectural Footer */}
        <footer className="border-t border-[#E4E2DA] py-8 text-xs font-mono text-[#5A5852] bg-[#FFFFFF]">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#1B4332] rounded-[1px]" />
              <span className="font-bold text-[#111111]">EVALIPIE MARKET HIGH-CONCURRENCY RETAIL ENGINE</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[#8E8A82]">
              <button
                type="button"
                onClick={() => setIsSupportOpen(true)}
                className="hover:text-[#111111] transition-colors underline"
              >
                Customer Care &amp; Hub FAQ
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setIsWishlistOpen(true)}
                className="hover:text-[#111111] transition-colors underline"
              >
                Wishlist Specifications
              </button>
              <span>·</span>
              <span>POSTGRESQL ROW LOCKS · KAFKA EVENT STREAM · OPENSEARCH SYNC</span>
            </div>
          </div>
        </footer>
      </div>

      {/* System Telemetry Console Drawer */}
      <SystemTelemetryDrawer />

      {/* Real-Time Live Verified Reviews Ticker / Notification */}
      <LiveReviewTicker />
    </div>
  );
}
export default Layout;
