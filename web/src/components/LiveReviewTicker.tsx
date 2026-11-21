import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle2, X, Radio, ArrowUpRight, Volume2, VolumeX } from "lucide-react";
import type { Review } from "../types";

interface LiveReviewEvent {
  type: string;
  review: Review;
  productName: string;
  productSku: string;
  stats?: {
    average: number;
    total: number;
  };
}

export function LiveReviewTicker() {
  const [current, setCurrent] = useState<LiveReviewEvent | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Connect to global SSE stream for store-wide live customer reviews
    const es = new EventSource("/api/reviews/live");

    es.onmessage = (event) => {
      try {
        const payload: LiveReviewEvent = JSON.parse(event.data);
        if (payload.type === "new_review" && payload.review && !isPaused) {
          setCurrent(payload);

          // Clear previous timeout if any
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          // Auto-hide after 8 seconds
          timeoutRef.current = setTimeout(() => {
            setCurrent(null);
          }, 8000);
        }
      } catch (err) {
        console.error("Global live review parse error", err);
      }
    };

    return () => {
      es.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPaused]);

  if (!current) return null;

  const { review, productName } = current;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-5 left-5 z-40 w-[340px] max-w-[calc(100vw-40px)] bg-[#FFFFFF] border border-[#111111] p-3.5 shadow-2xl rounded-[2px] font-sans"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#E4E2DA] pb-2 font-mono text-[10px]">
          <div className="flex items-center gap-1.5 text-[#1B4332]">
            <span className="w-2 h-2 rounded-full bg-[#1B4332] animate-ping" />
            <span className="font-bold tracking-wider">LIVE VERIFIED AUDIT</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="text-[#8E8A82] hover:text-[#111111] transition-colors"
              title={isPaused ? "Resume live review alerts" : "Mute live review alerts"}
            >
              {isPaused ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>
            <button
              type="button"
              onClick={() => setCurrent(null)}
              className="text-[#8E8A82] hover:text-[#111111] transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="pt-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-[#111111]">{review.user_name}</span>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-[#1B4332] bg-[#ECEAE2] px-1 py-0.2 rounded-[1px]">
                <CheckCircle2 size={10} />
                <span>{review.city}</span>
              </span>
            </div>

            <div className="flex items-center gap-0.5 text-[#B84A27]">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={10}
                  className={s <= review.rating ? "fill-[#B84A27] text-[#B84A27]" : "text-[#8E8A82]"}
                />
              ))}
            </div>
          </div>

          {/* Product Link */}
          <Link
            to={`/product/${review.product_id}`}
            onClick={() => setCurrent(null)}
            className="group flex items-center justify-between font-mono text-[11px] font-semibold text-[#111111] hover:text-[#B84A27] transition-colors bg-[#F6F5F0] px-2 py-1 rounded-[1px] border border-[#E4E2DA]"
          >
            <span className="truncate max-w-[250px]">{productName}</span>
            <ArrowUpRight size={12} className="shrink-0 text-[#8E8A82] group-hover:text-[#B84A27]" />
          </Link>

          {/* Comment */}
          <p className="font-sans text-[11px] text-[#5A5852] line-clamp-2 leading-relaxed">
            "{review.comment}"
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default LiveReviewTicker;
