import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useCRMKeyboardShortcuts } from '@/hooks/useCRMKeyboardShortcuts';
import { 
  Mail, 
  Zap, 
  Brain, 
  BarChart3, 
  Clock, 
  FlaskConical, 
  Target, 
  DollarSign,
  TrendingUp,
  MessageSquare,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { SmartReplyInbox } from '@/components/crm/SmartReplyInbox';
import { LeadPriorityQueue } from '@/components/crm/LeadPriorityQueue';
import { AccountHealthDashboard } from '@/components/crm/AccountHealthDashboard';
import { SendTimeHeatmap } from '@/components/crm/SendTimeHeatmap';
import { ABTestAnalyzer } from '@/components/crm/ABTestAnalyzer';
import { OutreachStrategist } from '@/components/crm/OutreachStrategist';
import { ConversionPredictionChart } from '@/components/crm/ConversionPredictionChart';
import { CampaignROIDashboard } from '@/components/crm/CampaignROIDashboard';
import { OutreachKPIGrid } from '@/components/crm/OutreachKPIGrid';
import { AIInsightsPanel } from '@/components/crm/AIInsightsPanel';
import { OutreachActivityFeed } from '@/components/crm/OutreachActivityFeed';
import { DeliverabilityAlerts } from '@/components/crm/DeliverabilityAlerts';
import { useCRMCampaigns } from '@/hooks/useCRMCampaigns';
import { useCRMEmailReplies } from '@/hooks/useCRMEmailReplies';
import { Skeleton } from '@/components/ui/skeleton';

export default function EmailSequencingHub() {
  const [activeTab, setActiveTab] = useState('command-center');
  const { campaigns, loading: campaignsLoading, refetch: refetchCampaigns } = useCRMCampaigns({ limit: 100 });
  const { replies, loading: repliesLoading } = useCRMEmailReplies({ isActioned: false, limit: 100 });

  // Keyboard shortcuts
  const { shortcuts, showHelp, setShowHelp } = useCRMKeyboardShortcuts({
    onSearch: () => toast.info('Search: Press Cmd+K'),
    onRefresh: () => refetchCampaigns(),
    enabled: true,
  });

  const tabs = [
    { id: 'command-center', label: 'Command Center', icon: Brain },
    { id: 'smart-inbox', label: 'Smart Inbox', icon: MessageSquare },
    { id: 'lead-queue', label: 'Lead Priority', icon: Target },
    { id: 'ab-testing', label: 'A/B Testing', icon: FlaskConical },
    { id: 'send-timing', label: 'Send Timing', icon: Clock },
    { id: 'account-health', label: 'Account Health', icon: BarChart3 },
    { id: 'roi', label: 'ROI Analysis', icon: DollarSign },
    { id: 'strategist', label: 'QUIN Strategist', icon: Sparkles },
  ];

  // Tab navigation with keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Number keys to switch tabs
      const tabIndex = parseInt(e.key) - 1;
      if (tabIndex >= 0 && tabIndex < tabs.length) {
        setActiveTab(tabs[tabIndex].id);
        toast.success(`Switched to ${tabs[tabIndex].label}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loading = campaignsLoading || repliesLoading;

  // Calculate stats
  const totalSent = campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0);
  const totalReplies = campaigns.reduce((sum, c) => sum + (c.total_replies || 0), 0);
  const totalOpens = campaigns.reduce((sum, c) => sum + (c.total_opens || 0), 0);
  const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : '0';
  const openRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : '0';
  const hotLeads = replies.filter(r => r.classification === 'interested').length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  const heroStats = [
    { label: 'Active Campaigns', value: activeCampaigns, icon: Mail, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { label: 'Emails Sent', value: totalSent.toLocaleString(), icon: MessageSquare, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { label: 'Open Rate', value: `${openRate}%`, icon: TrendingUp, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { label: 'Reply Rate', value: `${replyRate}%`, icon: Zap, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Hot Leads', value: hotLeads, icon: Target, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  ];
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          {/* Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-8 border border-border/30"
          >
            {/* Animated orbs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-primary/20">
                      <Brain className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Email Intelligence Hub
                    </h1>
                  </div>
                  <p className="text-muted-foreground max-w-xl">
                    AI-powered email sequencing with smart reply analysis, predictive lead scoring, and optimal send timing
                  </p>
                </div>
                <Button onClick={() => refetchCampaigns()} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>

              {/* Hero Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
                {heroStats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card/40 backdrop-blur-sm rounded-xl p-4 border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div>
                        {loading ? (
                          <Skeleton className="h-7 w-12" />
                        ) : (
                          <p className="text-2xl font-bold">{stat.value}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 px-4 py-2"
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Command Center - Overview Dashboard */}
            <TabsContent value="command-center" className="mt-6">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - KPIs & Insights */}
                <div className="lg:col-span-2 space-y-6">
                  <OutreachKPIGrid />
                  <div className="grid md:grid-cols-2 gap-6">
                    <ConversionPredictionChart />
                    <AIInsightsPanel />
                  </div>
                </div>
                {/* Right Column - Activity Feed & Alerts */}
                <div className="space-y-6">
                  <DeliverabilityAlerts />
                  <OutreachActivityFeed />
                </div>
              </div>
            </TabsContent>

            {/* Smart Reply Inbox */}
            <TabsContent value="smart-inbox" className="mt-6">
              <SmartReplyInbox />
            </TabsContent>

            {/* Lead Priority Queue */}
            <TabsContent value="lead-queue" className="mt-6">
              <LeadPriorityQueue />
            </TabsContent>

            {/* A/B Testing */}
            <TabsContent value="ab-testing" className="mt-6">
              <ABTestAnalyzer />
            </TabsContent>

            {/* Send Timing */}
            <TabsContent value="send-timing" className="mt-6">
              <SendTimeHeatmap />
            </TabsContent>

            {/* Account Health */}
            <TabsContent value="account-health" className="mt-6">
              <AccountHealthDashboard />
            </TabsContent>

            {/* ROI Analysis */}
            <TabsContent value="roi" className="mt-6">
              <CampaignROIDashboard />
            </TabsContent>

            {/* QUIN Strategist */}
            <TabsContent value="strategist" className="mt-6">
              <OutreachStrategist />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
