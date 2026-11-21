import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Zap, ArrowRight, Tag } from "lucide-react";

export function LiveSaleBanner() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const isDealsActive = sp.get("deals") === "true";

  // Real-time countdown timer to midnight IST
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 15 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Target is end of current 6-hour retail flash drop cycle
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.max(0, midnight.getTime() - now.getTime());

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      return { hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const format = (n: number) => String(n).padStart(2, "0");

  const toggleDeals = () => {
    const nextSp = new URLSearchParams(sp);
    if (isDealsActive) {
      nextSp.delete("deals");
    } else {
      nextSp.set("deals", "true");
    }
    nav(`/?${nextSp.toString()}`);
    // Smooth scroll down to catalog header
    const catalogEl = document.getElementById("catalog-section");
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="bg-[#111111] text-[#F6F5F0] border-b border-[#2E2E2A] px-4 py-2 select-none">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Live Indicator & Flash Sale Title */}
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B84A27] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B84A27]" />
          </span>

          <span className="font-mono text-[10px] font-bold tracking-wider uppercase bg-[#B84A27] text-white px-1.5 py-0.5 rounded-[1px]">
            LIVE FLASH DEAL
          </span>

          <span className="font-display font-semibold text-xs tracking-tight text-[#FFFFFF]">
            NATIONWIDE RETAIL SALE: UP TO 70% OFF ACROSS ALL HUBS
          </span>
        </div>

        {/* Real-time Countdown & Filter CTA */}
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#ECEAE2]">
            <span className="text-[#8E8A82] text-[10px] uppercase">ENDS IN:</span>
            <span className="bg-[#1E1E1B] border border-[#2E2E2A] px-1.5 py-0.5 rounded-[1px] font-bold text-[#FFFFFF] tracking-widest">
              {format(timeLeft.hours)}:{format(timeLeft.minutes)}:{format(timeLeft.seconds)}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleDeals}
            className={`font-mono text-xs font-bold px-3 py-1 border transition-colors flex items-center gap-1 rounded-[1px] ${
              isDealsActive
                ? "bg-[#B84A27] text-white border-[#B84A27]"
                : "bg-transparent text-[#FFFFFF] border-[#5A5852] hover:border-[#FFFFFF] hover:bg-[#1E1E1B]"
            }`}
          >
            <Zap strokeWidth={1.5} size={12} className={isDealsActive ? "text-white" : "text-[#B84A27]"} />
            <span>{isDealsActive ? "SHOWING DEALS (CLEAR)" : "VIEW LIVE DEALS"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LiveSaleBanner;
