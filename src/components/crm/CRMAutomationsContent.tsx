import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CRMAutomationBuilder } from '@/components/crm/CRMAutomationBuilder';
import { CRMAutomationLogs } from '@/components/crm/CRMAutomationLogs';
import { Zap, History } from 'lucide-react';

export function CRMAutomationsContent() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Automations
        </h2>
        <p className="text-sm text-muted-foreground">
          Build and manage automated workflows
        </p>
      </div>

      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList>
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <CRMAutomationBuilder />
        </TabsContent>

        <TabsContent value="logs">
          <CRMAutomationLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
