import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { RoleGate } from '@/components/RoleGate';
import { useRole } from '@/contexts/RoleContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  BarChart3, 
  Megaphone, 
  Zap, 
  Upload, 
  Settings,
  Wifi,
  WifiOff,
  Home,
  ChevronRight,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Tab components (used when not using nested routes)
import { WhatsAppInboxTab } from '@/components/whatsapp/tabs/WhatsAppInboxTab';
import { WhatsAppAnalyticsTab } from '@/components/whatsapp/tabs/WhatsAppAnalyticsTab';
import { WhatsAppCampaignsTab } from '@/components/whatsapp/tabs/WhatsAppCampaignsTab';
import { WhatsAppAutomationsTab } from '@/components/whatsapp/tabs/WhatsAppAutomationsTab';
import { WhatsAppImportTab } from '@/components/whatsapp/tabs/WhatsAppImportTab';
import { WhatsAppSettingsTab } from '@/components/whatsapp/tabs/WhatsAppSettingsTab';
import { WhatsAppMetricsBar } from '@/components/whatsapp/WhatsAppMetricsBar';
import { WhatsAppOnboardingCard } from '@/components/whatsapp/WhatsAppOnboardingCard';

type TabId = 'inbox' | 'analytics' | 'campaigns' | 'automations' | 'import' | 'settings';

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof MessageSquare;
  badge?: number;
  roles?: string[];
  path: string;
}

const navItems: NavItem[] = [
  { id: 'inbox', label: 'Inbox', icon: MessageSquare, path: '/admin/whatsapp' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/admin/whatsapp/analytics' },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone, path: '/admin/whatsapp/campaigns' },
  { id: 'automations', label: 'Automations', icon: Zap, path: '/admin/whatsapp/automations' },
  { id: 'import', label: 'Import', icon: Upload, path: '/admin/whatsapp/import' },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'], path: '/admin/whatsapp/settings' },
];

export default function WhatsAppHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRole } = useRole();
  
  // Support both query params (legacy) and path-based navigation
  const getActiveTab = (): TabId => {
    // Check path first
    const path = location.pathname;
    if (path.endsWith('/analytics')) return 'analytics';
    if (path.endsWith('/campaigns')) return 'campaigns';
    if (path.endsWith('/automations')) return 'automations';
    if (path.endsWith('/import')) return 'import';
    if (path.endsWith('/settings')) return 'settings';
    
    // Fallback to query param for backwards compatibility
    const tabParam = searchParams.get('tab') as TabId;
    if (tabParam && ['inbox', 'analytics', 'campaigns', 'automations', 'import', 'settings'].includes(tabParam)) {
      return tabParam;
    }
    
    return 'inbox';
  };

  const activeTab = getActiveTab();
  
  const handleTabChange = (tab: TabId) => {
    const item = navItems.find(i => i.id === tab);
    if (item) {
      navigate(item.path, { replace: true });
    }
  };

  // Connection status
  const { data: account } = useQuery({
    queryKey: ['whatsapp-account-status'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_business_accounts')
        .select('id, verified_name, is_active')
        .limit(1)
        .single();
      return data;
    },
  });

  // Unread count for inbox badge
  const { data: unreadCount } = useQuery({
    queryKey: ['whatsapp-unread-count'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_conversations')
        .select('unread_count');
      return data?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0;
    },
    refetchInterval: 30000,
  });

  // Check for templates
  const { data: templates } = useQuery({
    queryKey: ['whatsapp-templates-count'],
    queryFn: async () => {
      const { data } = await supabase.from('whatsapp_templates').select('id').limit(1);
      return data || [];
    },
  });

  // Check for conversations
  const { data: conversationCount } = useQuery({
    queryKey: ['whatsapp-conversation-count'],
    queryFn: async () => {
      const { data } = await supabase.from('whatsapp_conversations').select('id').limit(1);
      return data || [];
    },
  });

  // Urgent messages count (messages awaiting response > 2h)
  const { data: urgentCount } = useQuery({
    queryKey: ['whatsapp-urgent-count'],
    queryFn: async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('whatsapp_conversations')
        .select('id', { count: 'exact', head: true })
        .gt('unread_count', 0)
        .lt('last_message_at', twoHoursAgo);
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const isConnected = !!account?.is_active;
  const hasTemplates = (templates?.length || 0) > 0;
  const hasConversations = (conversationCount?.length || 0) > 0;
  const needsOnboarding = !isConnected && !hasConversations;

  const renderTabContent = () => {
    // Show onboarding for inbox tab when no data
    if (activeTab === 'inbox' && needsOnboarding) {
      return (
        <WhatsAppOnboardingCard
          hasAccount={isConnected}
          hasTemplates={hasTemplates}
          hasConversations={hasConversations}
          onNavigate={handleTabChange}
        />
      );
    }
    
    switch (activeTab) {
      case 'inbox':
        return <WhatsAppInboxTab />;
      case 'analytics':
        return <WhatsAppAnalyticsTab />;
      case 'campaigns':
        return <WhatsAppCampaignsTab />;
      case 'automations':
        return <WhatsAppAutomationsTab />;
      case 'import':
        return <WhatsAppImportTab />;
      case 'settings':
        return <WhatsAppSettingsTab />;
      default:
        return <WhatsAppInboxTab />;
    }
  };

  return (
    <RoleGate allowedRoles={['admin', 'strategist', 'partner']} showLoading>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Sticky Header Section */}
        <div className="flex-shrink-0 sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          {/* Header */}
          <div className="h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              {/* Breadcrumb Navigation */}
              <nav className="flex items-center gap-1.5 text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <Home className="w-4 h-4" />
                </Button>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                <span className="font-medium">WhatsApp Hub</span>
              </nav>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Urgent indicator */}
              {(urgentCount || 0) > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {urgentCount} urgent
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {urgentCount} conversation{urgentCount !== 1 ? 's' : ''} awaiting response for over 2 hours
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Connection status */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    isConnected 
                      ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20" 
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  )}>
                    {isConnected ? (
                      <>
                        <Wifi className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Not Connected</span>
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isConnected 
                    ? `WhatsApp Business API connected${account?.verified_name ? ` - ${account.verified_name}` : ''}` 
                    : 'Configure your WhatsApp connection in Settings'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-4 bg-card/30">
            <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none -mb-px">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const badgeCount = item.id === 'inbox' ? unreadCount : undefined;
                
                // Check role access for settings tab
                if (item.roles && !item.roles.includes(currentRole || '')) {
                  return null;
                }
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                      "hover:bg-muted/50 rounded-t-md",
                      isActive
                        ? "border-[#25d366] text-[#25d366] bg-[#25d366]/5"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {badgeCount && badgeCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="h-5 min-w-[20px] px-1.5 text-[10px] font-semibold"
                      >
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Metrics Bar */}
          <WhatsAppMetricsBar />
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-auto">
          {renderTabContent()}
        </div>
      </div>
    </RoleGate>
  );
}
