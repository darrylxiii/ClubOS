import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Calendar, CheckCircle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
    from_name: string;
  };
}

export function NeedsAttentionWidget() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
      toast({ title: "Follow-up dismissed" });
    }
  }

  async function completeFollowUp(id: string) {
    const { error } = await supabase
      .from("email_follow_ups")
      .update({ status: "completed" })
      .eq("id", id);

    if (!error) {
      setFollowUps(followUps.filter(f => f.id !== id));
      toast({ title: "Follow-up completed" });
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
    <Card className="p-4 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-background">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold">Needs Attention</h3>
        <Badge variant="secondary" className="text-xs">{followUps.length + meetings.length}</Badge>
      </div>

      <div className="space-y-2">
        {followUps.map((followUp) => {
          const Icon = getFollowUpIcon(followUp.follow_up_type);
          return (
            <div key={followUp.id} className="group flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors">
              <div className={`p-1.5 rounded-full ${getFollowUpColor(followUp.follow_up_type)}`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{followUp.emails.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {followUp.emails.from_name} · {formatDistanceToNow(new Date(followUp.follow_up_date), { addSuffix: true })}
                </p>
                {followUp.metadata?.reason && (
                  <p className="text-xs text-muted-foreground italic mt-1">{followUp.metadata.reason}</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => completeFollowUp(followUp.id)}
                  className="h-6 w-6 p-0"
                >
                  <CheckCircle className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dismissFollowUp(followUp.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}

        {meetings.map((meeting) => (
          <div key={meeting.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors">
            <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-500">
              <Calendar className="h-3 w-3" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{meeting.meeting_title || meeting.emails.subject}</p>
              <p className="text-xs text-muted-foreground">
                {meeting.emails.from_name} · {formatDistanceToNow(new Date(meeting.meeting_date), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
