import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/PageLoader";

const InterviewPrepPage = lazy(() => import("@/pages/InterviewPrep"));

/**
 * Interview Prep tab content wrapper for the Candidate Jobs Hub
 */
export function InterviewPrepTabContent() {
  return (
    <Suspense fallback={<PageLoader />}>
      <InterviewPrepPage />
    </Suspense>
  );
}
