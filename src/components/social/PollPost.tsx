import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface PollPostProps {
  postId: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVote?: string;
  endsAt: string;
  onVote?: () => void;
}

export const PollPost = ({
  postId,
  question,
  options,
  totalVotes,
  userVote,
  endsAt,
  onVote,
}: PollPostProps) => {
  const [selectedOption, setSelectedOption] = useState<string | undefined>(userVote);
  const [hasVoted, setHasVoted] = useState(!!userVote);
  const pollEnded = new Date(endsAt) < new Date();

  const handleVote = async (optionId: string) => {
    if (hasVoted || pollEnded) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to vote");
        return;
      }

      // Get current poll votes
      const { data: post } = await supabase
        .from("unified_posts")
        .select("poll_votes")
        .eq("id", postId)
        .single();

      const currentVotes = (post?.poll_votes as Record<string, string>) || {};
      const newVotes = {
        ...currentVotes,
        [user.id]: optionId,
      };

      await supabase
        .from("unified_posts")
        .update({ poll_votes: newVotes })
        .eq("id", postId);

      setSelectedOption(optionId);
      setHasVoted(true);
      onVote?.();
      toast.success("Vote recorded!");
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Failed to record vote");
    }
  };

  const getPercentage = (votes: number) => {
    return totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm">
      <h3 className="text-lg font-semibold mb-4">{question}</h3>
      <div className="space-y-3">
        {options.map((option) => {
          const percentage = getPercentage(option.votes);
          const isSelected = selectedOption === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={hasVoted || pollEnded}
              className="w-full text-left disabled:cursor-not-allowed group"
            >
              <div
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 bg-card/50"
                } ${hasVoted || pollEnded ? "" : "group-hover:shadow-lg"}`}
              >
                {(hasVoted || pollEnded) && (
                  <Progress
                    value={percentage}
                    className="absolute inset-0 h-full opacity-20"
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    <span className="font-medium">{option.text}</span>
                  </div>
                  {(hasVoted || pollEnded) && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {option.votes} votes
                      </span>
                      <span className="text-lg font-bold">{percentage}%</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>{totalVotes.toLocaleString()} total votes</span>
        <span>
          {pollEnded ? "Poll ended" : `Ends ${new Date(endsAt).toLocaleDateString()}`}
        </span>
      </div>
    </Card>
  );
};
