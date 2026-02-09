import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/PageLoader";

const JobAnalyticsIndexPage = lazy(() => import("@/pages/admin/JobAnalyticsIndex"));

/**
 * Analytics tab content wrapper for Admin Jobs Command Center
 */
export function AnalyticsTabContent() {
  return (
    <Suspense fallback={<PageLoader />}>
      <JobAnalyticsIndexPage embedded />
    </Suspense>
  );
}
