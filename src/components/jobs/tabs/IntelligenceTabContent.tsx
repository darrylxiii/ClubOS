import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/PageLoader";

const HiringIntelligencePage = lazy(() => import("@/pages/HiringIntelligenceHub"));

/**
 * Intelligence tab content wrapper for Admin/Partner Jobs Command Center
 */
export function IntelligenceTabContent() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HiringIntelligencePage embedded />
    </Suspense>
  );
}
