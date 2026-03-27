import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Keyboard, Bell, Upload, ShieldX, Zap, Activity, Plug } from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { useTranslation } from 'react-i18next';
import { useSearchParams } from "react-router-dom";
import { CRMKeyboardShortcutsHelp } from "@/components/crm/CRMKeyboardShortcutsHelp";
import { StageCustomizationPanel } from "@/components/crm/StageCustomizationPanel";
import { CRMTeamManagement } from "@/components/crm/CRMTeamManagement";
import { CRMNotificationSettings } from "@/components/crm/CRMNotificationSettings";
import { PageLoader } from "@/components/PageLoader";

// Lazy-load absorbed route content
const ImportHistory = lazy(() => import("@/pages/crm/ImportHistory"));
const SuppressionList = lazy(() => import("@/pages/crm/SuppressionList"));
const LeadScoringConfig = lazy(() => import("@/pages/crm/LeadScoringConfig"));
const ProspectAuditTrail = lazy(() => import("@/pages/crm/ProspectAuditTrail"));
const CRMIntegrations = lazy(() => import("@/pages/crm/CRMIntegrations"));
const CRMAutomations = lazy(() => import("@/pages/crm/CRMAutomations"));

export default function CRMSettings() {
  const { t } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <RoleGate allowedRoles={['admin', 'strategist']}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            CRM Settings
          </h1>
          <p className="text-muted-foreground">{t('cRMSettings.desc')}</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Plug className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="imports" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Imports
            </TabsTrigger>
            <TabsTrigger value="suppression" className="flex items-center gap-2">
              <ShieldX className="h-4 w-4" />
              Suppression
            </TabsTrigger>
            <TabsTrigger value="lead-scoring" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Lead Scoring
            </TabsTrigger>
            <TabsTrigger value="automations" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Automations
            </TabsTrigger>
            <TabsTrigger value="audit-trail" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Audit Trail
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Shortcuts
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6 space-y-6">
            <StageCustomizationPanel />
            <CRMTeamManagement />
          </TabsContent>

          <TabsContent value="integrations" className="mt-6">
            <Suspense fallback={<PageLoader />}>
              <CRMIntegrations />
            </Suspense>
          </TabsContent>

          <TabsContent value="imports" className="mt-6">
            <Suspense fallback={<PageLoader />}>
              <ImportHistory />
            </Suspense>
          </TabsContent>

          <TabsContent value="suppression" className="mt-6">
            <Suspense fallback={<PageLoader />}>
              <SuppressionList />
            </Suspense>
          </TabsContent>

          <TabsContent value="lead-scoring" className="mt-6">
            <Suspense fallback={<PageLoader />}>
              <LeadScoringConfig />
            </Suspense>
          </TabsContent>

          <TabsContent value="automations" className="mt-6">
            <Suspense fallback={<PageLoader />}>
              <CRMAutomations />
            </Suspense>
          </TabsContent>

          <TabsContent value="audit-trail" className="mt-6">
            <Suspense fallback={<PageLoader />}>
              <ProspectAuditTrail />
            </Suspense>
          </TabsContent>

          <TabsContent value="shortcuts" className="mt-6 space-y-6">
            <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5" />
                  Keyboard Shortcuts
                </CardTitle>
                <CardDescription>
                  Speed up your workflow with keyboard shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowShortcuts(true)}>
                  View All Shortcuts
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6 space-y-6">
            <CRMNotificationSettings />
          </TabsContent>
        </Tabs>

        <CRMKeyboardShortcutsHelp open={showShortcuts} onOpenChange={setShowShortcuts} />
      </div>
    </RoleGate>
  );
}
