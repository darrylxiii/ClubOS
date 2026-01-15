import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityFeed } from "@/hooks/useActivityLogging";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Activity, 
  UserPlus, 
  CheckCircle2, 
  XCircle,
  Clock,
  Download
} from "lucide-react";
import { useState } from "react";

interface ActivityFeedProps {
  userId?: string;
  limit?: number;
}

export function ActivityFeed({ userId, limit = 50 }: ActivityFeedProps) {
  const { data: feed, isLoading } = useActivityFeed(userId, limit);
  const [filter, setFilter] = useState<string>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hired': return 'bg-green-500/10 text-green-500';
      case 'rejected': return 'bg-red-500/10 text-red-500';
      case 'interviewing': return 'bg-blue-500/10 text-blue-500';
      case 'screening': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'hired': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredFeed = feed?.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const exportToCSV = () => {
    if (!filteredFeed?.length) return;
    
    const csv = [
      ['Title', 'Status', 'Type', 'Timestamp'].join(','),
      ...filteredFeed.map(item => 
        [item.title, item.status, item.type, item.timestamp].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-feed-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Activity Feed
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs bg-muted rounded px-2 py-1"
            >
              <option value="all">All</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
              <option value="interviewing">Interviewing</option>
              <option value="screening">Screening</option>
            </select>
            <Button variant="ghost" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!filteredFeed?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No activity yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {filteredFeed.map((item) => (
              <div 
                key={item.id}
                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-full bg-primary/10">
                  {item.type === 'application' ? (
                    <UserPlus className="h-4 w-4 text-primary" />
                  ) : (
                    getStatusIcon(item.status)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className={`text-xs ${getStatusColor(item.status)}`}>
                      {item.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
