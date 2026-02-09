import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/PageLoader";

const ClosedJobsPage = lazy(() => import("@/pages/admin/ClosedJobs"));

/**
 * Closed Jobs tab content wrapper for Admin Jobs Command Center
 */
export function ClosedJobsTabContent() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ClosedJobsPage embedded />
    </Suspense>
  );
}
