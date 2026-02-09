import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/PageLoader";

const InteractionsFeedPage = lazy(() => import("@/pages/InteractionsFeed"));

/**
 * Interactions tab content wrapper for Admin/Partner Jobs Command Center
 */
export function InteractionsTabContent() {
  return (
    <Suspense fallback={<PageLoader />}>
      <InteractionsFeedPage embedded />
    </Suspense>
  );
}
