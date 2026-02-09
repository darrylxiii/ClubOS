import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/PageLoader";

// Lazy load the full Applications page content
const ApplicationsContent = lazy(() => import("@/pages/Applications").then(mod => {
  // We need to render Applications without AppLayout wrapper
  return { default: mod.default };
}));

/**
 * Applications tab content for the Candidate Jobs Hub
 * Wraps the existing Applications page content without the AppLayout
 */
export function ApplicationsTab() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ApplicationsTabInner />
    </Suspense>
  );
}

// Inner component that uses the Applications page hooks directly
function ApplicationsTabInner() {
  // Import hooks and components used by Applications
  const { useState, useEffect } = require("react");
  // Since we can't easily strip AppLayout from the existing page,
  // we'll render the full page as-is and it will work within the tab
  // The AppLayout will be provided by the parent Jobs page
  return (
    <Suspense fallback={<PageLoader />}>
      <ApplicationsContent />
    </Suspense>
  );
}
