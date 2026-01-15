import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Calendar, CheckCircle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { notify } from "@/lib/notify";

interface FollowUp {
  id: string;
  email_id: string;
  follow_up_type: string;
  follow_up_date: string;
  metadata: any;
  emails: {
    subject: string;
    from_name: string;
    from_email: string;
  };
}

interface Meeting {
  id: string;
  email_id: string;
  meeting_title: string;
  meeting_date: string;
  status: string;
  emails: {
    subject: string;
    from_name: string | null;
  };
}

export function NeedsAttentionWidget() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttentionItems();
  }, []);

  async function loadAttentionItems() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load pending follow-ups
      const { data: followUpData } = await supabase
        .from("email_follow_ups")
        .select("*, emails(subject, from_name, from_email)")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .lte("follow_up_date", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()) // Due within 24h
        .order("follow_up_date", { ascending: true })
        .limit(5);

      // Load pending meetings
      const { data: meetingData } = await supabase
        .from("email_meetings")
        .select("*, emails(subject, from_name)")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("meeting_date", { ascending: true })
        .limit(5);

      setFollowUps(followUpData || []);
      setMeetings(meetingData || []);
    } catch (error) {
      console.error("Error loading attention items:", error);
    } finally {
      setLoading(false);
    }
  }

  async function dismissFollowUp(id: string) {
    const { error } = await supabase
      .from("email_follow_ups")
      .update({ status: "dismissed" })
      .eq("id", id);

    if (!error) {
      setFollowUps(followUps.filter(f => f.id !== id));
      notify.success("Follow-up dismissed");
    }
  }

  async function completeFollowUp(id: string) {
    const { error } = await supabase
      .from("email_follow_ups")
      .update({ status: "completed" })
      .eq("id", id);

    if (!error) {
      setFollowUps(followUps.filter(f => f.id !== id));
      notify.success("Follow-up completed");
    }
  }

  const getFollowUpIcon = (type: string) => {
    switch (type) {
      case "no_reply": return Clock;
      case "meeting_request": return Calendar;
      case "deadline": return AlertCircle;
      default: return AlertCircle;
    }
  };

  const getFollowUpColor = (type: string) => {
    switch (type) {
      case "no_reply": return "bg-yellow-500/10 text-yellow-500";
      case "meeting_request": return "bg-blue-500/10 text-blue-500";
      case "deadline": return "bg-red-500/10 text-red-500";
      default: return "bg-primary/10 text-primary";
    }
  };

  if (loading) return null;
  if (followUps.length === 0 && meetings.length === 0) return null;

  return (
    <Card className="p-2 sm:p-3 border-border bg-gradient-to-br from-accent/30 to-background overflow-hidden max-w-full">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 flex-shrink-0" />
        <h3 className="text-xs sm:text-sm font-semibold truncate">Needs Attention</h3>
        <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">
          {followUps.length + meetings.length}
        </Badge>
      </div>

      <div className="space-y-1">
        {followUps.map((followUp) => {
          const Icon = getFollowUpIcon(followUp.follow_up_type);
          return (
            <div key={followUp.id} className="group flex items-start gap-1.5 sm:gap-2 p-1.5 rounded-lg hover:bg-accent/50 transition-colors overflow-hidden">
              <div className={`p-1 sm:p-1.5 rounded-full ${getFollowUpColor(followUp.follow_up_type)} flex-shrink-0`}>
                <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium line-clamp-2">{followUp.emails.subject}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                  {followUp.emails.from_name} · {formatDistanceToNow(new Date(followUp.follow_up_date), { addSuffix: true })}
                </p>
                {followUp.metadata?.reason && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground italic mt-0.5 sm:mt-1 line-clamp-2">
                    {followUp.metadata.reason}
                  </p>
                )}
              </div>
              <div className="flex gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => completeFollowUp(followUp.id)}
                  className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                >
                  <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dismissFollowUp(followUp.id)}
                  className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                >
                  <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Button>
              </div>
            </div>
          );
        })}

        {meetings.map((meeting) => (
          <div key={meeting.id} className="flex items-start gap-1.5 sm:gap-2 p-1.5 rounded-lg hover:bg-accent/50 transition-colors overflow-hidden">
            <div className="p-1 sm:p-1.5 rounded-full bg-blue-500/10 text-blue-500 flex-shrink-0">
              <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium line-clamp-2">{meeting.meeting_title || meeting.emails.subject}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                {meeting.emails.from_name} · {formatDistanceToNow(new Date(meeting.meeting_date), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
