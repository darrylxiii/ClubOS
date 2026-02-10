import { lazy, Suspense } from "react";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";
import { Shield, FileText, Users, Database, ClipboardList } from "lucide-react";

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

/**
 * ComplianceHub - Unified compliance management with embedded tab content
 * Absorbs 5 simple compliance pages into a single tabbed interface
 */
export default function ComplianceHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get("tab") || ""] || "dashboard";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin", "super_admin"]}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Compliance Center
            </h1>
            <p className="text-muted-foreground mt-2">
              Legal agreements, data processing, subprocessors, and audit management
            </p>
          </div>

          {/* Tabbed Content */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-5 sm:w-full h-auto bg-card/50 backdrop-blur-sm rounded-lg p-1">
                <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-background">
                  <Shield className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="legal" className="gap-2 data-[state=active]:bg-background">
                  <FileText className="h-4 w-4" />
                  Legal
                </TabsTrigger>
                <TabsTrigger value="subprocessors" className="gap-2 data-[state=active]:bg-background">
                  <Users className="h-4 w-4" />
                  Subprocessors
                </TabsTrigger>
                <TabsTrigger value="classification" className="gap-2 data-[state=active]:bg-background">
                  <Database className="h-4 w-4" />
                  Classification
                </TabsTrigger>
                <TabsTrigger value="audits" className="gap-2 data-[state=active]:bg-background">
                  <ClipboardList className="h-4 w-4" />
                  Audits
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard">
              <Suspense fallback={<PageLoader />}>
                <ComplianceDashboard />
              </Suspense>
            </TabsContent>
            <TabsContent value="legal">
              <Suspense fallback={<PageLoader />}>
                <LegalAgreementsPage />
              </Suspense>
            </TabsContent>
            <TabsContent value="subprocessors">
              <Suspense fallback={<PageLoader />}>
                <SubprocessorsPage />
              </Suspense>
            </TabsContent>
            <TabsContent value="classification">
              <Suspense fallback={<PageLoader />}>
                <DataClassificationPage />
              </Suspense>
            </TabsContent>
            <TabsContent value="audits">
              <Suspense fallback={<PageLoader />}>
                <AuditRequestsPage />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
