import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Get SSR-safe initial mobile value
 * Uses matchMedia if available, falls back to false (desktop) for SSR
 */
const getInitialMobileValue = (): boolean => {
  if (typeof window === "undefined") {
    return false; // SSR: assume desktop
  }
  return window.innerWidth < MOBILE_BREAKPOINT;
};

/**
 * Hook to detect mobile viewport
 * SSR-safe with no hydration flash - initializes with actual viewport check
 */
export function useIsMobile(): boolean {
  // Initialize with actual value to prevent hydration mismatch
  const [isMobile, setIsMobile] = React.useState<boolean>(getInitialMobileValue);

  React.useEffect(() => {
    // Guard for SSR
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Set initial value after mount (handles edge cases)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
