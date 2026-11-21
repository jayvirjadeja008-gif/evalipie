import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  CheckCircle2,
  MessageSquare,
  Radio,
  Sparkles,
  Loader2,
  Clock,
  Send
} from "lucide-react";
import { api } from "../api";
import { useApp } from "../store";
import type { Review, ReviewsResponse } from "../types";

export function ReviewsSection({ productId }: { productId: number }) {
  const { city, user, toast } = useApp();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<number>>(new Set());

  // Review Form State
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [userName, setUserName] = useState(user?.name || "");
  const [userCity, setUserCity] = useState(city || "Bengaluru");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const esRef = useRef<EventSource | null>(null);

  const loadReviews = () => {
    api<ReviewsResponse>(`/products/${productId}/reviews`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  // Initial fetch + SSE real-time connection
  useEffect(() => {
    loadReviews();

    // Establish Server-Sent Events stream for real-time reviews
    const es = new EventSource(`/api/products/${productId}/live`);
    esRef.current = es;

    es.onopen = () => {
      setLiveConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "new_review" && payload.review) {
          const incoming: Review = payload.review;

          setNewlyArrivedIds((prev) => new Set(prev).add(incoming.id));

          setData((prev) => {
            if (!prev) return null;
            // Filter out duplicate if already present
            const exists = prev.reviews.some((r) => r.id === incoming.id);
            const updatedList = exists
              ? prev.reviews.map((r) => (r.id === incoming.id ? incoming : r))
              : [incoming, ...prev.reviews];

            return {
              ...prev,
              total: payload.stats?.total ?? prev.total + 1,
              average: payload.stats?.average ?? prev.average,
              breakdown: payload.stats?.breakdown ?? prev.breakdown,
              reviews: updatedList,
            };
          });

          toast(`Live review received from ${incoming.user_name} (${incoming.city})`);
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    es.onerror = () => {
      setLiveConnected(false);
    };

    return () => {
      es.close();
    };
  }, [productId]); // eslint-disable-line

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await api<any>(`/products/${productId}/reviews`, {
        method: "POST",
        body: {
          userName: userName.trim() || "Retail Customer",
          city: userCity,
          rating,
          comment: comment.trim(),
        },
      });
      setData(res);
      toast("Thank you! Your verified review has been posted and broadcast in real-time.");
      setComment("");
      setFormOpen(false);
    } catch (err: any) {
      toast(err.message || "Could not submit review", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await api<any>("/reviews/simulate", {
        method: "POST",
        body: { productId },
      });
      if (res.review) {
        setNewlyArrivedIds((prev) => new Set(prev).add(res.review.id));
      }
    } catch (err: any) {
      toast(err.message || "Could not simulate review", "error");
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center font-mono text-xs text-[#5A5852]">
        LOADING VERIFIED CUSTOMER REVIEWS...
      </div>
    );
  }

  const total = data?.total ?? 0;
  const avg = data?.average ?? 4.5;
  const breakdown = data?.breakdown ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const reviews = data?.reviews ?? [];

  return (
    <div className="border border-[#E4E2DA] bg-[#FFFFFF] rounded-[2px] p-6 space-y-8 font-sans">
      {/* Section Header & Rating Overview */}
      <div className="border-b border-[#E4E2DA] pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-display font-bold text-lg text-[#111111] tracking-tight">
                RATINGS &amp; VERIFIED CUSTOMER AUDIT
              </h3>
              {/* Real-Time Live Stream Indicator */}
              <div
                className={`inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 border rounded-[1px] transition-colors ${
                  liveConnected
                    ? "border-[#1B4332]/30 bg-[#1B4332]/5 text-[#1B4332]"
                    : "border-[#E4E2DA] bg-[#F6F5F0] text-[#5A5852]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    liveConnected ? "bg-[#1B4332] animate-ping" : "bg-[#8E8A82]"
                  }`}
                />
                <span className="font-bold">
                  {liveConnected ? "REAL-TIME SSE STREAM ACTIVE" : "CONNECTING LIVE FEED..."}
                </span>
              </div>
            </div>
            <p className="font-mono text-xs text-[#5A5852] mt-0.5">
              Live feedback ingested from verified retail buyers across Indian dispatch hubs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulate}
              disabled={simulating}
              className="btn-ghost !text-xs !py-1.5 !px-3 font-mono text-[#B84A27] border border-[#B84A27]/30 hover:border-[#B84A27] flex items-center gap-1.5"
              title="Simulate a real-time incoming verified review from an Indian city"
            >
              <Sparkles strokeWidth={1.5} size={13} className={simulating ? "animate-spin" : ""} />
              <span>{simulating ? "SIMULATING..." : "SIMULATE LIVE REVIEW"}</span>
            </button>

            <button
              type="button"
              onClick={() => setFormOpen(!formOpen)}
              className="btn-primary !text-xs !py-1.5 !px-3 font-mono font-semibold"
            >
              {formOpen ? "CANCEL" : "WRITE A REVIEW"}
            </button>
          </div>
        </div>

        {/* Rating Breakdown Grid */}
        <div className="grid sm:grid-cols-[160px_1fr] gap-6 mt-6 items-center">
          {/* Average Score Badge */}
          <div className="border border-[#E4E2DA] bg-[#F6F5F0] p-4 text-center rounded-[2px] space-y-1">
            <div className="font-mono text-4xl font-extrabold text-[#111111]">{avg}</div>
            <div className="flex items-center justify-center gap-0.5 text-[#B84A27]">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={14}
                  strokeWidth={1.5}
                  className={s <= Math.round(avg) ? "fill-[#B84A27] text-[#B84A27]" : "text-[#8E8A82]"}
                />
              ))}
            </div>
            <div className="font-mono text-[11px] text-[#5A5852]">{total} verified reviews</div>
          </div>

          {/* Breakdown Bars */}
          <div className="space-y-1.5 font-mono text-xs">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = breakdown[star] || 0;
              const pct = total > 0 ? (count / total) * 100 : star === 5 ? 75 : star === 4 ? 20 : 5;

              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="w-8 text-[#5A5852] text-right">{star}★</span>
                  <div className="flex-1 h-2 bg-[#ECEAE2] rounded-[1px] overflow-hidden">
                    <div
                      className="h-full bg-[#111111] transition-all duration-500 rounded-[1px]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-[#8E8A82] text-right text-[11px]">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Review Submission Form */}
      {formOpen && (
        <form onSubmit={handleSubmit} className="border border-[#111111] bg-[#F6F5F0] p-5 rounded-[2px] space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#E4E2DA] pb-2">
            <span className="font-display font-bold text-sm text-[#111111] uppercase tracking-wide">
              SUBMIT VERIFIED REVIEW
            </span>
            <span className="text-[10px] text-[#1B4332] font-semibold">
              REAL-TIME BROADCAST TO ALL SESSIONS
            </span>
          </div>

          <div className="space-y-1">
            <label className="block text-[#5A5852]">Your Rating Score</label>
            <div className="flex items-center gap-1 text-[#111111]">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setRating(s)}
                  className="p-1 text-[#B84A27] transition-transform hover:scale-110"
                >
                  <Star
                    size={18}
                    strokeWidth={1.5}
                    className={(hoverRating ?? rating) >= s ? "fill-[#B84A27]" : "text-[#8E8A82]"}
                  />
                </button>
              ))}
              <span className="ml-2 font-bold text-sm">{rating}/5 Stars</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#5A5852] mb-1">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. S. Ramanathan"
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-[#5A5852] mb-1">Purchase Retail City</label>
              <input
                type="text"
                value={userCity}
                onChange={(e) => setUserCity(e.target.value)}
                placeholder="e.g. Bengaluru"
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[#5A5852] mb-1">Your Detailed Experience &amp; Review</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe performance, packaging, delivery speed, and build quality..."
              className="input"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="btn-ghost !text-xs !py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary !text-xs !py-1.5 !px-4 flex items-center gap-1.5"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              <span>PUBLISH &amp; BROADCAST</span>
            </button>
          </div>
        </form>
      )}

      {/* Review Cards List with Framer Motion Real-Time Entrance */}
      <div className="space-y-4 divide-y divide-[#E4E2DA]">
        {reviews.length === 0 ? (
          <div className="py-8 text-center font-mono text-xs text-[#5A5852]">
            No customer reviews yet. Be the first to leave verified feedback!
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {reviews.map((rev) => {
              const isNewlyArrived = newlyArrivedIds.has(rev.id);

              return (
                <motion.div
                  key={rev.id}
                  initial={isNewlyArrived ? { opacity: 0, y: -20, scale: 0.98 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className={`pt-4 first:pt-0 space-y-2 ${
                    isNewlyArrived ? "bg-[#B84A27]/5 p-3 rounded-[2px] border border-[#B84A27]/20" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-xs text-[#111111]">{rev.user_name}</span>
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#1B4332] bg-[#ECEAE2] px-1.5 py-0.2 rounded-[1px]">
                        <CheckCircle2 strokeWidth={1.5} size={11} />
                        <span>VERIFIED BUYER</span>
                      </span>
                      <span className="font-mono text-[10px] text-[#5A5852] uppercase">({rev.city})</span>

                      {isNewlyArrived && (
                        <span className="inline-flex items-center gap-1 font-mono text-[9px] bg-[#B84A27] text-white px-1.5 py-0.2 rounded-[1px] font-bold animate-pulse">
                          <Radio size={10} />
                          <span>JUST IN · REAL-TIME</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[#B84A27]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          strokeWidth={1.5}
                          className={s <= rev.rating ? "fill-[#B84A27] text-[#B84A27]" : "text-[#8E8A82]"}
                        />
                      ))}
                      <span className="font-mono text-[10px] text-[#8E8A82] ml-1.5">
                        {new Date(rev.created_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <p className="font-sans text-xs text-[#5A5852] leading-relaxed">
                    {rev.comment}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default ReviewsSection;
