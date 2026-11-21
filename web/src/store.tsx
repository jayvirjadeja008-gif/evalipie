import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { api, getToken, setToken } from "./api";
import type { Cart, Product, User } from "./types";

const CITIES_COORDS: Record<string, { lat: number; lng: number }> = {
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Pune: { lat: 18.5204, lng: 73.8567 },
};

function getNearestCity(lat: number, lng: number): string {
  let nearest = "Bengaluru";
  let minDistance = Infinity;
  for (const [cityName, coords] of Object.entries(CITIES_COORDS)) {
    const d = Math.hypot(coords.lat - lat, coords.lng - lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = cityName;
    }
  }
  return nearest;
}

interface Ctx {
  user: User | null;
  ready: boolean;
  isGatewayOpen: boolean;
  openGateway(): void;
  closeGateway(): void;
  isGuest: boolean;
  browseAsGuest(): void;
  loginAsDemo(): Promise<void>;
  login(email: string, password: string): Promise<User>;
  register(name: string, email: string, password: string, defaultCity?: string): Promise<User>;
  logout(): void;
  city: string;
  setCity(c: string): void;
  cities: string[];
  detectLocation(): Promise<string | null>;
  cart: Cart | null;
  refreshCart(): Promise<void>;
  setQty(productId: number, quantity: number): Promise<void>;
  wishlist: Product[];
  wishlistCount: number;
  isWishlisted(productId: number): boolean;
  toggleWishlist(product: Product): Promise<void>;
  isWishlistOpen: boolean;
  setIsWishlistOpen(open: boolean): void;
  isSupportOpen: boolean;
  setIsSupportOpen(open: boolean): void;
  liveRatingUpdates: Record<number, { rating: number; count: number; timestamp: number }>;
  toast(msg: string, kind?: "ok" | "error"): void;
}

