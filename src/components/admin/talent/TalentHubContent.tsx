import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load heavy components
const ArchivedCandidatesView = lazy(() => 
  import("@/components/admin/ArchivedCandidatesView").then(m => ({ default: m.ArchivedCandidatesView }))
);

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

export function TalentPoolContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        AI-powered talent matching and recommendations. View your curated talent pool.
      </p>
      {/* Placeholder - will integrate with existing talent pool logic */}
      <div className="grid gap-4">
        <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
          Talent Pool content - integrates with existing talent matching
        </div>
      </div>
    </div>
  );
}

export function AllCandidatesContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Complete list of all candidates in the system.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Candidates table - integrates with AdminCandidates
      </div>
    </div>
  );
}

export function AllApplicationsContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        View and manage all job applications across the platform.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Applications table - integrates with AdminApplicationHub
      </div>
    </div>
  );
}

export function TalentListsContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Curated talent lists for specific roles or projects.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Talent Lists management
      </div>
    </div>
  );
}

export function TargetCompaniesContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Companies targeted for outreach and partnerships.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Target Companies - integrates with TargetCompaniesOverview
      </div>
    </div>
  );
}

export function MergeDashboardContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Identify and merge duplicate candidate profiles.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Merge Dashboard - integrates with existing merge logic
      </div>
    </div>
  );
}

export function RejectionsContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Track and analyze candidate rejections across all roles.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Rejections table - integrates with AdminRejections
      </div>
    </div>
  );
}

export function ArchivedCandidatesContent() {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <ArchivedCandidatesView />
    </Suspense>
  );
}
