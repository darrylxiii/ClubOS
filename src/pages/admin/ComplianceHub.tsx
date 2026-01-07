import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileCheck, FileSignature, Building2, Database, AlertTriangle } from "lucide-react";
import {
  ComplianceDashboardContent,
  RiskManagementContent,
  LegalAgreementsContent,
  SubprocessorsContent,
  DataClassificationContent,
  AuditRequestsContent,
} from "@/components/admin/compliance/ComplianceHubContent";

export default function ComplianceHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]}>
        <div className="container mx-auto py-6 px-4 max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8" />
              Compliance Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Unified compliance, risk management, and legal oversight
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="gap-2">
                <Shield className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="risk" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk Management
              </TabsTrigger>
              <TabsTrigger value="legal" className="gap-2">
                <FileSignature className="h-4 w-4" />
                Legal Agreements
              </TabsTrigger>
              <TabsTrigger value="subprocessors" className="gap-2">
                <Building2 className="h-4 w-4" />
                Subprocessors
              </TabsTrigger>
              <TabsTrigger value="data" className="gap-2">
                <Database className="h-4 w-4" />
                Data Classification
              </TabsTrigger>
              <TabsTrigger value="audits" className="gap-2">
                <FileCheck className="h-4 w-4" />
                Audit Requests
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <ComplianceDashboardContent />
            </TabsContent>

            <TabsContent value="risk">
              <RiskManagementContent />
            </TabsContent>

            <TabsContent value="legal">
              <LegalAgreementsContent />
            </TabsContent>

            <TabsContent value="subprocessors">
              <SubprocessorsContent />
            </TabsContent>

            <TabsContent value="data">
              <DataClassificationContent />
            </TabsContent>

            <TabsContent value="audits">
              <AuditRequestsContent />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
