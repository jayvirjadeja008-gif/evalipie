import React from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function CategoryNavStrip() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const location = useLocation();

  const category = sp.get("category") || "";
  const subcat = sp.get("subcat") || "";
  const gender = sp.get("gender") || "";

  const items = [
    {
      label: "All Fashion",
      active: category === "fashion" && !subcat && !gender,
      onClick: () => setFilter({ category: "fashion", subcat: "", gender: "", q: "" }),
    },
    {
      label: "Men",
      active: gender === "men",
      onClick: () => setFilter({ gender: "men", category: "", subcat: "", q: "" }),
    },
    {
      label: "Women",
      active: gender === "women",
      onClick: () => setFilter({ gender: "women", category: "", subcat: "", q: "" }),
    },
    {
      label: "Kids",
      active: gender === "kids",
      onClick: () => setFilter({ gender: "kids", category: "", subcat: "", q: "" }),
    },
    {
      label: "Footwear",
      active: category === "footwear" || subcat === "shoes",
      onClick: () => setFilter({ category: "footwear", subcat: "", gender: "", q: "" }),
    },
    {
      label: "Watches",
      active: subcat === "watches",
      onClick: () => setFilter({ subcat: "watches", category: "", gender: "", q: "" }),
    },
    {
      label: "Bags",
      active: subcat === "bags",
      onClick: () => setFilter({ subcat: "bags", category: "", gender: "", q: "" }),
    },
    {
      label: "Accessories",
      active: subcat === "accessories",
      onClick: () => setFilter({ subcat: "accessories", category: "", gender: "", q: "" }),
    },
    {
      label: "Ethnic Wear",
      active: subcat === "ethnic",
      onClick: () => setFilter({ subcat: "ethnic", category: "", gender: "", q: "" }),
    },
    {
      label: "Western Wear",
      active: subcat === "western",
      onClick: () => setFilter({ subcat: "western", category: "", gender: "", q: "" }),
    },
    {
      label: "Sportswear",
      active: subcat === "sportswear",
      onClick: () => setFilter({ subcat: "sportswear", category: "", gender: "", q: "" }),
    },
    {
      label: "Audio & Sound",
      active: category === "audio",
      onClick: () => setFilter({ category: "audio", subcat: "", gender: "", q: "" }),
    },
    {
      label: "Mobiles",
      active: category === "mobiles",
      onClick: () => setFilter({ category: "mobiles", subcat: "", gender: "", q: "" }),
    },
    {
      label: "Laptops",
      active: category === "laptops",
      onClick: () => setFilter({ category: "laptops", subcat: "", gender: "", q: "" }),
    },
    {
      label: "Home & Kitchen",
      active: category === "home",
      onClick: () => setFilter({ category: "home", subcat: "", gender: "", q: "" }),
    },
  ];

  const setFilter = (patch: Record<string, string>) => {
    const n = new URLSearchParams(sp);
    n.delete("page");
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    if (location.pathname !== "/") {
      nav(`/?${n.toString()}`);
    } else {
      setSp(n);
    }
  };

  const handleStoreClick = () => {
    if (location.pathname !== "/") {
      nav("/");
    } else {
      setSp(new URLSearchParams());
    }
  };

  const isStoreActive = location.pathname === "/" && !category && !subcat && !gender && !sp.get("q") && !sp.get("brand");

  return (
    <nav className="w-full bg-[#FFFFFF] border-b border-[#E4E2DA] shadow-[0_1px_2px_rgba(0,0,0,0.03)]" aria-label="Store Categories">
      <div className="mx-auto flex max-w-7xl items-center gap-1 sm:gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar whitespace-nowrap text-xs font-semibold sm:text-sm">
        {/* Store back button */}
        <button
          type="button"
          onClick={handleStoreClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors shrink-0 font-bold border-r border-[#E4E2DA] pr-4 mr-1 ${
            isStoreActive ? "text-[#0B57D0]" : "text-[#111111] hover:text-[#0B57D0]"
          }`}
          title="Return to full Storefront catalog"
        >
          <ArrowLeft strokeWidth={2.2} size={16} />
          <span>Store</span>
        </button>

        {/* Navigation Category Items from specification */}
        {items.map((item) => {
          const isActive = item.active;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 font-semibold text-xs sm:text-sm ${
                isActive
                  ? "bg-[#0B57D0] text-white shadow-xs"
                  : "text-[#374151] hover:text-[#111111] hover:bg-[#F3F4F6]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
