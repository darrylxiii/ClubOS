import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Clock, CheckCircle, Calendar, Phone, Mail, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, isToday, isPast, format } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { CRMActivity } from '@/types/crm-activities';

const activityIcons: Record<string, typeof Clock> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckCircle,
  follow_up: Clock,
};

export function CRMActivityReminderBell() {
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadUpcomingActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('crm-activity-reminders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_activities',
        },
        () => {
          loadUpcomingActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUpcomingActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const todayStr = now.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('crm_activities')
        .select(`
          *,
          prospect:crm_prospects(full_name, company_name)
        `)
        .eq('owner_id', user.id)
        .eq('is_done', false)
        .lte('due_date', todayStr)
        .order('due_date', { ascending: true })
        .order('due_time', { ascending: true })
        .limit(10);

      if (error) throw error;

      const mapped = (data || []).map((a: any) => ({
        ...a,
        prospect_name: a.prospect?.full_name,
        prospect_company: a.prospect?.company_name,
      }));

      setActivities(mapped);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const overdueCount = activities.filter(a => 
    a.due_date && isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date))
  ).length;

  const todayCount = activities.filter(a => 
    a.due_date && isToday(new Date(a.due_date))
  ).length;

  const totalCount = overdueCount + todayCount;

  const markAsDone = async (activityId: string) => {
    try {
      await supabase
        .from('crm_activities')
        .update({ 
          is_done: true, 
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activityId);

      setActivities(prev => prev.filter(a => a.id !== activityId));
    } catch (err) {
      console.error('Error marking activity as done:', err);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {totalCount > 0 && (
            <Badge 
              variant={overdueCount > 0 ? "destructive" : "default"}
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border/30">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Activity Reminders
          </h3>
          <p className="text-xs text-muted-foreground">
            {overdueCount > 0 && (
              <span className="text-destructive">{overdueCount} overdue • </span>
            )}
            {todayCount} due today
          </p>
        </div>

        <ScrollArea className="max-h-80">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : activities.length > 0 ? (
            <div className="divide-y divide-border/30">
              {activities.map((activity) => {
                const Icon = activityIcons[activity.activity_type] || Clock;
                const isOverdue = activity.due_date && isPast(new Date(activity.due_date)) && !isToday(new Date(activity.due_date));
                const isDueToday = activity.due_date && isToday(new Date(activity.due_date));

                return (
                  <div 
                    key={activity.id} 
                    className={cn(
                      "p-3 hover:bg-muted/30 transition-colors",
                      isOverdue && "bg-destructive/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        isOverdue ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.subject}</p>
                        {activity.prospect_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {activity.prospect_name}
                            {activity.prospect_company && ` • ${activity.prospect_company}`}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {isOverdue && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                          {isDueToday && !isOverdue && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Due today
                            </Badge>
                          )}
                          {activity.due_date && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(activity.due_date), 'h:mm a')}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 shrink-0"
                        onClick={() => markAsDone(activity.id)}
                      >
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">All caught up!</p>
              <p className="text-xs">No pending activities</p>
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t border-border/30">
          <Link to="/crm/focus" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full text-sm">
              View All Activities
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
