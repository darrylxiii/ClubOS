import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface PollPostProps {
  pollId: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  onVote: () => void;
}

export function PollPost({ pollId, question, options, totalVotes, onVote }: PollPostProps) {
  const { user } = useAuth();
  const [voted, setVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    checkIfVoted();
  }, [pollId, user]);

  const checkIfVoted = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('poll_votes')
      .select('option_id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id)
      .single();

    if (data) {
      setVoted(true);
      setSelectedOption(data.option_id);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!user || voted) return;

    try {
      const { error } = await supabase.from('poll_votes').insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: user.id
      });

      if (error) throw error;

      setVoted(true);
      setSelectedOption(optionId);
      toast({ title: "Vote recorded!" });
      onVote();
    } catch (error) {
      toast({ title: "Failed to vote", variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-medium">{question}</h3>
      <div className="space-y-2">
        {options.map((option) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          const isSelected = selectedOption === option.id;

          return (
            <div
              key={option.id}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                voted
                  ? isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-muted'
                  : 'border-muted hover:border-primary cursor-pointer'
              }`}
              onClick={() => !voted && handleVote(option.id)}
            >
              {voted && (
                <Progress 
                  value={percentage} 
                  className="absolute inset-0 h-full opacity-20 rounded-lg"
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className={`${isSelected ? 'font-medium' : ''}`}>
                  {option.text}
                </span>
                <div className="flex items-center gap-2">
                  {voted && (
                    <span className="text-sm text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {voted && (
        <p className="text-sm text-muted-foreground text-center">
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </p>
      )}
    </Card>
  );
}

// Poll Creator Component
export function CreatePoll({ onPollCreated }: { onPollCreated: (pollData: any) => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, ""]);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleCreate = () => {
    if (!question.trim() || options.some(o => !o.trim())) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    onPollCreated({
      question,
      options: options.map(text => ({ text, votes: 0 }))
    });

    setQuestion("");
    setOptions(["", ""]);
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <Input
        placeholder="Ask a question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      {options.map((option, index) => (
        <div key={index} className="flex gap-2">
          <Input
            placeholder={`Option ${index + 1}`}
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
          />
          {options.length > 2 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeOption(index)}
            >
              Remove
            </Button>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        {options.length < 4 && (
          <Button variant="outline" size="sm" onClick={addOption}>
            Add Option
          </Button>
        )}
        <Button size="sm" onClick={handleCreate}>
          Create Poll
        </Button>
      </div>
    </div>
  );
}
