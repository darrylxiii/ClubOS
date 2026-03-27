import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface KineticNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function KineticNumber({
  value,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: KineticNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 50,
    stiffness: 100,
  });
  
  // Only start animating when the number actually enters the viewport
  const isInView = useInView(ref, { once: true, margin: "-10px" });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [motionValue, isInView, value]);

  useEffect(() => {
    // Subscribe to the spring's output and format it into the DOM directly for 60fps performance
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(Number(latest.toFixed(decimals)))}${suffix}`;
      }
    });
    
    return () => unsubscribe();
  }, [springValue, prefix, suffix, decimals]);

  return (
    <span className={cn("inline-block tabular-nums tracking-tight", className)} ref={ref}>
      {/* Fallback starting state before animation kicks in */}
      {prefix}{Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(0)}{suffix}
    </span>
  );
}
