import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { 
  UserPlus, 
  UserMinus, 
  Lock, 
  Unlock, 
  Users, 
  Clock,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AuditLogEntry {
  id: string;
  job_id: string;
  job_title: string | null;
  action_type: string;
  target_user_id: string | null;
  target_user_email: string | null;
  target_user_name: string | null;
  performed_by: string;
  performed_by_email: string | null;
  performed_by_name: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface StealthAuditTimelineProps {
  jobId: string;
  maxHeight?: string;
}

const ACTION_CONFIG: Record<string, { 
  icon: typeof UserPlus; 
  label: string; 
  color: string;
  bgColor: string;
}> = {
  viewer_added: { 
    icon: UserPlus, 
    label: "Viewer Added", 
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
  },
  viewer_removed: { 
    icon: UserMinus, 
    label: "Viewer Removed", 
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30"
  },
  stealth_enabled: { 
    icon: Lock, 
    label: "Stealth Enabled", 
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30"
  },
  stealth_disabled: { 
    icon: Unlock, 
    label: "Stealth Disabled", 
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30"
  },
  bulk_add: { 
    icon: Users, 
    label: "Bulk Add", 
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
  },
  bulk_remove: { 
    icon: Users, 
    label: "Bulk Remove", 
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30"
  },
};

export const StealthAuditTimeline = ({ jobId, maxHeight = "300px" }: StealthAuditTimelineProps) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('stealth_viewer_audit_logs')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setLogs((data || []) as AuditLogEntry[]);
      } catch (error) {
        console.error('Error fetching audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchLogs();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No access changes recorded yet</p>
      </div>
    );
  }

  const renderLogEntry = (log: AuditLogEntry) => {
    const config = ACTION_CONFIG[log.action_type] || ACTION_CONFIG.viewer_added;
    const Icon = config.icon;
    const isBulk = log.action_type === 'bulk_add' || log.action_type === 'bulk_remove';
    const bulkCount = log.metadata?.count || 0;

    return (
      <div key={log.id} className="flex gap-3 py-3 border-b border-border/50 last:border-0">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          config.bgColor
        )}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge variant="outline" className={cn("text-xs mb-1", config.color)}>
                {config.label}
              </Badge>
              
              <p className="text-sm">
                <span className="font-medium">
                  {log.performed_by_name || log.performed_by_email || 'Unknown user'}
                </span>
                {' '}
                {log.action_type === 'stealth_enabled' && 'enabled stealth mode'}
                {log.action_type === 'stealth_disabled' && 'disabled stealth mode'}
                {log.action_type === 'viewer_added' && (
                  <>
                    added{' '}
                    <span className="font-medium">
                      {log.target_user_name || log.target_user_email || 'a user'}
                    </span>
                  </>
                )}
                {log.action_type === 'viewer_removed' && (
                  <>
                    removed{' '}
                    <span className="font-medium">
                      {log.target_user_name || log.target_user_email || 'a user'}
                    </span>
                  </>
                )}
                {log.action_type === 'bulk_add' && (
                  <>
                    added{' '}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-medium cursor-help underline decoration-dotted">
                            {bulkCount} viewer{bulkCount !== 1 ? 's' : ''}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs max-w-xs">
                            {log.metadata?.users?.map((u: any) => u.name || u.email).join(', ')}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
                {log.action_type === 'bulk_remove' && (
                  <>
                    removed{' '}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-medium cursor-help underline decoration-dotted">
                            {bulkCount} viewer{bulkCount !== 1 ? 's' : ''}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs max-w-xs">
                            {log.metadata?.users?.map((u: any) => u.name || u.email).join(', ')}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </p>
            </div>
            
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ScrollArea style={{ maxHeight }} className="pr-4">
      <div className="space-y-0">
        {logs.map(renderLogEntry)}
      </div>
    </ScrollArea>
  );
};
