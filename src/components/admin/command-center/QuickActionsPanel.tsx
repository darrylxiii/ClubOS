import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Zap, 
  UserCheck, 
  FileText, 
  ShieldCheck, 
  Activity, 
  FileOutput,
  RefreshCw,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface QuickAction {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  hoverBg: string;
  action: 'link' | 'callback';
  link?: string;
}

interface QuickActionsPanelProps {
  onRefreshAll?: () => void;
  onRunHealthCheck?: () => void;
  isRefreshing?: boolean;
}

export function QuickActionsPanel({
  onRefreshAll,
  onRunHealthCheck,
  isRefreshing,
}: QuickActionsPanelProps) {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      id: 'approve-members',
      label: 'Approve Members',
      shortLabel: 'Members',
      icon: UserCheck,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      hoverBg: 'hover:bg-blue-500/20',
      action: 'link',
      link: '/admin/member-approvals',
    },
    {
      id: 'review-apps',
      label: 'Review Applications',
      shortLabel: 'Apps',
      icon: FileText,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      hoverBg: 'hover:bg-purple-500/20',
      action: 'link',
      link: '/applications',
    },
    {
      id: 'security',
      label: 'Security Center',
      shortLabel: 'Security',
      icon: ShieldCheck,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      hoverBg: 'hover:bg-rose-500/20',
      action: 'link',
      link: '/admin/anti-hacking',
    },
    {
      id: 'health-check',
      label: 'Run Health Check',
      shortLabel: 'Health',
      icon: Activity,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      hoverBg: 'hover:bg-emerald-500/20',
      action: 'callback',
    },
    {
      id: 'view-logs',
      label: 'View System Logs',
      shortLabel: 'Logs',
      icon: FileOutput,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      hoverBg: 'hover:bg-amber-500/20',
      action: 'link',
      link: '/admin/audit-log',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      shortLabel: 'Alerts',
      icon: Bell,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
      hoverBg: 'hover:bg-cyan-500/20',
      action: 'link',
      link: '/notifications',
    },
  ];

  const handleAction = (action: QuickAction) => {
    if (action.action === 'link' && action.link) {
      navigate(action.link);
    } else if (action.id === 'health-check') {
      onRunHealthCheck?.();
    }
  };

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-primary" />
            Actions
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-3 pb-3">
        <TooltipProvider delayDuration={0}>
          {/* Icon grid for mobile/tablet, list for desktop */}
          <div className="grid grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              
              return (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-auto p-2.5 flex-col gap-1.5 w-full",
                        action.bg,
                        action.hoverBg
                      )}
                      onClick={() => handleAction(action)}
                    >
                      <Icon className={cn("h-5 w-5", action.color)} />
                      <span className="text-[10px] font-medium text-center leading-tight">
                        {action.shortLabel}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {action.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
