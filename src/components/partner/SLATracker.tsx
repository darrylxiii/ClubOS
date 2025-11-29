import { useSLATracking } from "@/hooks/usePartnerAnalytics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertCircle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function SLATracker({ companyId }: { companyId: string }) {
  const { data: slaItems, isLoading } = useSLATracking(companyId);

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = (slaItems || []) as any[];
  const urgentItems = items.filter(item => {
    const deadline = new Date(item.sla_deadline);
    const hoursRemaining = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursRemaining <= 24 && hoursRemaining > 0;
  });

  const overdue = items.filter(item => {
    const deadline = new Date(item.sla_deadline);
    return deadline.getTime() < Date.now();
  });

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            SLA Tracking
          </span>
          <div className="flex items-center gap-2">
            {overdue.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {overdue.length} Overdue
              </Badge>
            )}
            {urgentItems.length > 0 && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-500">
                {urgentItems.length} Urgent
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(!items || items.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>All SLAs met</p>
            <p className="text-sm">No pending deadlines</p>
          </div>
        )}

        {items.map((item: any) => {
          const deadline = new Date(item.sla_deadline);
          const totalTime = deadline.getTime() - new Date(item.created_at).getTime();
          const elapsed = Date.now() - new Date(item.created_at).getTime();
          const progress = Math.min(100, (elapsed / totalTime) * 100);
          const isOverdue = deadline.getTime() < Date.now();
          const hoursRemaining = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);

          return (
            <div 
              key={item.id}
              className={`p-4 rounded-lg border ${
                isOverdue 
                  ? 'border-destructive/40 bg-destructive/5' 
                  : hoursRemaining <= 24
                  ? 'border-yellow-500/40 bg-yellow-50/50 dark:bg-yellow-950/20'
                  : 'border-border/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="font-medium capitalize">
                    {item.event_type.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isOverdue 
                      ? `Overdue by ${formatDistanceToNow(deadline)}`
                      : `Due ${formatDistanceToNow(deadline, { addSuffix: true })}`
                    }
                  </div>
                </div>
                {isOverdue ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : hoursRemaining <= 24 ? (
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <Progress 
                value={progress} 
                className={`h-2 ${
                  isOverdue 
                    ? '[&>div]:bg-destructive' 
                    : hoursRemaining <= 24
                    ? '[&>div]:bg-yellow-600'
                    : ''
                }`}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
