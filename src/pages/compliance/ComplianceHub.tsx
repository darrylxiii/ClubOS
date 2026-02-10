import { lazy, Suspense } from "react";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";
import { Shield } from "lucide-react";

const ComplianceDashboard = lazy(() => import("@/pages/compliance/ComplianceDashboard"));
const LegalAgreementsPage = lazy(() => import("@/pages/compliance/LegalAgreementsPage"));
const SubprocessorsPage = lazy(() => import("@/pages/compliance/SubprocessorsPage"));
const DataClassificationPage = lazy(() => import("@/pages/compliance/DataClassificationPage"));
const AuditRequestsPage = lazy(() => import("@/pages/compliance/AuditRequestsPage"));

const TAB_MAP: Record<string, string> = {
  dashboard: "dashboard",
  legal: "legal",
  subprocessors: "subprocessors",
  classification: "classification",
  audits: "audits",
};

export default function ComplianceHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get("tab") || ""] || "dashboard";

  const handleTabChange = (value: string) => {
    setSearchParams(value === "dashboard" ? {} : { tab: value }, { replace: true });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">COMPLIANCE CENTER</h1>
            </div>
            <p className="text-muted-foreground">
              Legal agreements, data processing, subprocessors, and audit management
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="h-auto flex-wrap bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="legal">Legal</TabsTrigger>
              <TabsTrigger value="subprocessors">Subprocessors</TabsTrigger>
              <TabsTrigger value="classification">Classification</TabsTrigger>
              <TabsTrigger value="audits">Audits</TabsTrigger>
            </TabsList>

            <Suspense fallback={<PageLoader />}>
              <TabsContent value="dashboard"><ComplianceDashboard /></TabsContent>
              <TabsContent value="legal"><LegalAgreementsPage /></TabsContent>
              <TabsContent value="subprocessors"><SubprocessorsPage /></TabsContent>
              <TabsContent value="classification"><DataClassificationPage /></TabsContent>
              <TabsContent value="audits"><AuditRequestsPage /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
