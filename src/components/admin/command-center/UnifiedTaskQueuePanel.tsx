import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const priorityBadge = {
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
      type: 'approval' as const,
      label: 'Member Approvals',
      count: pendingApprovals,
      priority: getPriority(pendingApprovals, 5),
      link: '/admin/member-approvals',
    },
    {
      id: 'applications',
      type: 'application' as const,
      label: 'Application Reviews',
      count: pendingApplications,
      priority: getPriority(pendingApplications, 20),
      link: '/applications',
    },
    {
      id: 'security',
      type: 'security' as const,
      label: 'Security Alerts',
      count: securityAlerts,
      priority: getPriority(securityAlerts, 0, true),
      link: '/admin/anti-hacking',
    },
    {
      id: 'overdue',
      type: 'overdue' as const,
      label: 'Overdue Tasks',
      count: overdueItems,
      priority: getPriority(overdueItems, 3),
      link: '/tasks',
    },
  ];
  
  const tasks = allTasks.filter(t => t.count > 0);

  const totalTasks = pendingApprovals + pendingApplications + securityAlerts + overdueItems;

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ListTodo className="h-4 w-4 text-primary" />
            Task Queue
            {totalTasks > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {totalTasks}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6">
            <ListTodo className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No pending tasks</p>
          </div>
        ) : (
          <ScrollArea className="h-[180px] -mx-2 px-2">
            <div className="space-y-2">
              {tasks.map((task) => {
                const config = taskConfig[task.type];
                const Icon = config.icon;
                
                return (
                  <Link
                    key={task.id}
                    to={task.link}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg transition-colors hover:bg-muted/70",
                      config.bg
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn("p-1.5 rounded-md", config.bg)}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium">{task.label}</span>
                          <Badge className={cn("h-4 px-1 text-[9px]", priorityBadge[task.priority])}>
                            {task.count}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {task.priority === 'high' ? 'Requires attention' : 'Pending review'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
