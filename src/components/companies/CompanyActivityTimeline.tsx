import { useCompanyActivity, CompanyActivityEvent } from '@/hooks/useCompanyActivity';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, UserPlus, CheckCircle, Calendar, 
  FileText, Settings, Users, ArrowRight, Clock,
  Loader2, AlertTriangle, TrendingUp, Award
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CompanyActivityTimelineProps {
  companyId: string;
}

const EVENT_CONFIG: Record<string, { 
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
}> = {
  job_created: { icon: Briefcase, color: 'text-blue-500', label: 'Job Created' },
  job_published: { icon: TrendingUp, color: 'text-green-500', label: 'Job Published' },
  job_closed: { icon: CheckCircle, color: 'text-muted-foreground', label: 'Job Closed' },
  candidate_shortlisted: { icon: UserPlus, color: 'text-amber-500', label: 'Candidate Shortlisted' },
  interview_scheduled: { icon: Calendar, color: 'text-purple-500', label: 'Interview Scheduled' },
  offer_extended: { icon: FileText, color: 'text-green-500', label: 'Offer Extended' },
  hire_completed: { icon: Award, color: 'text-gold-500', label: 'Hire Completed' },
  team_member_added: { icon: Users, color: 'text-blue-500', label: 'Team Member Added' },
  settings_updated: { icon: Settings, color: 'text-muted-foreground', label: 'Settings Updated' },
};

function ActivityEventCard({ event }: { event: CompanyActivityEvent }) {
  const config = EVENT_CONFIG[event.event_type] || {
    icon: Clock,
    color: 'text-muted-foreground',
    label: event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  };
  
  const Icon = config.icon;

  return (
    <div className="flex gap-4 group">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-background border-2 ${config.color.replace('text-', 'border-')}`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-1 w-px bg-border group-last:hidden" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {config.label}
              </Badge>
              {event.target_name && (
                <span className="font-medium text-sm">{event.target_name}</span>
              )}
            </div>
            
            {event.actor_name && (
              <p className="text-sm text-muted-foreground">
                by {event.actor_name}
              </p>
            )}

            {event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata) && (
              <div className="text-xs text-muted-foreground mt-1">
                {(event.metadata as Record<string, any>).status && (
                  <span className="inline-flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    Status: {(event.metadata as Record<string, any>).status}
                  </span>
                )}
                {(event.metadata as Record<string, any>).old_status && (
                  <span className="inline-flex items-center gap-1">
                    {(event.metadata as Record<string, any>).old_status} <ArrowRight className="h-3 w-3" /> Published
                  </span>
                )}
              </div>
            )}
          </div>

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CompanyActivityTimeline({ companyId }: CompanyActivityTimelineProps) {
  const { events, isLoading, error, hasMore, loadMore } = useCompanyActivity({ 
    companyId,
    limit: 20
  });

  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No activity yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Activity will appear here as your team creates jobs and manages candidates
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event) => (
        <ActivityEventCard key={event.id} event={event} />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
