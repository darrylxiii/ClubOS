import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTimeTracking, TimeEntryData } from "@/hooks/useTimeTracking";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function PendingApprovals() {
  const { pendingApprovals, approveEntry, rejectEntry, isLoading } = useTimeTracking();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (pendingApprovals.length === 0) {
    return (
      <Card className="p-12 text-center border border-border/50">
        <CheckCircle className="h-12 w-12 mx-auto text-green-500/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          All caught up!
        </h3>
        <p className="text-sm text-muted-foreground">
          No time entries pending approval
        </p>
      </Card>
    );
  }

  // Group by user
  const groupedByUser = pendingApprovals.reduce((acc, entry) => {
    const userId = entry.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user: entry.user,
        entries: [],
        totalHours: 0,
      };
    }
    acc[userId].entries.push(entry);
    acc[userId].totalHours += Number(entry.hours_worked || 0);
    return acc;
  }, {} as Record<string, { user: any; entries: TimeEntryData[]; totalHours: number }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Pending Approvals</h2>
        <p className="text-sm text-muted-foreground">
          {pendingApprovals.length} time entr{pendingApprovals.length === 1 ? 'y' : 'ies'} awaiting review
        </p>
      </div>

      {/* Bulk Actions */}
      <Card className="p-4 border border-border/50 bg-amber-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-foreground">
              {pendingApprovals.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0).toFixed(1)}h total pending
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => pendingApprovals.forEach(e => rejectEntry.mutate(e.id))}
            >
              Reject All
            </Button>
            <Button 
              size="sm"
              onClick={() => pendingApprovals.forEach(e => approveEntry.mutate(e.id))}
            >
              Approve All
            </Button>
          </div>
        </div>
      </Card>

      {/* Grouped by User */}
      <div className="space-y-6">
        {Object.entries(groupedByUser).map(([userId, group]) => (
          <Card key={userId} className="border border-border/50 overflow-hidden">
            {/* User Header */}
            <div className="p-4 bg-muted/30 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={group.user?.avatar_url} />
                    <AvatarFallback>
                      {(group.user?.full_name || 'U')
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {group.user?.full_name || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {group.entries.length} entries • {group.totalHours.toFixed(1)}h total
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => group.entries.forEach(e => rejectEntry.mutate(e.id))}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject All
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => group.entries.forEach(e => approveEntry.mutate(e.id))}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve All
                  </Button>
                </div>
              </div>
            </div>

            {/* Entries */}
            <div className="divide-y divide-border/50">
              {group.entries.map((entry) => (
                <ApprovalRow 
                  key={entry.id} 
                  entry={entry}
                  onApprove={() => approveEntry.mutate(entry.id)}
                  onReject={() => rejectEntry.mutate(entry.id)}
                  isApproving={approveEntry.isPending}
                  isRejecting={rejectEntry.isPending}
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface ApprovalRowProps {
  entry: TimeEntryData;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}

function ApprovalRow({ entry, onApprove, onReject, isApproving, isRejecting }: ApprovalRowProps) {
  return (
    <div className="p-4 hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-medium text-foreground">
              {format(new Date(entry.date), 'EEE, MMM d, yyyy')}
            </span>
            {entry.start_time && entry.end_time && (
              <span className="text-xs text-muted-foreground">
                {entry.start_time} - {entry.end_time}
              </span>
            )}
            {entry.entry_type && entry.entry_type !== 'work' && (
              <Badge variant="outline" className="text-xs capitalize">
                {entry.entry_type}
              </Badge>
            )}
          </div>

          <p className="text-sm text-foreground">
            {entry.task_description || entry.notes || 'No description provided'}
          </p>

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 ml-4">
          <div className="text-right">
            <div className="text-lg font-bold text-foreground">
              {Number(entry.hours_worked).toFixed(1)}h
            </div>
            {entry.total_amount && Number(entry.total_amount) > 0 && (
              <div className="text-sm text-muted-foreground">
                €{Number(entry.total_amount).toFixed(2)}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onReject}
              disabled={isRejecting}
            >
              <XCircle className="h-4 w-4" />
            </Button>
            <Button 
              size="sm"
              onClick={onApprove}
              disabled={isApproving}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
