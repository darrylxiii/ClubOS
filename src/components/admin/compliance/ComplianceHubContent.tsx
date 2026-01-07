import { Skeleton } from "@/components/ui/skeleton";

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

export function ComplianceDashboardContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Overview of compliance status across all domains.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Compliance Dashboard overview
      </div>
    </div>
  );
}

export function RiskManagementContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Identify, assess, and mitigate organizational risks.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Risk Management - integrates with RiskManagementDashboard
      </div>
    </div>
  );
}

export function LegalAgreementsContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Manage legal agreements and contract templates.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Legal Agreements - integrates with LegalAgreementsPage
      </div>
    </div>
  );
}

export function SubprocessorsContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Track and manage data subprocessors for GDPR compliance.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Subprocessors - integrates with SubprocessorsPage
      </div>
    </div>
  );
}

export function DataClassificationContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Define and manage data classification rules and categories.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Data Classification - integrates with DataClassificationPage
      </div>
    </div>
  );
}

export function AuditRequestsContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Handle audit requests and compliance inquiries.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Audit Requests - integrates with AuditRequestsPage
      </div>
    </div>
  );
}
