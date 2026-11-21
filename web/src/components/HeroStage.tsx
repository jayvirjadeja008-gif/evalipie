import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowDown, Database, Radio, Search, ShieldCheck, Zap, CornerRightDown } from "lucide-react";
import { inr } from "../api";
import { useApp } from "../store";
import { getProductFallback } from "../utils/images";

interface HeroStageProps {
  onExploreClick: () => void;
  telemetryTrigger?: number;
  latestEvent?: any;
}

export function HeroStage({ onExploreClick, telemetryTrigger = 0, latestEvent }: HeroStageProps) {
  const { city } = useApp();
  const heroRef = useRef<HTMLDivElement>(null);

  // 3D Scroll Recede: Hero scales down (1 -> 0.94), tilts backward (rotateX: 0 -> 8deg), and fades subtly
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });
  const heroScale = useTransform(smoothProgress, [0, 1], [1, 0.94]);
  const heroRotateX = useTransform(smoothProgress, [0, 1], [0, 8]);
  const heroOpacity = useTransform(smoothProgress, [0, 0.85], [1, 0.35]);

  // 3D Interactive Parallax on Flagship Card
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Animated pulse across Aiven Architecture Strip (Postgres -> Kafka -> OpenSearch)
  const [activePulseStep, setActivePulseStep] = useState<number | null>(null);

  useEffect(() => {
    if (telemetryTrigger > 0) {
      // Step 1: Postgres
      setActivePulseStep(1);
      const t1 = setTimeout(() => setActivePulseStep(2), 350); // Step 2: Kafka
      const t2 = setTimeout(() => setActivePulseStep(3), 700); // Step 3: OpenSearch
      const t3 = setTimeout(() => setActivePulseStep(null), 1200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [telemetryTrigger]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;
    setTilt({ x: rotateX, y: rotateY });
  };

  const flagshipProduct = {
    sku: "AUD-002",
    name: "Sony WH-CH520 Bluetooth Headphones",
    brand: "Sony",
    category: "Audio",
    price: 4490,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    stock: 14,
  };

  return (
    <motion.div
      ref={heroRef}
      style={{
        scale: heroScale,
        rotateX: heroRotateX,
        opacity: heroOpacity,
        transformOrigin: "center top",
        perspective: "1400px",
      }}
      className="relative mb-12 select-none"
    >
      {/* Blueprint Grid Container with Corner Crosshairs */}
      <div className="relative border border-[#E4E2DA] bg-[#FFFFFF] p-8 md:p-12 rounded-[2px] shadow-sm overflow-hidden">
        {/* Subtle Architectural Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, #E4E2DA 1px, transparent 1px), linear-gradient(to bottom, #E4E2DA 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Technical Corner Crosshairs */}
        <div className="absolute top-2 left-2 font-mono text-[9px] text-[#8E8A82] pointer-events-none">
          + LOC: 12.9716° N, 77.5946° E [GRID A1]
        </div>
        <div className="absolute top-2 right-2 font-mono text-[9px] text-[#8E8A82] pointer-events-none">
          SECURE ISOLATION: ACID +
        </div>
        <div className="absolute bottom-2 left-2 font-mono text-[9px] text-[#8E8A82] pointer-events-none">
          + AIVEN CLUSTER ID: ASIA-SOUTH1-IN
        </div>
        <div className="absolute bottom-2 right-2 font-mono text-[9px] text-[#8E8A82] pointer-events-none">
          STOCKSYNC ENGINE V2.4 +
        </div>

        {/* Asymmetric 2-Column Split */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Bold Editorial Typography & CTA */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 border border-[#E4E2DA] bg-[#F6F5F0] px-3 py-1 font-mono text-[11px] text-[#5A5852] rounded-[2px]">
              <span className="w-2 h-2 rounded-[1px] bg-[#1B4332] animate-pulse" />
              <span>LIVE MULTI-CITY INVENTORY ENGINE</span>
              <span className="text-[#8E8A82]">|</span>
              <span className="text-[#B84A27] font-semibold">6 INDIAN METROS</span>
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#111111] uppercase leading-[0.95]">
                Nationwide Retail. <br />
                <span className="text-[#B84A27]">Real-Time Stock.</span>
              </h1>
              <p className="font-sans text-sm sm:text-base text-[#5A5852] max-w-xl leading-relaxed pt-2">
                Every unit in our physical stores across Bengaluru, Mumbai, Delhi, Chennai, Hyderabad, and Pune is locked at checkout using PostgreSQL row-level transactions and broadcast in milliseconds via Apache Kafka and OpenSearch. Zero overselling. Zero ghost stock.
              </p>
            </div>

            {/* Live City-Availability Ticker */}
            <div className="border-t border-b border-[#E4E2DA] py-2.5 font-mono text-xs flex flex-wrap items-center gap-y-1 gap-x-3 text-[#5A5852]">
              <span className="font-bold text-[#111111] flex items-center gap-1">
                <Zap strokeWidth={1.5} size={13} className="text-[#B84A27]" />
                <span>FULFILLMENT HUBS:</span>
              </span>
              <span className="text-[#111111]">BENGALURU</span>
              <span className="text-[#E4E2DA]">/</span>
              <span className="text-[#111111]">MUMBAI</span>
              <span className="text-[#E4E2DA]">/</span>
              <span className="text-[#111111]">DELHI</span>
              <span className="text-[#E4E2DA]">/</span>
              <span className="text-[#111111]">CHENNAI</span>
              <span className="text-[#E4E2DA]">/</span>
              <span className="text-[#111111]">HYDERABAD</span>
              <span className="text-[#E4E2DA]">/</span>
              <span className="text-[#111111]">PUNE</span>
            </div>

            {/* Sharp Architectural CTA Button */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onExploreClick}
                className="btn-accent !py-3.5 !px-6 text-xs flex items-center gap-2 group"
              >
                <span>EXPLORE CATALOG</span>
                <ArrowDown strokeWidth={1.5} size={15} className="group-hover:translate-y-0.5 transition-transform" />
              </button>

              <div className="font-mono text-xs text-[#5A5852] flex items-center gap-2">
                <ShieldCheck strokeWidth={1.5} size={15} className="text-[#1B4332]" />
                <span>SELECT ... FOR UPDATE PROTECTED</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Interactive Product Showcase */}
          <div className="lg:col-span-5 flex justify-center">
            <div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => {
                setIsHovered(false);
                setTilt({ x: 0, y: 0 });
              }}
              className="relative w-full max-w-sm perspective-stage"
              style={{ perspective: "1200px" }}
            >
              <div
                className="relative bg-[#FFFFFF] border-2 border-[#111111] p-5 shadow-2xl rounded-[2px] transition-all duration-150 ease-out preserve-3d"
                style={{
                  transform: isHovered
                    ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(10px)`
                    : "rotateX(0deg) rotateY(0deg) translateZ(0px)",
                  boxShadow: isHovered
                    ? `${tilt.y * -2}px ${tilt.x * 2 + 16}px 32px rgba(17, 17, 17, 0.16)`
                    : "0 10px 24px rgba(17, 17, 17, 0.08)",
                }}
              >
                {/* Floating Architectural Header */}
                <div className="flex items-center justify-between border-b border-[#E4E2DA] pb-2.5 mb-3 font-mono text-[10px]">
                  <span className="font-bold text-[#111111] uppercase tracking-wider bg-[#ECEAE2] px-1.5 py-0.5">
                    FEATURED SPECIFICATION
                  </span>
                  <span className="text-[#B84A27] font-semibold">SKU: {flagshipProduct.sku}</span>
                </div>

                {/* Studio Product Photography Container */}
                <div className="relative aspect-[4/3] w-full overflow-hidden border border-[#E4E2DA] bg-[#F6F5F0]">
                  <img
                    src={flagshipProduct.imageUrl}
                    alt={flagshipProduct.name}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out"
                    style={{
                      transform: isHovered ? "scale(1.06) translateZ(24px)" : "scale(1) translateZ(0px)",
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getProductFallback(
                        flagshipProduct.category,
                        flagshipProduct.name,
                        flagshipProduct.sku
                      );
                    }}
                  />

                  {/* Floating Price Pill */}
                  <div
                    className="absolute top-2.5 left-2.5 bg-[#111111] text-[#F6F5F0] font-mono text-xs font-bold px-2 py-1 shadow-md transition-transform duration-200"
                    style={{
                      transform: isHovered ? "translateZ(30px)" : "translateZ(0px)",
                    }}
                  >
                    {inr(flagshipProduct.price)}
                  </div>

                  {/* Floating Stock Indicator */}
                  <div
                    className="absolute bottom-2.5 right-2.5 bg-white/95 border border-[#E4E2DA] text-[#1B4332] font-mono text-[10px] font-bold px-2 py-1 shadow-sm transition-transform duration-200 flex items-center gap-1.5"
                    style={{
                      transform: isHovered ? "translateZ(26px)" : "translateZ(0px)",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-[1px] bg-[#1B4332]" />
                    <span>{flagshipProduct.stock} IN {city.toUpperCase()}</span>
                  </div>
                </div>

                {/* Product Meta */}
                <div className="mt-3.5 space-y-1">
                  <p className="font-mono text-[10px] text-[#5A5852] uppercase">{flagshipProduct.brand} · {flagshipProduct.category}</p>
                  <p className="font-display font-bold text-sm text-[#111111] leading-snug">{flagshipProduct.name}</p>
                  <p className="font-mono text-[10px] text-[#5A5852] pt-1">
                    Isolation Level: READ COMMITTED · Row-Lock Active
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Aiven Architecture Strip (Directly Below Hero) */}
      <div className="mt-4 border border-[#E4E2DA] bg-[#FFFFFF] px-4 py-3 rounded-[2px] shadow-sm font-mono text-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#5A5852] text-[11px] shrink-0">
            <span className="w-2 h-2 rounded-[1px] bg-[#1B4332]" />
            <span className="font-bold text-[#111111]">AIVEN CLOUD PIPELINE:</span>
          </div>

          {/* 3 Live Nodes with Animated Directional Flow Line */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-3 relative">
            {/* 1. Aiven PostgreSQL */}
            <div
              className={`p-2.5 border rounded-[2px] transition-colors duration-300 flex items-center gap-3 ${
                activePulseStep === 1
                  ? "border-[#B84A27] bg-[#B84A27]/10 text-[#111111]"
                  : "border-[#E4E2DA] bg-[#F6F5F0] text-[#111111]"
              }`}
            >
              <div className={`p-1.5 rounded-[2px] ${activePulseStep === 1 ? "bg-[#B84A27] text-white" : "bg-white border border-[#E4E2DA] text-[#111111]"}`}>
                <Database strokeWidth={1.5} size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-[1px] bg-[#1B4332]" />
                  <span className="font-bold text-[11px]">AIVEN POSTGRESQL</span>
                </div>
                <p className="text-[10px] text-[#5A5852] truncate">Row Locks & ACID Commit</p>
              </div>
            </div>

            {/* 2. Aiven Apache Kafka */}
            <div
              className={`p-2.5 border rounded-[2px] transition-colors duration-300 flex items-center gap-3 ${
                activePulseStep === 2
                  ? "border-[#B84A27] bg-[#B84A27]/10 text-[#111111]"
                  : "border-[#E4E2DA] bg-[#F6F5F0] text-[#111111]"
              }`}
            >
              <div className={`p-1.5 rounded-[2px] ${activePulseStep === 2 ? "bg-[#B84A27] text-white" : "bg-white border border-[#E4E2DA] text-[#111111]"}`}>
                <Radio strokeWidth={1.5} size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-[1px] bg-[#1B4332]" />
                  <span className="font-bold text-[11px]">AIVEN APACHE KAFKA</span>
                </div>
                <p className="text-[10px] text-[#5A5852] truncate">Event Streaming Outbox</p>
              </div>
            </div>

            {/* 3. Aiven OpenSearch */}
            <div
              className={`p-2.5 border rounded-[2px] transition-colors duration-300 flex items-center gap-3 ${
                activePulseStep === 3
                  ? "border-[#B84A27] bg-[#B84A27]/10 text-[#111111]"
                  : "border-[#E4E2DA] bg-[#F6F5F0] text-[#111111]"
              }`}
            >
              <div className={`p-1.5 rounded-[2px] ${activePulseStep === 3 ? "bg-[#B84A27] text-white" : "bg-white border border-[#E4E2DA] text-[#111111]"}`}>
                <Search strokeWidth={1.5} size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-[1px] bg-[#1B4332]" />
                  <span className="font-bold text-[11px]">AIVEN OPENSEARCH</span>
                </div>
                <p className="text-[10px] text-[#5A5852] truncate">Fuzzy Search & Facets</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
export default HeroStage;
