import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadScoringRulesBuilder } from '@/components/crm/LeadScoringRulesBuilder';
import { LeadScoreHistory } from '@/components/crm/LeadScoreHistory';
import { ProspectScoreCard } from '@/components/crm/ProspectScoreCard';
import { motion } from 'framer-motion';
import { Zap, History, BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';

export default function LeadScoringConfig() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Zap className="h-8 w-8 text-primary" />
          Lead Scoring Configuration
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure scoring rules and view score history for your prospects
        </p>
      </motion.div>

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Scoring Rules
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Score History
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Score Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <LeadScoringRulesBuilder />
        </TabsContent>

        <TabsContent value="history">
          <div className="grid gap-6 lg:grid-cols-2">
            <LeadScoreHistory prospectId="sample-1" prospectName="John Smith" />
            <LeadScoreHistory prospectId="sample-2" prospectName="Sarah Johnson" />
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="grid gap-6 lg:grid-cols-3">
            <ProspectScoreCard
              prospectId="sample-1"
              currentScore={75}
              scoreBreakdown={{
                engagement: 30,
                companyFit: 20,
                roleSeniority: 15,
                replySentiment: 10,
                total: 75
              }}
            />
            <ProspectScoreCard
              prospectId="sample-2"
              currentScore={52}
              scoreBreakdown={{
                engagement: 20,
                companyFit: 15,
                roleSeniority: 10,
                replySentiment: 7,
                total: 52
              }}
            />
            <ProspectScoreCard
              prospectId="sample-3"
              currentScore={35}
              scoreBreakdown={{
                engagement: 10,
                companyFit: 10,
                roleSeniority: 10,
                replySentiment: 5,
                total: 35
              }}
            />
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  </AppLayout>
  );
}
