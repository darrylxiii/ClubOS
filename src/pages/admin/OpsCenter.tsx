import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, BarChart3, Users, Heart, Layers, AlertTriangle, FileCheck, Bug, Zap } from "lucide-react";
import {
  KPICommandCenterContent,
  EmployeeManagementContent,
  SystemHealthContent,
  BulkOperationsContent,
  SecurityEventsContent,
  AntiHackingContent,
  AuditLogContent,
  ErrorLogsContent,
  GodModeContent,
  DisasterRecoveryContent,
} from "@/components/admin/ops/OpsCenterContent";

export default function OpsCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "kpi";

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
              Operations Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Unified operations, security, and system management
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="kpi" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                KPIs
              </TabsTrigger>
              <TabsTrigger value="employees" className="gap-2">
                <Users className="h-4 w-4" />
                Employees
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-2">
                <Heart className="h-4 w-4" />
                System Health
              </TabsTrigger>
              <TabsTrigger value="bulk" className="gap-2">
                <Layers className="h-4 w-4" />
                Bulk Ops
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="anti-hacking" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Anti-Hacking
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <FileCheck className="h-4 w-4" />
                Audit Log
              </TabsTrigger>
              <TabsTrigger value="errors" className="gap-2">
                <Bug className="h-4 w-4" />
                Errors
              </TabsTrigger>
              <TabsTrigger value="god-mode" className="gap-2">
                <Zap className="h-4 w-4" />
                God Mode
              </TabsTrigger>
              <TabsTrigger value="disaster" className="gap-2">
                <Shield className="h-4 w-4" />
                Recovery
              </TabsTrigger>
            </TabsList>

            <TabsContent value="kpi">
              <KPICommandCenterContent />
            </TabsContent>

            <TabsContent value="employees">
              <EmployeeManagementContent />
            </TabsContent>

            <TabsContent value="health">
              <SystemHealthContent />
            </TabsContent>

            <TabsContent value="bulk">
              <BulkOperationsContent />
            </TabsContent>

            <TabsContent value="security">
              <SecurityEventsContent />
            </TabsContent>

            <TabsContent value="anti-hacking">
              <AntiHackingContent />
            </TabsContent>

            <TabsContent value="audit">
              <AuditLogContent />
            </TabsContent>

            <TabsContent value="errors">
              <ErrorLogsContent />
            </TabsContent>

            <TabsContent value="god-mode">
              <GodModeContent />
            </TabsContent>

            <TabsContent value="disaster">
              <DisasterRecoveryContent />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
