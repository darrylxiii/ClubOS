import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimelineSkeleton } from "@/components/LoadingSkeletons";
import {
  Mail, Phone, Video, MessageSquare, CheckSquare, FileText,
  Target, Clock, TrendingUp, UserPlus, Eye, Activity as ActivityIcon,
  ChevronDown, AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect } from "react";
import { useTranslation } from 'react-i18next';

// ── Types ──────────────────────────────────────────────────────────
interface UnifiedEntityTimelineProps {
  entityType: "candidate" | "company" | "job";
  entityId: string;
  title?: string;
  limit?: number;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: string;
  icon: LucideIcon;
  iconColor: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  source: string;
  expandable?: boolean;
  expandedContent?: string;
}

// ── Config ─────────────────────────────────────────────────────────
const eventConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  email: { icon: Mail, color: "text-blue-500", label: "Email" },
  call: { icon: Phone, color: "text-emerald-500", label: "Call" },
  meeting: { icon: Video, color: "text-purple-500", label: "Meeting" },
  message: { icon: MessageSquare, color: "text-amber-500", label: "Message" },
  task: { icon: CheckSquare, color: "text-yellow-500", label: "Task" },
  note: { icon: FileText, color: "text-muted-foreground", label: "Note" },
  application_submitted: { icon: FileText, color: "text-primary", label: "Applied" },
  application_status_changed: { icon: TrendingUp, color: "text-emerald-500", label: "Status Update" },
  profile_viewed: { icon: Eye, color: "text-primary", label: "Profile Viewed" },
  match_created: { icon: Target, color: "text-emerald-500", label: "Job Match" },
  profile_updated: { icon: UserPlus, color: "text-primary", label: "Profile Update" },
  interview_scheduled: { icon: Video, color: "text-purple-500", label: "Interview" },
  referral_sent: { icon: UserPlus, color: "text-primary", label: "Referral" },
  other: { icon: ActivityIcon, color: "text-muted-foreground", label: "Activity" },
};

function getEventConfig(type: string) {
  return eventConfig[type] || eventConfig.other;
}

function formatDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

