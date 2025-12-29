import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ListTodo, 
  UserCheck, 
  FileText, 
  Shield, 
  Clock,
  ChevronRight,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface TaskQueueItem {
  id: string;
  type: 'approval' | 'application' | 'security' | 'overdue';
  label: string;
  shortLabel: string;
  count: number;
  priority: 'high' | 'medium' | 'low';
  link: string;
}

interface UnifiedTaskQueuePanelProps {
  pendingApprovals: number;
  pendingApplications: number;
  securityAlerts: number;
  overdueItems: number;
  isLoading?: boolean;
}

const taskConfig = {
  approval: {
    icon: UserCheck,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  application: {
    icon: FileText,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  security: {
    icon: Shield,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
  overdue: {
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
};

const priorityStyles = {
  high: 'bg-rose-500 text-white',
  medium: 'bg-amber-500 text-white',
  low: 'bg-muted text-muted-foreground',
};

export function UnifiedTaskQueuePanel({
  pendingApprovals,
  pendingApplications,
  securityAlerts,
  overdueItems,
  isLoading,
}: UnifiedTaskQueuePanelProps) {
  const getPriority = (count: number, highThreshold: number, hasAny: boolean = false): 'high' | 'medium' | 'low' => {
    if (hasAny && count > 0) return 'high';
    if (count > highThreshold) return 'high';
    if (count > 0) return 'medium';
    return 'low';
  };

  const allTasks: TaskQueueItem[] = [
    {
      id: 'approvals',
      type: 'approval',
      label: 'Member Approvals',
      shortLabel: 'Approvals',
      count: pendingApprovals,
      priority: getPriority(pendingApprovals, 5),
      link: '/admin/member-approvals',
    },
    {
      id: 'applications',
      type: 'application',
      label: 'Application Reviews',
      shortLabel: 'Applications',
      count: pendingApplications,
      priority: getPriority(pendingApplications, 20),
      link: '/applications',
    },
    {
      id: 'security',
      type: 'security',
      label: 'Security Alerts',
      shortLabel: 'Security',
      count: securityAlerts,
      priority: getPriority(securityAlerts, 0, true),
      link: '/admin/anti-hacking',
    },
    {
      id: 'overdue',
      type: 'overdue',
      label: 'Overdue Tasks',
      shortLabel: 'Overdue',
      count: overdueItems,
      priority: getPriority(overdueItems, 3),
      link: '/tasks',
    },
  ];
  
  const tasks = allTasks.filter(t => t.count > 0);
  const totalTasks = pendingApprovals + pendingApplications + securityAlerts + overdueItems;

  return (
    <Card className="glass-card h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ListTodo className="h-4 w-4 text-primary" />
            Tasks
            {totalTasks > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {totalTasks}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-3 pb-3 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-4">
            <ListTodo className="h-6 w-6 mx-auto text-emerald-500 mb-1.5" />
            <p className="text-xs font-medium text-emerald-600">All caught up!</p>
            <p className="text-[10px] text-muted-foreground">No pending tasks</p>
          </div>
        ) : (
          <ScrollArea className="h-[180px]">
            <div className="space-y-1.5 pr-2">
              {tasks.map((task) => {
                const config = taskConfig[task.type];
                const Icon = config.icon;
                
                return (
                  <Link
                    key={task.id}
                    to={task.link}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-muted/80",
                      config.bg
                    )}
                  >
                    <div className={cn("p-1.5 rounded shrink-0", config.bg)}>
                      <Icon className={cn("h-3.5 w-3.5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium" title={task.label}>
                          {task.shortLabel}
                        </span>
                        <Badge className={cn("h-4 px-1.5 text-[9px] shrink-0", priorityStyles[task.priority])}>
                          {task.count}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {task.priority === 'high' ? 'Needs attention' : 'Pending'}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
