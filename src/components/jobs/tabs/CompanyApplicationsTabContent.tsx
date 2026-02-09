import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/PageLoader";

const CompanyApplicationsPage = lazy(() => import("@/pages/CompanyApplications"));

/**
 * Company Applications tab content wrapper for Admin/Partner Jobs Command Center
 */
export function CompanyApplicationsTabContent() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CompanyApplicationsPage embedded />
    </Suspense>
  );
}
