import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, AlertTriangle, Rocket, Shield } from 'lucide-react';
import { CapacityPlanningDashboard } from '@/components/admin/risk/CapacityPlanningDashboard';
import { RiskRegistryPanel } from '@/components/admin/risk/RiskRegistryPanel';
import { ScalingReadinessPanel } from '@/components/admin/risk/ScalingReadinessPanel';

export default function RiskManagementDashboard() {
  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Risk & Scale Management</h1>
            <p className="text-muted-foreground">
              Capacity planning, risk registry, and scaling readiness
            </p>
          </div>
          <Shield className="h-12 w-12 text-primary" />
        </div>

        <Tabs defaultValue="capacity" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-lg">
            <TabsTrigger value="capacity" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Capacity
            </TabsTrigger>
            <TabsTrigger value="risks" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk Registry
            </TabsTrigger>
            <TabsTrigger value="scaling" className="flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Scale Readiness
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capacity">
            <CapacityPlanningDashboard />
          </TabsContent>

          <TabsContent value="risks">
            <RiskRegistryPanel />
          </TabsContent>

          <TabsContent value="scaling">
            <ScalingReadinessPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
