import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, 
  BarChart3, 
  Megaphone, 
  Zap, 
  Upload, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Tab components
import { WhatsAppInboxTab } from '@/components/whatsapp/tabs/WhatsAppInboxTab';
import { WhatsAppAnalyticsTab } from '@/components/whatsapp/tabs/WhatsAppAnalyticsTab';
import { WhatsAppCampaignsTab } from '@/components/whatsapp/tabs/WhatsAppCampaignsTab';
import { WhatsAppAutomationsTab } from '@/components/whatsapp/tabs/WhatsAppAutomationsTab';
import { WhatsAppImportTab } from '@/components/whatsapp/tabs/WhatsAppImportTab';
import { WhatsAppSettingsTab } from '@/components/whatsapp/tabs/WhatsAppSettingsTab';
import { WhatsAppMetricsBar } from '@/components/whatsapp/WhatsAppMetricsBar';

type TabId = 'inbox' | 'analytics' | 'campaigns' | 'automations' | 'import' | 'settings';

interface SidebarItem {
  id: TabId;
  label: string;
  icon: typeof MessageSquare;
  badge?: number;
  roles?: string[];
}

const sidebarItems: SidebarItem[] = [
  { id: 'inbox', label: 'Inbox', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'automations', label: 'Automations', icon: Zap },
  { id: 'import', label: 'Import', icon: Upload },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

export default function WhatsAppHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  
  const activeTab = (searchParams.get('tab') as TabId) || 'inbox';
  
  const setActiveTab = (tab: TabId) => {
    setSearchParams({ tab });
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

  const isConnected = !!account?.is_active;

  const renderTabContent = () => {
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
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist', 'partner']} showLoading>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#25d366] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">WhatsApp Business Hub</h1>
                <p className="text-xs text-muted-foreground">
                  {account?.verified_name || 'Manage your WhatsApp communications'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                    isConnected 
                      ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                      : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  )}>
                    {isConnected ? (
                      <>
                        <Wifi className="w-3.5 h-3.5" />
                        Connected
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5" />
                        Not Connected
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isConnected 
                    ? 'WhatsApp Business API is connected and active' 
                    : 'Configure your WhatsApp connection in Settings'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Metrics Bar */}
          <WhatsAppMetricsBar />

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className={cn(
              "border-r border-border bg-card/30 flex flex-col shrink-0 transition-all duration-200",
              collapsed ? "w-16" : "w-52"
            )}>
              <nav className="flex-1 p-2 space-y-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const badgeCount = item.id === 'inbox' ? unreadCount : undefined;
                  
                  return (
                    <Tooltip key={item.id} delayDuration={collapsed ? 0 : 1000}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setActiveTab(item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                            isActive
                              ? "bg-[#25d366]/10 text-[#25d366] border border-[#25d366]/20"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-[#25d366]")} />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">{item.label}</span>
                              {badgeCount && badgeCount > 0 && (
                                <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px]">
                                  {badgeCount > 99 ? '99+' : badgeCount}
                                </Badge>
                              )}
                            </>
                          )}
                        </button>
                      </TooltipTrigger>
                      {collapsed && (
                        <TooltipContent side="right">
                          <div className="flex items-center gap-2">
                            {item.label}
                            {badgeCount && badgeCount > 0 && (
                              <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[9px]">
                                {badgeCount}
                              </Badge>
                            )}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </nav>
              
              {/* Collapse button */}
              <div className="p-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCollapsed(!collapsed)}
                  className="w-full justify-center"
                >
                  {collapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <>
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      <span>Collapse</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
