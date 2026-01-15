import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Mail, ClipboardCheck, Calendar, Download, UserPlus, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

const operationIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  assessment: <ClipboardCheck className="h-4 w-4" />,
  scheduling: <Calendar className="h-4 w-4" />,
  export: <Download className="h-4 w-4" />,
  invitation: <UserPlus className="h-4 w-4" />,
  pipeline_invite: <UserPlus className="h-4 w-4" />,
};

const statusConfig: Record<string, { icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  failed: { icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
  processing: { icon: <Loader2 className="h-3 w-3 animate-spin" />, variant: "secondary" },
  pending: { icon: <Clock className="h-3 w-3" />, variant: "outline" },
  cancelled: { icon: <XCircle className="h-3 w-3" />, variant: "outline" },
};

export const BulkOperationHistory = () => {
  const { data: operations, isLoading } = useQuery({
    queryKey: ["bulk-operation-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_operation_logs")
        .select(`
          *,
          admin:admin_id(
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Poll for updates
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!operations || operations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No bulk operations performed yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {operations.map((op) => {
        const status = statusConfig[op.status] || statusConfig.pending;
        const metadata = op.metadata as Record<string, any> || {};

        return (
          <div
            key={op.id}
            className="flex items-start gap-4 p-4 rounded-lg border bg-card"
          >
            <div className="p-2 bg-muted rounded-lg">
              {operationIcons[op.operation_type] || <Mail className="h-4 w-4" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium capitalize">
                  {op.operation_type.replace(/_/g, " ")}
                </span>
                <Badge variant={status.variant} className="gap-1">
                  {status.icon}
                  {op.status}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>
                  {op.success_count}/{op.target_count} successful
                </span>
                {op.failure_count > 0 && (
                  <span className="text-destructive">
                    {op.failure_count} failed
                  </span>
                )}
                {metadata.subject && (
                  <span className="truncate max-w-[200px]">
                    Subject: {metadata.subject}
                  </span>
                )}
                {metadata.assessment_type && (
                  <span>Assessment: {metadata.assessment_type}</span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>
                  {formatDistanceToNow(new Date(op.created_at ?? new Date()), { addSuffix: true })}
                </span>
                {(op as any).admin && (
                  <>
                    <span>•</span>
                    <span>by {(op as any).admin.full_name || "Admin"}</span>
                  </>
                )}
                {op.completed_at && (
                  <>
                    <span>•</span>
                    <span>
                      Duration: {Math.round(
                        (new Date(op.completed_at ?? new Date()).getTime() - new Date(op.started_at || op.created_at || new Date()).getTime()) / 1000
                      )}s
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
