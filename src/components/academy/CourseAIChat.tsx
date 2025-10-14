import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CourseAIChatProps {
  courseId: string;
  courseTitle: string;
  courseDescription?: string;
}

export function CourseAIChat({ courseId, courseTitle, courseDescription }: CourseAIChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAsk = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setAnswer("");

    try {
      const { data, error } = await supabase.functions.invoke('course-ai-assistant', {
        body: {
          messages: [{ role: 'user', content: input }],
          courseContext: {
            title: courseTitle,
            description: courseDescription,
          }
        }
      });

      if (error) throw error;

      if (data) {
        setAnswer(data.response || "I couldn't generate a response. Please try again.");
        setIsExpanded(true);
      }
    } catch (error) {
      console.error('Error asking AI:', error);
      toast({
        title: "Error",
        description: "Failed to get an answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Ask anything about this course..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLoading) {
              handleAsk();
            }
          }}
          className="flex-1"
        />
        <Button 
          onClick={handleAsk} 
          disabled={isLoading || !input.trim()}
          size="icon"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isExpanded && answer && (
        <Card className="p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm leading-relaxed">
              {answer}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
