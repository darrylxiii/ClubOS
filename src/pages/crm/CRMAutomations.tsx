import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CRMAutomationBuilder } from '@/components/crm/CRMAutomationBuilder';
import { CRMAutomationLogs } from '@/components/crm/CRMAutomationLogs';
import { motion } from 'framer-motion';
import { Zap, History } from 'lucide-react';

export default function CRMAutomations() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Zap className="h-8 w-8 text-primary" />
          CRM Automations
        </h1>
        <p className="text-muted-foreground mt-2">
          Build and manage automated workflows for your CRM
        </p>
      </motion.div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList>
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Execution Logs
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
