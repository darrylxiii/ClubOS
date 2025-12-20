import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  UserCheck, 
  FileText, 
  ShieldCheck, 
  Activity, 
  FileOutput,
  RefreshCw,
  Bell,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  action: 'link' | 'callback';
  link?: string;
  shortcut?: string;
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
      icon: UserCheck,
      color: 'text-blue-500',
      bg: 'hover:bg-blue-500/10',
      action: 'link',
      link: '/admin/member-approvals',
      shortcut: '1',
    },
    {
      id: 'review-apps',
      label: 'Review Apps',
      icon: FileText,
      color: 'text-purple-500',
      bg: 'hover:bg-purple-500/10',
      action: 'link',
      link: '/applications',
      shortcut: '2',
    },
    {
      id: 'security',
      label: 'Security Center',
      icon: ShieldCheck,
      color: 'text-rose-500',
      bg: 'hover:bg-rose-500/10',
      action: 'link',
      link: '/admin/anti-hacking',
      shortcut: '3',
    },
    {
      id: 'health-check',
      label: 'Health Check',
      icon: Activity,
      color: 'text-emerald-500',
      bg: 'hover:bg-emerald-500/10',
      action: 'callback',
      shortcut: '4',
    },
    {
      id: 'view-logs',
      label: 'System Logs',
      icon: FileOutput,
      color: 'text-amber-500',
      bg: 'hover:bg-amber-500/10',
      action: 'link',
      link: '/admin/audit-log',
      shortcut: '5',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      color: 'text-cyan-500',
      bg: 'hover:bg-cyan-500/10',
      action: 'link',
      link: '/notifications',
      shortcut: '6',
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
    <Card className="glass-card h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-primary" />
            Quick Actions
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            
            return (
              <Button
                key={action.id}
                variant="ghost"
                className={cn(
                  "h-auto flex-col items-start p-2.5 justify-start",
                  action.bg
                )}
                onClick={() => handleAction(action)}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className={cn("h-4 w-4", action.color)} />
                  <span className="text-xs font-medium flex-1 text-left">
                    {action.label}
                  </span>
                  {action.shortcut && (
                    <kbd className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                      {action.shortcut}
                    </kbd>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
