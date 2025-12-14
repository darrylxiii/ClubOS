import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CRMSampleDataSeeder } from "@/components/crm/CRMSampleDataSeeder";
import { Settings, Database, Keyboard, Bell } from "lucide-react";
import { useState } from "react";
import { CRMKeyboardShortcutsHelp } from "@/components/crm/CRMKeyboardShortcutsHelp";
import { StageCustomizationPanel } from "@/components/crm/StageCustomizationPanel";
import { CRMTeamManagement } from "@/components/crm/CRMTeamManagement";
import { CRMNotificationSettings } from "@/components/crm/CRMNotificationSettings";

export default function CRMSettings() {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              CRM Settings
            </h1>
            <p className="text-muted-foreground">
              Configure your CRM preferences and manage data
            </p>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data
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

            <TabsContent value="data" className="mt-6 space-y-6">
              <CRMSampleDataSeeder />
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
    </AppLayout>
  );
}
