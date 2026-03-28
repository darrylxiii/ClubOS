import { useTranslation } from 'react-i18next';
import { lazy, Suspense, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/PageLoader';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PartnerPageHeader } from '@/components/partner/PartnerPageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings2, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Operations tabs (existing) ──────────────────────────────────
const PartnerAnalyticsDashboard = lazy(() => import('@/pages/PartnerAnalyticsDashboard'));
const BillingDashboard = lazy(() => import('@/pages/partner/BillingDashboard'));
const SLADashboard = lazy(() => import('@/pages/partner/SLADashboard'));
const IntegrationsManagement = lazy(() => import('@/pages/partner/IntegrationsManagement'));
const AuditLog = lazy(() => import('@/pages/partner/AuditLog'));
const PartnerRejections = lazy(() => import('@/pages/PartnerRejections'));
const PartnerTargetCompanies = lazy(() => import('@/pages/PartnerTargetCompanies'));
const SocialManagement = lazy(() => import('@/pages/SocialManagement'));
const HealthScoreDashboardPage = lazy(() => import('@/components/partner/HealthScoreDashboardWrapper'));
const PartnerOffersDashboard = lazy(() => import('@/components/partner/PartnerOffersDashboard'));
const PartnerAutomationsView = lazy(() => import('@/components/partner/PartnerAutomationsView'));

// ── Intelligence tabs (premium — Sprint 1-4 features) ──────────
// These will be lazily added as each feature is built.
const TalentWarRoom = lazy(() => import('@/pages/partner/TalentWarRoom'));
const CRIDashboard = lazy(() => import('@/pages/partner/CRIDashboard'));
const PredictiveIntelligence = lazy(() => import('@/pages/partner/PredictiveIntelligence'));
const ExecutiveBriefing = lazy(() => import('@/pages/partner/ExecutiveBriefing'));
const StrategistPortal = lazy(() => import('@/pages/partner/StrategistPortal'));
const HiringCommittee = lazy(() => import('@/pages/partner/HiringCommittee'));
const OfferIntelligence = lazy(() => import('@/pages/partner/OfferIntelligence'));
const BrandCommandCenter = lazy(() => import('@/pages/partner/BrandCommandCenter'));
const NetworkIntelligence = lazy(() => import('@/pages/partner/NetworkIntelligence'));
const TalentNurturing = lazy(() => import('@/pages/partner/TalentNurturing'));
const MarketAlerts = lazy(() => import('@/pages/partner/MarketAlerts'));
const SuccessMetrics = lazy(() => import('@/pages/partner/SuccessMetrics'));
const VIPToolkit = lazy(() => import('@/pages/partner/VIPToolkit'));
const ConfidentialSearch = lazy(() => import('@/pages/partner/ConfidentialSearch'));
const AIChiefOfStaff = lazy(() => import('@/pages/partner/AIChiefOfStaff'));

type TabGroup = 'operations' | 'intelligence';

interface TabConfig {
  value: string;
  label: string;
  group: TabGroup;
  component: React.LazyExoticComponent<any> | null;
  comingSoon?: boolean;
}

export default function PartnerHub() {
  const { t } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: TabConfig[] = useMemo(() => [
    // Operations
    { value: 'analytics', label: t('analytics', 'Analytics'), group: 'operations', component: PartnerAnalyticsDashboard },
    { value: 'billing', label: t('billing', 'Billing'), group: 'operations', component: BillingDashboard },
    { value: 'sla', label: 'SLA', group: 'operations', component: SLADashboard },
    { value: 'health', label: t('health', 'Health'), group: 'operations', component: HealthScoreDashboardPage },
    { value: 'offers', label: t('offers', 'Offers'), group: 'operations', component: PartnerOffersDashboard },
    { value: 'integrations', label: t('integrations', 'Integrations'), group: 'operations', component: IntegrationsManagement },
    { value: 'workflows', label: t('workflows', 'Workflows'), group: 'operations', component: PartnerAutomationsView },
    { value: 'audit-log', label: t('audit_log', 'Audit Log'), group: 'operations', component: AuditLog },
    { value: 'rejections', label: t('rejections', 'Rejections'), group: 'operations', component: PartnerRejections },
    { value: 'target-companies', label: t('target_companies', 'Target Companies'), group: 'operations', component: PartnerTargetCompanies },
    { value: 'social', label: t('social', 'Social'), group: 'operations', component: SocialManagement },
    // Intelligence (coming soon — placeholders for Sprint 1-4)
    { value: 'war-room', label: t('war_room', 'War Room'), group: 'intelligence', component: TalentWarRoom },
    { value: 'cri', label: t('cri', 'Candidate Intel'), group: 'intelligence', component: CRIDashboard },
    { value: 'predictive', label: t('predictive', 'Predictive'), group: 'intelligence', component: PredictiveIntelligence },
    { value: 'briefing', label: t('briefing', 'Briefing Deck'), group: 'intelligence', component: ExecutiveBriefing },
    { value: 'strategist', label: t('strategist_portal', 'Strategist'), group: 'intelligence', component: StrategistPortal },
    { value: 'committee', label: t('committee', 'Committee'), group: 'intelligence', component: HiringCommittee },
    { value: 'offer-intel', label: t('offer_intel', 'Offer Intel'), group: 'intelligence', component: OfferIntelligence },
    { value: 'brand', label: t('brand', 'Brand'), group: 'intelligence', component: BrandCommandCenter },
    { value: 'network', label: t('network', 'Network'), group: 'intelligence', component: NetworkIntelligence },
    { value: 'nurturing', label: t('nurturing', 'Nurturing'), group: 'intelligence', component: TalentNurturing },
    { value: 'market-alerts', label: t('market_alerts', 'Alerts'), group: 'intelligence', component: MarketAlerts },
    { value: 'success', label: t('success_metrics', 'Success'), group: 'intelligence', component: SuccessMetrics },
    { value: 'vip', label: t('vip_toolkit', 'VIP'), group: 'intelligence', component: VIPToolkit },
    { value: 'confidential', label: t('confidential', 'Confidential'), group: 'intelligence', component: ConfidentialSearch },
    { value: 'chief-of-staff', label: t('chief_of_staff', 'AI Chief of Staff'), group: 'intelligence', component: AIChiefOfStaff },
  ], [t]);

  // Determine active tab and group from URL
  const tabParam = searchParams.get('tab') || '';
  const validTab = tabs.find(tab => tab.value === tabParam);
  const activeTab = validTab?.value || 'analytics';
  const activeGroup: TabGroup = validTab?.group || 'operations';

  const [selectedGroup, setSelectedGroup] = useState<TabGroup>(activeGroup);

  const groupTabs = useMemo(() =>
    tabs.filter(tab => tab.group === selectedGroup),
    [tabs, selectedGroup]
  );

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'analytics' ? {} : { tab: value }, { replace: true });
  };

  const handleGroupChange = (group: TabGroup) => {
    setSelectedGroup(group);
    // Switch to first tab in the new group
    const firstTab = tabs.find(t => t.group === group);
    if (firstTab) {
      handleTabChange(firstTab.value);
    }
  };

  const intelligenceCount = tabs.filter(t => t.group === 'intelligence' && !t.comingSoon).length;

  return (
    <RoleGate allowedRoles={['partner', 'admin', 'strategist']}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <PartnerPageHeader
          title={t('partner_hub', 'Partner Hub')}
          subtitle={t('partner_hub_subtitle', 'Your command center for hiring operations and intelligence')}
        />

        {/* Group selector */}
        <div className="flex items-center gap-2">
          <Button
            variant={selectedGroup === 'operations' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => handleGroupChange('operations')}
          >
            <Settings2 className="h-4 w-4" />
            {t('operations', 'Operations')}
          </Button>
          <Button
            variant={selectedGroup === 'intelligence' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => handleGroupChange('intelligence')}
          >
            <Brain className="h-4 w-4" />
            {t('intelligence', 'Intelligence')}
            {intelligenceCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-[10px]">
                {intelligenceCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Tabs for active group */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="h-auto inline-flex bg-card/30 backdrop-blur-sm border border-border/20 rounded-lg p-1">
              {groupTabs.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  disabled={tab.comingSoon}
                  className={cn(tab.comingSoon && 'opacity-50')}
                >
                  {tab.label}
                  {tab.comingSoon && (
                    <Badge variant="outline" className="ml-1.5 text-[9px] py-0 px-1 border-primary/30 text-primary">
                      {t('soon', 'Soon')}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <Suspense fallback={<PageLoader />}>
            {tabs.filter(tab => !tab.comingSoon && tab.component).map(tab => {
              const Component = tab.component!;
              return (
                <TabsContent key={tab.value} value={tab.value}>
                  <Component />
                </TabsContent>
              );
            })}
          </Suspense>
        </Tabs>
      </div>
    </RoleGate>
  );
}
