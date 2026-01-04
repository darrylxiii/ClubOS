import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, FolderOpen, Cpu, FileText } from 'lucide-react';
import { MetricsOverviewDashboard } from '@/components/admin/due-diligence/MetricsOverviewDashboard';
import { DataRoomManager } from '@/components/admin/due-diligence/DataRoomManager';
import { TechStackDocumentation } from '@/components/admin/due-diligence/TechStackDocumentation';

export default function DueDiligenceDashboard() {
  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Due Diligence Center</h1>
            <p className="text-muted-foreground">
              Investor-ready metrics, documentation, and data room
            </p>
          </div>
          <FileText className="h-12 w-12 text-primary" />
        </div>

        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-lg">
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="dataroom" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Data Room
            </TabsTrigger>
            <TabsTrigger value="tech" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Tech Stack
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">
            <MetricsOverviewDashboard />
          </TabsContent>

          <TabsContent value="dataroom">
            <DataRoomManager />
          </TabsContent>

          <TabsContent value="tech">
            <TechStackDocumentation />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
