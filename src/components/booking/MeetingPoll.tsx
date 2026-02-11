import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Users, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimeOption {
  id: string;
  date: string;
  time: string;
  votes: number;
  voters: string[];
}

interface MeetingPollProps {
  pollId: string;
  bookingLinkId: string;
  voterName?: string;
  onVoteSubmitted?: () => void;
}

export function MeetingPoll({ pollId, bookingLinkId, voterName, onVoteSubmitted }: MeetingPollProps) {
  const [poll, setPoll] = useState<any>(null);
  const [timeOptions, setTimeOptions] = useState<TimeOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    loadPoll();
  }, [pollId]);

  const loadPoll = async () => {
    try {
      const { data: pollData, error: pollError } = await supabase
        .from("meeting_polls")
        .select("*")
        .eq("id", pollId)
        .single();

      if (pollError) throw pollError;

      setPoll(pollData);

      const { data: optionsData, error: optionsError } = await supabase
        .from("meeting_poll_options" as any)
        .select("*")
        .eq("poll_id", pollId)
        .order("date", { ascending: true });

      if (optionsError) throw optionsError;

      setTimeOptions((optionsData as any) || []);
    } catch (error: unknown) {
      console.error("Error loading poll:", error);
      toast.error("Failed to load meeting poll");
    } finally {
      setLoading(false);
    }
  };

  const toggleOption = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  };

  const submitVotes = async () => {
    if (selectedOptions.length === 0) {
      toast.error("Please select at least one time option");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-poll-votes", {
        body: {
          pollId,
          optionIds: selectedOptions,
          voterName: voterName || "Anonymous",
        },
      });

      if (error) throw error;

      toast.success("Your votes have been submitted!");
      setHasVoted(true);
      loadPoll(); // Reload to see updated vote counts
      onVoteSubmitted?.();
    } catch (error: unknown) {
      console.error("Error submitting votes:", error);
      toast.error("Failed to submit votes");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (!poll) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Poll not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {poll.title}
        </CardTitle>
        <CardDescription>{poll.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasVoted ? (
          <div className="text-center py-8">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Thank you for voting!</h3>
            <p className="text-muted-foreground">
              We'll notify you once the meeting time is finalized.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {timeOptions.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toggleOption(option.id)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedOptions.includes(option.id)}
                      onCheckedChange={() => toggleOption(option.id)}
                    />
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(option.date + "T" + option.time).toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {option.votes} {option.votes === 1 ? "vote" : "votes"}
                  </Badge>
                </div>
              ))}
            </div>
            <Button onClick={submitVotes} disabled={submitting || selectedOptions.length === 0} className="w-full">
              {submitting ? "Submitting..." : `Submit ${selectedOptions.length} ${selectedOptions.length === 1 ? "vote" : "votes"}`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