// ── Data fetching ──────────────────────────────────────────────────
async function fetchTimelineEvents(
  entityType: string,
  entityId: string,
  limit: number
): Promise<TimelineEvent[]> {
  const allEvents: TimelineEvent[] = [];

  const mapActivityData = (data: Record<string, unknown> | null): string | undefined => {
    if (!data || typeof data !== "object") return undefined;
    return (data as Record<string, string>).description ||
      (data as Record<string, string>).job_title ||
      undefined;
  };

  if (entityType === "candidate") {
    const [timelineRes, feedRes, meetingsRes] = await Promise.all([
      supabase
        .from("activity_timeline")
        .select("*")
        .eq("user_id", entityId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("activity_feed")
        .select("*")
        .eq("user_id", entityId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("meeting_participants")
        .select("meeting_id, meetings(id, title, scheduled_start, status)")
        .eq("user_id", entityId)
        .limit(limit),
    ]);

    timelineRes.data?.forEach((t) => {
      const cfg = getEventConfig(t.activity_type);
      allEvents.push({
        id: `at-${t.id}`,
        timestamp: t.created_at || "",
        type: t.activity_type,
        icon: cfg.icon,
        iconColor: cfg.color,
        title: cfg.label,
        description: mapActivityData(t.activity_data as Record<string, unknown>),
        metadata: (t.activity_data as Record<string, unknown>) || undefined,
        source: "activity_timeline",
      });
    });

    feedRes.data?.forEach((f) => {
      const cfg = getEventConfig(f.event_type);
      allEvents.push({
        id: `af-${f.id}`,
        timestamp: f.created_at || "",
        type: f.event_type,
        icon: cfg.icon,
        iconColor: cfg.color,
        title: cfg.label,
        description: mapActivityData(f.event_data as Record<string, unknown>),
        metadata: (f.event_data as Record<string, unknown>) || undefined,
        source: "activity_feed",
      });
    });

    meetingsRes.data?.forEach((mp) => {
      const m = mp.meetings as unknown as { id: string; title: string; scheduled_start: string; status: string } | null;
      if (!m) return;
      allEvents.push({
        id: `mtg-${m.id}`,
        timestamp: m.scheduled_start || "",
        type: "meeting",
        icon: Video,
        iconColor: "text-purple-500",
        title: m.title || "Meeting",
        description: `Status: ${m.status}`,
        metadata: { meetingId: m.id, status: m.status },
        source: "meetings",
      });
    });
  }

  if (entityType === "company") {
    const [touchpointsRes, companyFeedRes] = await Promise.all([
      supabase
        .from("crm_touchpoints")
        .select("*")
        .eq("prospect_id", entityId)
        .order("performed_at", { ascending: false })
        .limit(limit),
      supabase
        .from("activity_feed")
        .select("*")
        .eq("company_id", entityId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    touchpointsRes.data?.forEach((tp) => {
      const cfg = getEventConfig(tp.touchpoint_type || "other");
      allEvents.push({
        id: `tp-${tp.id}`,
        timestamp: tp.performed_at,
        type: tp.touchpoint_type || "other",
        icon: cfg.icon,
        iconColor: cfg.color,
        title: tp.subject || cfg.label,
        description: tp.content_preview || undefined,
        expandable: !!tp.content_preview && tp.content_preview.length > 100,
        expandedContent: tp.content_preview || undefined,
        metadata: { direction: tp.direction, sentiment: tp.sentiment },
        source: "crm_touchpoints",
      });
    });

    companyFeedRes.data?.forEach((f) => {
      const cfg = getEventConfig(f.event_type);
      allEvents.push({
        id: `caf-${f.id}`,
        timestamp: f.created_at || "",
        type: f.event_type,
        icon: cfg.icon,
        iconColor: cfg.color,
        title: cfg.label,
        description: mapActivityData(f.event_data as Record<string, unknown>),
        metadata: (f.event_data as Record<string, unknown>) || undefined,
        source: "activity_feed",
      });
    });
  }

  if (entityType === "job") {
    const { data: apps } = await supabase
      .from("applications")
      .select("id, status, created_at, updated_at")
      .eq("job_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);

    apps?.forEach((a) => {
      allEvents.push({
        id: `app-${a.id}`,
        timestamp: a.created_at || "",
        type: "application_submitted",
        icon: FileText,
        iconColor: "text-primary",
        title: "Application received",
        description: `Status: ${a.status}`,
        metadata: { applicationId: a.id, status: a.status },
        source: "applications",
      });
    });
  }

  // Deduplicate and sort
  const seen = new Set<string>();
  const unique = allEvents.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
  unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return unique;
}

// ── Component ──────────────────────────────────────────────────────
export function UnifiedEntityTimeline({
  entityType,
  entityId,
  title,
  limit = 20,
}: UnifiedEntityTimelineProps) {
  const { t } = useTranslation('common');
  const displayTitle = title || t('timelineSection.activity', 'Activity');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(limit);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ["entity-timeline", entityType, entityId],
    queryFn: () => fetchTimelineEvents(entityType, entityId, 100),
    enabled: !!entityId,
    staleTime: 2 * 60 * 1000,
  });

  // Realtime subscription filtered by entity
  useEffect(() => {
    if (!entityId) return;

    const filterCol = entityType === "candidate" ? "user_id" : "company_id";
    const channel = supabase
      .channel(`unified-timeline-${entityType}-${entityId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "activity_feed",
        filter: `${filterCol}=eq.${entityId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["entity-timeline", entityType, entityId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [entityType, entityId, queryClient]);

  // Group by date
  const groupedEvents = useMemo(() => {
    const visible = events.slice(0, visibleCount);
    const groups: { label: string; events: TimelineEvent[] }[] = [];
    let currentGroup: { label: string; events: TimelineEvent[] } | null = null;

    visible.forEach((e) => {
      const label = formatDateGroup(e.timestamp);
      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, events: [] };
        groups.push(currentGroup);
      }
      currentGroup.events.push(e);
    });

    return groups;
  }, [events, visibleCount]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineSkeleton count={4} />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive opacity-50" />
            <p className="text-muted-foreground">{t('timelineSection.failedToLoad', 'Failed to load activity timeline.')}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["entity-timeline", entityType, entityId] })}
            >
              {t('timelineSection.retry', 'Retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">{t('timelineSection.noActivity', 'No activity recorded yet.')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground" />
            {displayTitle}
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {t('timelineSection.eventCount', '{{count}} events', { count: events.length })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {groupedEvents.map((group) => (
          <div key={group.label} className="space-y-3">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
              {group.label}
            </h4>
            <div className="space-y-2 pl-4 border-l-2 border-border/30">
              <AnimatePresence initial={false}>
                {group.events.map((event) => {
                  const Icon = event.icon;
                  const isExpanded = expandedIds.has(event.id);

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative -ml-[9px] pl-6 group"
                    >
                      <div className={cn(
                        "absolute left-0 top-3 w-4 h-4 rounded-full bg-background border-2 border-border flex items-center justify-center",
                        event.iconColor
                      )}>
                        <Icon className="w-2 h-2" />
                      </div>

                      <div
                        className={cn(
                          "border border-border/30 rounded-lg p-3 hover:bg-background/40 transition-all",
                          event.expandable && "cursor-pointer"
                        )}
                        onClick={() => event.expandable && toggleExpand(event.id)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-[10px]">
                              {getEventConfig(event.type).label}
                            </Badge>
                            {event.metadata?.direction && (
                              <Badge variant="outline" className="text-[10px]">
                                {String(event.metadata.direction)}
                              </Badge>
                            )}
                            {event.metadata?.sentiment && (
                              <Badge variant="outline" className="text-[10px]">
                                {String(event.metadata.sentiment)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                            </span>
                            {event.expandable && (
                              <ChevronDown className={cn(
                                "h-3 w-3 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180"
                              )} />
                            )}
                          </div>
                        </div>

                        <p className="text-sm font-medium">{event.title}</p>

                        {event.description && (
                          <p className={cn(
                            "text-xs text-muted-foreground mt-1",
                            !isExpanded && "line-clamp-2"
                          )}>
                            {isExpanded ? event.expandedContent || event.description : event.description}
                          </p>
                        )}

                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {t('timelineSection.via', 'via {{source}}', { source: event.source.replace(/_/g, " ") })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}

        {visibleCount < events.length && (
          <div className="text-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibleCount((v) => v + limit)}
              className="text-xs text-muted-foreground"
            >
              {t('timelineSection.loadMore', 'Load more ({{count}} remaining)', { count: events.length - visibleCount })}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
