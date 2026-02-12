import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EdgeFunctionOverviewTab } from '@/components/admin/edge-functions/EdgeFunctionOverviewTab';
import { EdgeFunctionRegistryTab } from '@/components/admin/edge-functions/EdgeFunctionRegistryTab';
import { EdgeFunctionUsageTab } from '@/components/admin/edge-functions/EdgeFunctionUsageTab';
import { PollingConfigTab } from '@/components/admin/edge-functions/PollingConfigTab';
import { EdgeFunctionCostTab } from '@/components/admin/edge-functions/EdgeFunctionCostTab';
import { LayoutDashboard, List, BarChart3, Timer, DollarSign } from 'lucide-react';

export default function EdgeFunctionCommandCenter() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edge Function Command Center</h1>
        <p className="text-muted-foreground mt-1">
          Monitor, control, and optimize all backend functions across the platform.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="registry" className="gap-1.5">
            <List className="h-3.5 w-3.5" />
            Registry
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Usage
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Costs
          </TabsTrigger>
          <TabsTrigger value="polling" className="gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            Polling
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <EdgeFunctionOverviewTab />
        </TabsContent>

        <TabsContent value="registry">
          <EdgeFunctionRegistryTab />
        </TabsContent>

        <TabsContent value="usage">
          <EdgeFunctionUsageTab />
        </TabsContent>

        <TabsContent value="costs">
          <EdgeFunctionCostTab />
        </TabsContent>

        <TabsContent value="polling">
          <PollingConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