const C = createContext<Ctx>(null as never);
export const useApp = () => useContext(C);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [city, setCityState] = useState(localStorage.getItem("ss_city") || "Bengaluru");
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: string }[]>([]);

  // Guest Mode & Gateway Control State
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem("ss_guest") === "true");
  const [isGatewayOpen, setIsGatewayOpen] = useState(() => {
    const token = getToken();
    const guest = localStorage.getItem("ss_guest") === "true";
    return !token && !guest;
  });

  // Wishlist & UI Drawer State
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem("ss_wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [liveRatingUpdates, setLiveRatingUpdates] = useState<Record<number, { rating: number; count: number; timestamp: number }>>({});

  useEffect(() => {
    const es = new EventSource("/api/reviews/live");
    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "new_review" && payload.review && payload.stats) {
          setLiveRatingUpdates((prev) => ({
            ...prev,
            [payload.review.product_id]: {
              rating: payload.stats.average,
              count: payload.stats.total,
              timestamp: Date.now(),
            },
          }));
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  const toast = useCallback((msg: string, kind: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const refreshCart = useCallback(async () => {
    if (!getToken()) return setCart(null);
    try {
      const c = await api<Cart>("/cart");
      setCart(c);
    } catch {
      setCart(null);
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    if (!getToken()) return;
    try {
      const serverWishlist = await api<Product[]>("/wishlist");
      setWishlist(serverWishlist);
      localStorage.setItem("ss_wishlist", JSON.stringify(serverWishlist));
    } catch {
      // Keep local state
    }
  }, []);

  useEffect(() => {
    api<string[]>("/cities").then(setCities).catch(() => {});
    (async () => {
      const token = getToken();
      const guest = localStorage.getItem("ss_guest") === "true";
      if (token) {
        try {
          const { user } = await api<{ user: User }>("/auth/me");
          setUser(user);
          await refreshCart();
          await refreshWishlist();
          setIsGatewayOpen(false);
        } catch {
          setToken(null);
          if (!guest) {
            setIsGatewayOpen(true);
          }
        }
      } else if (guest) {
        setIsGuest(true);
        setIsGatewayOpen(false);
      } else {
        setIsGatewayOpen(true);
      }
      setReady(true);
    })();
  }, [refreshCart, refreshWishlist]);

  const afterAuth = async (r: { token: string; user: User }, targetCity?: string) => {
    setToken(r.token);
    setUser(r.user);
    localStorage.removeItem("ss_guest");
    setIsGuest(false);
    const activeCity = targetCity || city;
    if (targetCity) {
      setCityState(targetCity);
      localStorage.setItem("ss_city", targetCity);
    }
    await api("/cart/city", { method: "PUT", body: { city: activeCity } }).catch(() => {});
    await refreshCart();
    await refreshWishlist();
    setIsGatewayOpen(false);
    return r.user;
  };

  const login = async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    const u = await afterAuth(res);
    toast(`Authenticated as ${u.name}`);
    return u;
  };

  const register = async (name: string, email: string, password: string, defaultCity?: string) => {
    const res = await api<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
    const u = await afterAuth(res, defaultCity);
    toast(`Account initialized for ${u.name}. Hub: ${(defaultCity || city).toUpperCase()}`);
    return u;
  };

  const loginAsDemo = async () => {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email: "demo@stocksync.in", password: "demo123" },
    });
    await afterAuth(res, "Bengaluru");
    toast("Connected with Demo Customer Account (Bengaluru Hub)");
  };

  const browseAsGuest = () => {
    localStorage.setItem("ss_guest", "true");
    setIsGuest(true);
    setIsGatewayOpen(false);
    toast("Browsing as Guest. Real-time catalog active.");
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCart(null);
    setWishlist([]);
    localStorage.removeItem("ss_token");
    localStorage.removeItem("ss_guest");
    localStorage.removeItem("ss_wishlist");
    setIsGuest(false);
    setIsGatewayOpen(true);
    toast("Logged out. Returning to Login Gateway.");
  };

  const openGateway = () => setIsGatewayOpen(true);
  const closeGateway = () => setIsGatewayOpen(false);

  const isWishlisted = useCallback(
    (productId: number) => wishlist.some((item) => item.id === productId),
    [wishlist]
  );

  const toggleWishlist = useCallback(
    async (product: Product) => {
      const exists = wishlist.some((i) => i.id === product.id);
      let nextWishlist: Product[];
      if (exists) {
        nextWishlist = wishlist.filter((i) => i.id !== product.id);
        toast(`Removed ${product.name} from wishlist`);
        if (getToken()) {
          api(`/wishlist/${product.id}`, { method: "DELETE" }).catch(() => {});
        }
      } else {
        nextWishlist = [product, ...wishlist];
        toast(`Saved ${product.name} to wishlist`);
        if (getToken()) {
          api(`/wishlist/${product.id}`, { method: "POST" }).catch(() => {});
        }
      }
      setWishlist(nextWishlist);
      localStorage.setItem("ss_wishlist", JSON.stringify(nextWishlist));
    },
    [wishlist, toast]
  );

  const detectLocation = useCallback(async (): Promise<string | null> => {
    if (!navigator.geolocation) {
      toast("Geolocation is not supported by your browser.", "error");
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nearest = getNearestCity(pos.coords.latitude, pos.coords.longitude);
          setCityState(nearest);
          localStorage.setItem("ss_city", nearest);
          if (getToken()) {
            api("/cart/city", { method: "PUT", body: { city: nearest } })
              .then(setCart)
              .catch(() => {});
          }
          toast(`Retail fulfillment switched to nearest hub: ${nearest.toUpperCase()}`);
          resolve(nearest);
        },
        (err) => {
          toast(`Location detection: ${err.message}. Using ${city}.`, "error");
          resolve(null);
        },
        { timeout: 8000 }
      );
    });
  }, [city, toast]);

  const value = useMemo<Ctx>(
    () => ({
      user,
      ready,
      isGatewayOpen,
      openGateway,
      closeGateway,
      isGuest,
      browseAsGuest,
      loginAsDemo,
      login,
      register,
      logout,
      cart,
      city,
      cities,
      detectLocation,
      toast,
      refreshCart,
      wishlist,
      wishlistCount: wishlist.length,
      isWishlisted,
      toggleWishlist,
      isWishlistOpen,
      setIsWishlistOpen,
      isSupportOpen,
      setIsSupportOpen,
      setCity: (c) => {
        setCityState(c);
        localStorage.setItem("ss_city", c);
        if (getToken()) {
          api("/cart/city", { method: "PUT", body: { city: c } }).then(setCart).catch(() => {});
        }
      },
      setQty: async (productId, quantity) => {
        if (!getToken()) {
          try {
            const auth = await api<{ token: string; user: User }>("/auth/login", {
              method: "POST",
              body: { email: "demo@stocksync.in", password: "demo123" },
            });
            setToken(auth.token);
            setUser(auth.user);
          } catch {}
        }
        const updated = await api<Cart>("/cart/items", { method: "PUT", body: { productId, quantity } });
        setCart(updated);
      },
      liveRatingUpdates,
    }),
    [
      user,
      ready,
      isGatewayOpen,
      isGuest,
      cart,
      city,
      cities,
      detectLocation,
      toast,
      refreshCart,
      wishlist,
      isWishlisted,
      toggleWishlist,
      isWishlistOpen,
      isSupportOpen,
      liveRatingUpdates,
    ]
  );

  return (
    <C.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2 font-mono text-xs"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto border px-3.5 py-2.5 shadow-md rounded-[2px] transition-all ${
              t.kind === "error"
                ? "bg-[#111111] border-[#B84A27] text-[#FFFFFF]"
                : "bg-[#FFFFFF] border-[#111111] text-[#111111]"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </C.Provider>
  );
}
