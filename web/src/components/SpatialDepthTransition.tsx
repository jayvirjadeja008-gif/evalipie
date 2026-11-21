import React, { useEffect, useRef, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";

// Hierarchical page depth map to determine forward vs backward glide momentum
function getRouteDepth(pathname: string): number {
  if (pathname === "/" || pathname === "") return 0;
  if (pathname.startsWith("/product/")) return 2;
  if (pathname === "/cart") return 2;
  if (pathname.startsWith("/orders")) return 2;
  if (pathname.startsWith("/admin")) return 2;
  if (pathname === "/login") return 1;
  return 1;
}

export function SpatialDepthTransition() {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const prevPathRef = useRef(location.pathname);
  const [direction, setDirection] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Check prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      const prevDepth = getRouteDepth(prevPathRef.current);
      const nextDepth = getRouteDepth(location.pathname);
      // If moving deeper into hierarchy (e.g. catalog -> product), direction is 1 (forward glide)
      // If moving back out (product -> catalog), direction is -1 (reverse glide)
      const dir = nextDepth >= prevDepth ? 1 : -1;
      setDirection(dir);
      prevPathRef.current = location.pathname;

      setIsTransitioning(true);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname]);

  const cubicEase: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const exitEase: [number, number, number, number] = [0.7, 0, 0.84, 0];

  const variants: Variants = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.2 } },
        exit: { opacity: 0, transition: { duration: 0.15 } },
      }
    : {
        initial: (dir: number) => ({
          opacity: 0,
          scale: 0.92,
          z: -140, // Camera pushes back along the Z-axis
          rotateX: 4, // Subtle perspective tilt from above
          rotateY: dir > 0 ? 3 : -3, // Subtle directional yaw
          x: dir > 0 ? 32 : -32, // Horizontal momentum offset
          filter: "blur(2px)",
        }),
        animate: {
          opacity: 1,
          scale: 1,
          z: 0,
          rotateX: 0,
          rotateY: 0,
          x: 0,
          filter: "blur(0px)",
          transition: {
            duration: 0.44,
            ease: cubicEase, // Smooth industrial damped deceleration
          },
        },
        exit: (dir: number) => ({
          opacity: 0,
          scale: 0.92,
          z: -140, // Pushes back into depth on departure
          rotateX: -3,
          rotateY: dir > 0 ? -3 : 3,
          x: dir > 0 ? -32 : 32, // Glides out in momentum direction
          filter: "blur(2px)",
          transition: {
            duration: 0.26,
            ease: exitEase, // Responsive snap-out
          },
        }),
      };

  return (
    <div
      className="relative w-full min-w-0"
      style={{
        perspective: "1400px",
        perspectiveOrigin: "center 35%",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Architectural Transition Hairline Indicator */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0.9 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => setIsTransitioning(false)}
            className="fixed top-[57px] left-0 right-0 h-[2px] bg-[#B84A27] origin-left z-40 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={location.pathname}
          custom={direction}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            transformStyle: "preserve-3d",
            width: "100%",
            transformOrigin: "center 30%",
          }}
        >
          {currentOutlet}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default SpatialDepthTransition;
