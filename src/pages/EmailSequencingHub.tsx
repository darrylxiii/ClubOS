import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Zap, Users, ArrowRight, TrendingUp } from 'lucide-react';
import { useInstantlyData } from '@/hooks/useInstantlyData';
import { InstantlyConnectionStatus } from '@/components/instantly/InstantlyConnectionStatus';
import { InstantlyStatsOverview } from '@/components/instantly/InstantlyStatsOverview';
import { InstantlyCampaignCard } from '@/components/instantly/InstantlyCampaignCard';
import { InstantlyLeadsTable } from '@/components/instantly/InstantlyLeadsTable';
import { InstantlySyncLogs } from '@/components/instantly/InstantlySyncLogs';
import { SequencePerformanceChart } from '@/components/instantly/SequencePerformanceChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';

export default function EmailSequencingHub() {
  const navigate = useNavigate();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const {
    campaigns,
    leads,
    stats,
    syncLogs,
    loading,
    syncing,
    lastSyncedAt,
    syncCampaigns,
    syncLeads,
    syncAll,
  } = useInstantlyData();

  const handleViewLeads = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
  };

  const handlePromoteToCRM = (lead: any) => {
    toast.success(`${lead.email} promoted to CRM pipeline`);
    navigate('/crm/pipeline');
  };

  const filteredLeads = selectedCampaignId 
    ? leads.filter(l => l.campaign_id === selectedCampaignId)
    : leads;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              Email Sequencing
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage cold outreach campaigns via Instantly
            </p>
          </div>

          <Button
            onClick={() => navigate('/crm/pipeline')}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600"
          >
            <Zap className="h-4 w-4 mr-2" />
            View Hot Leads (CRM)
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>

        {/* Connection Status */}
        <InstantlyConnectionStatus
          lastSyncedAt={lastSyncedAt}
          syncing={syncing}
          onSync={syncAll}
        />

        {/* Stats Overview */}
        <InstantlyStatsOverview stats={stats} loading={loading} />

        {/* Info Banner */}
        <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Cold Outreach → Hot Leads Flow</h3>
              <p className="text-sm text-muted-foreground">
                Leads that reply or show interest are automatically promoted to the CRM Pipeline. 
                Only qualified leads appear in your CRM for focused follow-up.
              </p>
            </div>
          </div>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList className="bg-card/50 backdrop-blur-sm border border-border/30">
            <TabsTrigger value="campaigns">
              <Zap className="h-4 w-4 mr-2" />
              Campaigns ({campaigns.length})
            </TabsTrigger>
            <TabsTrigger value="sequences">
              <TrendingUp className="h-4 w-4 mr-2" />
              Sequence Analytics
            </TabsTrigger>
            <TabsTrigger value="leads">
              <Users className="h-4 w-4 mr-2" />
              All Leads ({leads.length})
            </TabsTrigger>
            <TabsTrigger value="sync">
              Sync History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            {campaigns.length === 0 && !loading ? (
              <Card className="p-8 text-center bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Campaigns Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Sync Now" to import your campaigns from Instantly
                </p>
                <Button onClick={syncCampaigns} disabled={syncing}>
                  {syncing ? 'Syncing...' : 'Sync Campaigns'}
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {campaigns.map((campaign) => (
                  <InstantlyCampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onViewLeads={handleViewLeads}
                    onSync={() => syncLeads(campaign.id)}
                    syncing={syncing}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sequences" className="space-y-6">
            {/* All Campaigns Sequence Performance */}
            <SequencePerformanceChart />
            
            {/* Per-Campaign Sequence Charts */}
            {campaigns.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Per-Campaign Breakdown</h3>
                {campaigns.slice(0, 3).map((campaign) => (
                  <SequencePerformanceChart
                    key={campaign.id}
                    campaignId={campaign.id}
                    externalCampaignId={campaign.external_id || undefined}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leads">
            <InstantlyLeadsTable
              leads={filteredLeads}
              onPromoteToCRM={handlePromoteToCRM}
            />
          </TabsContent>

          <TabsContent value="sync">
            <InstantlySyncLogs logs={syncLogs} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
