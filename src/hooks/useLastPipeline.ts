import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const PIPELINE_ROUTES = [
  "/crm/prospects",
  "/crm/focus",
  "/crm/inbox",
  "/crm/pipeline",
  "/crm/leads",
  "/crm/outreach",
];

const STORAGE_KEY = "tqc_last_pipeline";

/**
 * Tracks the last visited pipeline route in localStorage.
 * Mount this hook in any component that renders on pipeline routes.
 */
export function useLastPipeline() {
  const location = useLocation();

  useEffect(() => {
    if (PIPELINE_ROUTES.some((route) => location.pathname.startsWith(route))) {
      localStorage.setItem(STORAGE_KEY, location.pathname);
    }
  }, [location.pathname]);
}
