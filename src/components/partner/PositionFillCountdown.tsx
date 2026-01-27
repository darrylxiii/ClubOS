import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle, CheckCircle2, Timer } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface OpenPosition {
  id: string;
  title: string;
  created_at: string;
  target_fill_date: string | null;
  applications_count: number;
}

export function PositionFillCountdown({ companyId }: { companyId: string }) {
  const { data: positions, isLoading } = useQuery({
    queryKey: ['open-positions-countdown', companyId],
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          created_at,
          applications!inner(id)
        `)
        .eq('company_id', companyId)
        .eq('status', 'published')
        .order('created_at', { ascending: true })
        .limit(5);

      if (error) throw error;

      return (jobs || []).map(job => ({
        id: job.id,
        title: job.title,
        created_at: job.created_at,
        target_fill_date: null, // Could be added as a column later
        applications_count: Array.isArray(job.applications) ? job.applications.length : 0
      })) as OpenPosition[];
    }
  });

  const getUrgencyLevel = (daysOpen: number) => {
    if (daysOpen > 60) return { level: 'critical', color: 'text-destructive', bg: 'bg-destructive/10' };
    if (daysOpen > 30) return { level: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-500/10' };
    return { level: 'normal', color: 'text-green-600', bg: 'bg-green-500/10' };
  };

  const getProgressPercent = (daysOpen: number, targetDays: number = 45) => {
    return Math.min((daysOpen / targetDays) * 100, 100);
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4 text-primary" />
            Position Fill Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4 text-primary" />
            Position Fill Tracker
          </div>
          <Badge variant="outline">
            {positions?.length || 0} Open
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!positions || positions.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-500/40" />
            <p className="text-sm text-muted-foreground">
              All positions filled! Great work.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((position, index) => {
              const daysOpen = differenceInDays(new Date(), new Date(position.created_at));
              const urgency = getUrgencyLevel(daysOpen);
              const progress = getProgressPercent(daysOpen);

              return (
                <motion.div
                  key={position.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-2"
                >
                  <Link 
                    to={`/company-jobs/${position.id}`}
                    className="block p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium truncate flex-1">
                        {position.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`${urgency.bg} ${urgency.color} border-0 text-xs`}
                        >
                          {urgency.level === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {urgency.level === 'warning' && <Clock className="h-3 w-3 mr-1" />}
                          {daysOpen} days
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Progress 
                        value={progress} 
                        className={`h-1.5 ${
                          urgency.level === 'critical' ? '[&>div]:bg-destructive' :
                          urgency.level === 'warning' ? '[&>div]:bg-yellow-500' :
                          '[&>div]:bg-green-500'
                        }`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Posted {format(new Date(position.created_at), 'MMM d')}</span>
                        <span>{position.applications_count} applicant{position.applications_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}