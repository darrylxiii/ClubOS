import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const JOB_PIPELINE_PATTERN = /^\/jobs\/[^/]+\/dashboard/;

const STORAGE_KEY = "tqc_last_pipeline";

/**
 * Tracks the last visited job pipeline route in localStorage.
 * Mount this hook in any component that renders on job dashboard routes.
 */
export function useLastPipeline() {
  const location = useLocation();

  useEffect(() => {
    if (JOB_PIPELINE_PATTERN.test(location.pathname)) {
      localStorage.setItem(STORAGE_KEY, location.pathname);
    }
  }, [location.pathname]);
}
