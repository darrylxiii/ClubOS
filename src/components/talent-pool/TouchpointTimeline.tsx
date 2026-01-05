import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Mail,
  Phone,
  Linkedin,
  Video,
  Users,
  Calendar,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

interface Touchpoint {
  id: string;
  touchpoint_type: string;
  subject: string | null;
  summary: string | null;
  created_at: string;
  strategist_id: string | null;
  response_sentiment: string | null;
  response_received: boolean | null;
  requires_response: boolean | null;
}

interface TouchpointTimelineProps {
  candidateId: string;
  onAddTouchpoint?: () => void;
  className?: string;
}

const touchpointIcons: Record<string, React.ElementType> = {
  email_outbound: Mail,
  email_inbound: Mail,
  call_outbound: Phone,
  call_inbound: Phone,
  call_missed: Phone,
  voicemail: Phone,
  whatsapp_outbound: MessageSquare,
  whatsapp_inbound: MessageSquare,
  linkedin_connection: Linkedin,
  linkedin_message_out: Linkedin,
  linkedin_message_in: Linkedin,
  linkedin_inmail: Linkedin,
  meeting_virtual: Video,
  meeting_in_person: Users,
  meeting_coffee: Users,
  interview_scheduled: Calendar,
  interview_completed: Calendar,
  role_presented: FileText,
  role_declined: ThumbsDown,
  role_interested: ThumbsUp,
  referral_requested: Users,
  referral_made: Users,
  note: MessageSquare,
  status_change: FileText,
};

const touchpointColors: Record<string, string> = {
  email_outbound: 'bg-blue-500/20 text-blue-400',
  email_inbound: 'bg-green-500/20 text-green-400',
  call_outbound: 'bg-purple-500/20 text-purple-400',
  call_inbound: 'bg-green-500/20 text-green-400',
  linkedin_message_out: 'bg-blue-500/20 text-blue-400',
  linkedin_message_in: 'bg-green-500/20 text-green-400',
  meeting_virtual: 'bg-orange-500/20 text-orange-400',
  meeting_in_person: 'bg-orange-500/20 text-orange-400',
  interview_scheduled: 'bg-purple-500/20 text-purple-400',
  interview_completed: 'bg-green-500/20 text-green-400',
  role_presented: 'bg-primary/20 text-primary',
  role_interested: 'bg-green-500/20 text-green-400',
  role_declined: 'bg-red-500/20 text-red-400',
};

const sentimentColors: Record<string, string> = {
  very_positive: 'bg-green-500/20 text-green-400 border-green-500/30',
  positive: 'bg-green-500/10 text-green-400 border-green-500/20',
  neutral: 'bg-muted text-muted-foreground border-border',
  negative: 'bg-red-500/10 text-red-400 border-red-500/20',
  very_negative: 'bg-red-500/20 text-red-400 border-red-500/30',
  no_response: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

function formatTouchpointType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function TouchpointTimeline({ candidateId, onAddTouchpoint, className }: TouchpointTimelineProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: touchpoints, isLoading } = useQuery({
    queryKey: ['touchpoints', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_interactions')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Map to touchpoint format
      return (data || []).map((item: any) => ({
        id: item.id,
        touchpoint_type: item.interaction_type || 'note',
        subject: item.subject,
        summary: item.notes || item.outcome,
        created_at: item.created_at,
        strategist_id: item.interviewer_id,
        response_sentiment: item.sentiment,
        response_received: null,
        requires_response: null,
      })) as Touchpoint[];
    },
    enabled: !!candidateId,
  });

  const filteredTouchpoints = touchpoints?.filter((tp) =>
    typeFilter === 'all' ? true : tp.touchpoint_type === typeFilter
  ) || [];

  const uniqueTypes = [...new Set(touchpoints?.map((tp) => tp.touchpoint_type) || [])];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Touchpoint Timeline
            {touchpoints && touchpoints.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {touchpoints.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-[130px]">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatTouchpointType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onAddTouchpoint && (
              <Button variant="outline" size="sm" onClick={onAddTouchpoint}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTouchpoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No touchpoints recorded yet</p>
            {onAddTouchpoint && (
              <Button variant="link" size="sm" onClick={onAddTouchpoint} className="mt-2">
                Log first interaction
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              {/* Timeline items */}
              <div className="space-y-4">
                {filteredTouchpoints.map((touchpoint, index) => {
                  const Icon = touchpointIcons[touchpoint.touchpoint_type] || MessageSquare;
                  const colorClass = touchpointColors[touchpoint.touchpoint_type] || 'bg-muted text-muted-foreground';

                  return (
                    <div key={touchpoint.id} className="relative flex gap-4 pl-2">
                      {/* Icon */}
                      <div className={cn(
                        'relative z-10 flex h-8 w-8 items-center justify-center rounded-full',
                        colorClass
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <p className="text-sm font-medium">
                              {formatTouchpointType(touchpoint.touchpoint_type)}
                            </p>
                            {touchpoint.subject && (
                              <p className="text-sm text-foreground mt-0.5">{touchpoint.subject}</p>
                            )}
                          </div>
                          <time className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(touchpoint.created_at), { addSuffix: true })}
                          </time>
                        </div>

                        {touchpoint.summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {touchpoint.summary}
                          </p>
                        )}

                        {/* Response status */}
                        <div className="flex items-center gap-2 mt-2">
                          {touchpoint.response_sentiment && (
                            <Badge
                              variant="outline"
                              className={cn('text-xs', sentimentColors[touchpoint.response_sentiment])}
                            >
                              {touchpoint.response_sentiment.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {touchpoint.requires_response && !touchpoint.response_received && (
                            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                              Awaiting response
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
