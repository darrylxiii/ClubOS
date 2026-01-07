import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, LayoutDashboard, TrendingUp, Briefcase, DollarSign } from "lucide-react";
import {
  InventoryDashboardContent,
  AssetRegisterContent,
  DepreciationContent,
  IntangibleAssetsContent,
  KIAOptimizationContent,
} from "@/components/admin/inventory/InventoryHubContent";

export default function InventoryHub() {
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
              <Database className="h-8 w-8" />
              Inventory Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Asset management, depreciation, and KIA optimization
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-2">
                <Database className="h-4 w-4" />
                Asset Register
              </TabsTrigger>
              <TabsTrigger value="depreciation" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Depreciation
              </TabsTrigger>
              <TabsTrigger value="intangible" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Intangible Assets
              </TabsTrigger>
              <TabsTrigger value="kia" className="gap-2">
                <DollarSign className="h-4 w-4" />
                KIA Optimization
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <InventoryDashboardContent />
            </TabsContent>

            <TabsContent value="assets">
              <AssetRegisterContent />
            </TabsContent>

            <TabsContent value="depreciation">
              <DepreciationContent />
            </TabsContent>

            <TabsContent value="intangible">
              <IntangibleAssetsContent />
            </TabsContent>

            <TabsContent value="kia">
              <KIAOptimizationContent />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
