import React from "react";

// Five architectural pips that drain as regional stock runs out.
export function StockMeter({ qty, city, compact = false }: { qty: number; city: string; compact?: boolean }) {
  const filled = Math.min(qty, 5);
  const tone = qty === 0 ? "bg-[#8E8A82]" : qty <= 5 ? "bg-terracotta" : "bg-forest";
  const text = qty === 0 ? `Sold out in ${city}` : qty <= 5 ? `Only ${qty} left in ${city}` : `In stock in ${city} (${qty})`;
  const color = qty === 0 ? "text-ink-secondary" : qty <= 5 ? "text-terracotta font-semibold" : "text-forest font-semibold";

  return (
    <div className="flex items-center gap-2" aria-label={text}>
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-3 rounded-[1px] transition-colors ${
              i < filled || qty > 5 ? tone : "bg-paper-stone"
            }`}
          />
        ))}
      </div>
      {!compact && <span className={`font-mono text-[11px] ${color}`}>{text}</span>}
    </div>
  );
}
