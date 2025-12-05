import { Routes, useLocation } from "react-router-dom";
import { memo, useMemo, ReactNode } from "react";

interface ProtectedRoutesWrapperProps {
  children: ReactNode;
}

/**
 * Memoized Routes wrapper that prevents remounting when only query params change.
 * This fixes the issue where nested Routes inside a path="*" catch-all would
 * remount when query parameters changed (e.g., ?tab=my-meetings), causing
 * temporary route mismatches and 404 flashes.
 */
export const ProtectedRoutesWrapper = memo(({ children }: ProtectedRoutesWrapperProps) => {
  const location = useLocation();
  
  // Only use pathname for the key, ignoring query params and hash
  // This prevents remounting when only ?tab=value changes
  const stableKey = useMemo(() => location.pathname, [location.pathname]);
  
  return <Routes key={stableKey}>{children}</Routes>;
});

ProtectedRoutesWrapper.displayName = "ProtectedRoutesWrapper";
