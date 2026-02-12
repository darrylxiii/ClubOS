import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, AlertTriangle, CheckCircle, FileText, Users } from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek, addDays } from "date-fns";
import { motion } from "framer-motion";

interface Deadline {
  id: string;
  type: 'interview' | 'sla' | 'offer' | 'application';
  title: string;
  description: string;
  deadline: Date;
  urgency: 'critical' | 'warning' | 'normal';
  actionUrl?: string;
}

export function UpcomingDeadlinesWidget({ companyId }: { companyId: string }) {
  const { data: deadlines, isLoading } = useQuery({
    queryKey: ['upcoming-deadlines', companyId],
    queryFn: async () => {
      const now = new Date();
      const weekFromNow = addDays(now, 7);
      const results: Deadline[] = [];

      // Fetch upcoming interviews
      const { data: interviews } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          scheduled_time,
          meeting_type,
          attendees:meeting_attendees(
            profile:profiles(full_name)
          )
        `)
        .eq('company_id', companyId)
        .gte('scheduled_time', now.toISOString())
        .lte('scheduled_time', weekFromNow.toISOString())
        .order('scheduled_time', { ascending: true })
        .limit(5);

      if (interviews) {
        interviews.forEach((interview: any) => {
          const scheduledTime = new Date(interview.scheduled_time);
          const hoursUntil = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          
          results.push({
            id: `interview-${interview.id}`,
            type: 'interview',
            title: interview.title || 'Interview',
            description: `${interview.meeting_type || 'Interview'} scheduled`,
            deadline: scheduledTime,
            urgency: hoursUntil <= 2 ? 'critical' : hoursUntil <= 24 ? 'warning' : 'normal',
            actionUrl: `/meetings/${interview.id}`
          });
        });
      }

      // Fetch SLA deadlines
      const { data: slas } = await supabase
        .from('partner_sla_tracking' as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('is_met', false)
        .order('measured_at', { ascending: true })
        .limit(5);

      if (slas) {
        slas.forEach((sla: any) => {
          const deadline = new Date(sla.measured_at);
          deadline.setMinutes(deadline.getMinutes() + (sla.target_value || 2880)); // Default 48h
          
          if (deadline > now && deadline <= weekFromNow) {
            const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
            
            results.push({
              id: `sla-${sla.id}`,
              type: 'sla',
              title: `Response Due: ${sla.metric_type?.replace(/_/g, ' ') || 'SLA'}`,
              description: `SLA target: ${Math.round((sla.target_value || 2880) / 60)}h`,
              deadline: deadline,
              urgency: hoursUntil <= 4 ? 'critical' : hoursUntil <= 24 ? 'warning' : 'normal',
              actionUrl: `/applications/${sla.reference_id}`
            });
          }
        });
      }

      // Sort all by deadline
      return results.sort((a, b) => a.deadline.getTime() - b.deadline.getTime()).slice(0, 8);
    },
    enabled: !!companyId,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });

  const getDeadlineIcon = (type: Deadline['type']) => {
    switch (type) {
      case 'interview': return <Users className="h-4 w-4" />;
      case 'sla': return <Clock className="h-4 w-4" />;
      case 'offer': return <FileText className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getUrgencyStyles = (urgency: Deadline['urgency']) => {
    switch (urgency) {
      case 'critical': 
        return 'border-destructive/40 bg-destructive/5 text-destructive';
      case 'warning': 
        return 'border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400';
      default: 
        return 'border-border/50 bg-muted/30 text-foreground';
    }
  };

  const formatDeadlineDate = (date: Date) => {
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
    return format(date, 'EEE, MMM d, h:mm a');
  };

  const groupDeadlines = (items: Deadline[]) => {
    const today: Deadline[] = [];
    const tomorrow: Deadline[] = [];
    const thisWeek: Deadline[] = [];

    items.forEach(item => {
      if (isToday(item.deadline)) today.push(item);
      else if (isTomorrow(item.deadline)) tomorrow.push(item);
      else if (isThisWeek(item.deadline)) thisWeek.push(item);
    });

    return { today, tomorrow, thisWeek };
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const grouped = deadlines ? groupDeadlines(deadlines) : { today: [], tomorrow: [], thisWeek: [] };
  const hasDeadlines = deadlines && deadlines.length > 0;

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            This Week's Deadlines
          </div>
          {hasDeadlines && (
            <Badge variant="outline" className="text-xs">
              {deadlines.length} items
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasDeadlines ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5"
          >
            <div className="p-2 rounded-full bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">Clear Schedule</p>
              <p className="text-sm text-muted-foreground">No urgent deadlines this week</p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {grouped.today.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-destructive">Today</span>
                </div>
                <div className="space-y-2">
                  {grouped.today.map((item, index) => (
                    <DeadlineItem key={item.id} item={item} index={index} getIcon={getDeadlineIcon} getStyles={getUrgencyStyles} formatDate={formatDeadlineDate} />
                  ))}
                </div>
              </div>
            )}

            {grouped.tomorrow.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Tomorrow</span>
                </div>
                <div className="space-y-2">
                  {grouped.tomorrow.map((item, index) => (
                    <DeadlineItem key={item.id} item={item} index={index} getIcon={getDeadlineIcon} getStyles={getUrgencyStyles} formatDate={formatDeadlineDate} />
                  ))}
                </div>
              </div>
            )}

            {grouped.thisWeek.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">This Week</span>
                </div>
                <div className="space-y-2">
                  {grouped.thisWeek.map((item, index) => (
                    <DeadlineItem key={item.id} item={item} index={index} getIcon={getDeadlineIcon} getStyles={getUrgencyStyles} formatDate={formatDeadlineDate} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeadlineItem({ 
  item, 
  index, 
  getIcon, 
  getStyles, 
  formatDate 
}: { 
  item: Deadline; 
  index: number; 
  getIcon: (type: Deadline['type']) => React.ReactNode;
  getStyles: (urgency: Deadline['urgency']) => string;
  formatDate: (date: Date) => string;
}) {
  const urgencyStyles = getStyles(item.urgency);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${urgencyStyles}`}
    >
      <div className="p-1.5 rounded-md bg-background/50">
        {getIcon(item.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground">{formatDate(item.deadline)}</p>
      </div>
      <Badge variant="outline" className="text-xs capitalize shrink-0">
        {item.type}
      </Badge>
    </motion.div>
  );
}
