import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimelineSkeleton } from "@/components/LoadingSkeletons";
import {
  Mail, Phone, Video, MessageSquare, CheckSquare, FileText,
  Target, Clock, TrendingUp, UserPlus, Eye, Activity as ActivityIcon,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  icon: any;
  iconColor: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  source: string;
  expandable?: boolean;
  expandedContent?: string;
}

// ── Config ─────────────────────────────────────────────────────────
const eventConfig: Record<string, { icon: any; color: string; label: string }> = {
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

// ── Component ──────────────────────────────────────────────────────
export function UnifiedEntityTimeline({
  entityType,
  entityId,
  title = "Activity",
  limit = 20,
}: UnifiedEntityTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(limit);

  useEffect(() => {
    loadEvents();

    // Realtime subscription
    const channel = supabase
      .channel(`unified-timeline-${entityType}-${entityId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "activity_feed",
      }, () => loadEvents())
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "activity_timeline",
      }, () => loadEvents())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [entityType, entityId]);

  const loadEvents = async () => {
    try {
      const allEvents: TimelineEvent[] = [];

      if (entityType === "candidate") {
        // Activity timeline (user-centric)
        const { data: timeline } = await supabase
          .from("activity_timeline")
          .select("*")
          .eq("user_id", entityId)
          .order("created_at", { ascending: false })
          .limit(limit);

        timeline?.forEach((t) => {
          const cfg = getEventConfig(t.activity_type);
          allEvents.push({
            id: `at-${t.id}`,
            timestamp: t.created_at,
            type: t.activity_type,
            icon: cfg.icon,
            iconColor: cfg.color,
            title: cfg.label,
            description: typeof t.activity_data === "object" && t.activity_data !== null
              ? (t.activity_data as any).description || (t.activity_data as any).job_title || undefined
              : undefined,
            metadata: t.activity_data as any,
            source: "activity_timeline",
          });
        });

        // Activity feed
        const { data: feed } = await supabase
          .from("activity_feed")
          .select("*")
          .eq("user_id", entityId)
          .order("created_at", { ascending: false })
          .limit(limit);

        feed?.forEach((f) => {
          const cfg = getEventConfig(f.event_type);
          allEvents.push({
            id: `af-${f.id}`,
            timestamp: f.created_at || "",
            type: f.event_type,
            icon: cfg.icon,
            iconColor: cfg.color,
            title: cfg.label,
            description: typeof f.event_data === "object" && f.event_data !== null
              ? (f.event_data as any).description || undefined
              : undefined,
            metadata: f.event_data as any,
            source: "activity_feed",
          });
        });
      }

      if (entityType === "company") {
        // CRM touchpoints
        const touchpointsQuery = supabase
          .from("crm_touchpoints")
          .select("*") as any;
        const { data: touchpoints } = await touchpointsQuery
          .eq("company_id", entityId)
          .order("performed_at", { ascending: false })
          .limit(limit);

        touchpoints?.forEach((tp) => {
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

        // Company activity feed
        const { data: companyFeed } = await supabase
          .from("activity_feed")
          .select("*")
          .eq("company_id", entityId)
          .order("created_at", { ascending: false })
          .limit(limit);

        companyFeed?.forEach((f) => {
          const cfg = getEventConfig(f.event_type);
          allEvents.push({
            id: `caf-${f.id}`,
            timestamp: f.created_at || "",
            type: f.event_type,
            icon: cfg.icon,
            iconColor: cfg.color,
            title: cfg.label,
            description: typeof f.event_data === "object" && f.event_data !== null
              ? (f.event_data as any).description || undefined
              : undefined,
            metadata: f.event_data as any,
            source: "activity_feed",
          });
        });
      }

      if (entityType === "job") {
        // Applications for this job as events
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

      // Deduplicate and sort chronologically
      const seen = new Set<string>();
      const unique = allEvents.filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
      unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(unique);
    } catch (err) {
      console.error("UnifiedEntityTimeline error:", err);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineSkeleton count={4} />
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
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No activity recorded yet.</p>
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
            {title}
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {events.length} events
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
                                {event.metadata.direction}
                              </Badge>
                            )}
                            {event.metadata?.sentiment && (
                              <Badge variant="outline" className="text-[10px]">
                                {event.metadata.sentiment}
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
                          via {event.source.replace(/_/g, " ")}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}

        {/* Load more */}
        {visibleCount < events.length && (
          <div className="text-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibleCount((v) => v + limit)}
              className="text-xs text-muted-foreground"
            >
              Load more ({events.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}