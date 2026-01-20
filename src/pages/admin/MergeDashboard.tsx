import { AppLayout } from "@/components/AppLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link2, Search, History, BarChart3, Settings } from "lucide-react";
import { MergeStatusDashboard } from "@/components/admin/MergeStatusDashboard";
import { ManualMergeSearch } from "@/components/admin/merge/ManualMergeSearch";
import { MergeSuggestionsTable } from "@/components/admin/merge/MergeSuggestionsTable";
import { MergeHistoryTable } from "@/components/admin/merge/MergeHistoryTable";
import { useRole } from "@/contexts/RoleContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { useState, useEffect } from "react";

const MergeDashboard = () => {
  const { currentRole, loading } = useRole();
  const [autoMergeEnabled, setAutoMergeEnabled] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'auto_merge_enabled')
      .single();
      
    if (data) {
      setAutoMergeEnabled(data.setting_value === true);
    }
    setLoadingSettings(false);
  };

  const toggleAutoMerge = async (enabled: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('system_settings')
      .update({ 
        setting_value: enabled,
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'auto_merge_enabled');
      
    if (error) {
      notify.error("Failed to update setting", { description: error.message });
    } else {
      setAutoMergeEnabled(enabled);
      notify.success(
        enabled ? "Auto-merge enabled" : "Auto-merge disabled",
        { 
          description: enabled 
            ? "New signups will automatically merge with existing candidate profiles"
            : "New signups will create separate accounts for manual review"
        }
      );
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (currentRole !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return (
    <AppLayout>
      <div className="relative">
        <OceanBackgroundVideo />

        <div className="relative z-10 container mx-auto px-4 py-8 lg:py-12">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/home' },
              { label: 'Admin', path: '/admin' },
              { label: 'Merge Dashboard' }
            ]}
          />
          
          <div className="space-y-4 mb-12">
            <div className="flex items-center gap-2">
              <Link2 className="w-8 h-8" />
              <h1 className="text-4xl font-black uppercase tracking-tight">
                Profile Merge Dashboard
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Manage candidate profile merges and link unregistered candidates to user accounts
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  <CardTitle>Merge Settings</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="auto-merge-toggle" className="cursor-pointer">
                    Auto-Merge on Signup
                  </Label>
                  <Switch
                    id="auto-merge-toggle"
                    checked={autoMergeEnabled}
                    onCheckedChange={toggleAutoMerge}
                    disabled={loadingSettings}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  {autoMergeEnabled ? (
                    <>
                      ✅ <strong>Auto-merge is ON</strong>: When candidates sign up with an email matching an existing candidate profile, 
                      the profiles will automatically merge. This is the recommended setting for normal operations.
                    </>
                  ) : (
                    <>
                      ⚠️ <strong>Auto-merge is OFF</strong>: Candidates can create accounts even if their email matches an existing profile. 
                      You'll need to manually merge profiles via the dashboard. Use this during troubleshooting or when testing.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Tabs defaultValue="suggestions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 max-w-4xl">
              <TabsTrigger value="suggestions" className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Suggestions
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Manual Merge
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Statistics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="suggestions" className="space-y-4">
              <MergeSuggestionsTable />
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <ManualMergeSearch />
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <MergeHistoryTable />
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <MergeStatusDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
};

export default MergeDashboard;
