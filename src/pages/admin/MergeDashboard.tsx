import { AppLayout } from "@/components/AppLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, Search, History, BarChart3 } from "lucide-react";
import { MergeStatusDashboard } from "@/components/admin/MergeStatusDashboard";
import { ManualMergeSearch } from "@/components/admin/merge/ManualMergeSearch";
import { MergeSuggestionsTable } from "@/components/admin/merge/MergeSuggestionsTable";
import { MergeHistoryTable } from "@/components/admin/merge/MergeHistoryTable";
import { useRole } from "@/contexts/RoleContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";

const MergeDashboard = () => {
  const { currentRole, loading } = useRole();

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
