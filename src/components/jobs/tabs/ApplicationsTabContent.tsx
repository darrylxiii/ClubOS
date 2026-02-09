import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/PageLoader";

const ApplicationsPage = lazy(() => import("@/pages/Applications"));

/**
 * Applications tab content wrapper
 * Renders the Applications page in embedded mode (no AppLayout)
 */
export function ApplicationsTabContent() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ApplicationsPage embedded />
    </Suspense>
  );
}
