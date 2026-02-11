import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, RefreshCw, Download, Settings } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/notify';
import { useNavigate } from 'react-router-dom';
import { usePartnerRelationships } from '@/hooks/usePartnerRelationships';
import { PartnerRelationshipStats } from '@/components/communication/PartnerRelationshipStats';
import { PartnerRelationshipGrid } from '@/components/communication/PartnerRelationshipGrid';
import { ClubAIAdvisorWidget } from '@/components/communication/ClubAIAdvisorWidget';
import { CrossChannelPatternsCard } from '@/components/communication/CrossChannelPatternsCard';
import { PageTitle, Subtitle } from '@/components/ui/typography';

export default function PartnerRelationships() {
  const { relationships, loading, stats, refetch } = usePartnerRelationships();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({ title: 'Refreshed', description: 'Relationship data updated' });
  };

  const handleSendMessage = (candidateId: string, channel: 'whatsapp' | 'email' | 'phone') => {
    // Navigate to messages with candidate context
    navigate(`/messages?candidate=${candidateId}&channel=${channel}`);
  };

  const handleScheduleMeeting = (candidateId: string) => {
    navigate(`/meetings/new?candidate=${candidateId}`);
  };

  const handleViewProfile = (candidateId: string) => {
    navigate(`/candidate/${candidateId}`);
  };

  return (
    <RoleGate allowedRoles={['partner', 'admin', 'strategist']}>
      <AppLayout>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <PageTitle>Candidate Relationships</PageTitle>
                  <Subtitle>Monitor and nurture your candidate connections</Subtitle>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PartnerRelationshipStats stats={stats} loading={loading} />
          </motion.div>

          {/* Relationship Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PartnerRelationshipGrid
              relationships={relationships}
              onSendMessage={handleSendMessage}
              onScheduleMeeting={handleScheduleMeeting}
              onViewProfile={handleViewProfile}
            />
          </motion.div>

          {/* Cross-Channel Patterns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <CrossChannelPatternsCard />
          </motion.div>

          {/* Club AI Advisor */}
          <ClubAIAdvisorWidget context="pipeline" />
        </div>
      </AppLayout>
    </RoleGate>
  );
}
