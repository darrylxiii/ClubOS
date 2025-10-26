import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, X, Sparkles, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";

interface CourseAIChatProps {
  courseId: string;
}

export function CourseAIChat({ courseId }: CourseAIChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAsk = async () => {
    if (!input.trim()) return;

    // Guest users: allow 1 demo message only
    if (!user) {
      if (guestMessageCount >= 1) {
        setShowAuthPrompt(true);
        return;
      }
      setGuestMessageCount(prev => prev + 1);
    }

    setIsLoading(true);
    setAnswer("");

    try {
      const { data, error } = await supabase.functions.invoke('course-ai-assistant', {
        body: {
          messages: [{ role: 'user', content: input }],
          courseId: courseId
        }
      });

      if (error) throw error;

      if (data) {
        setAnswer(data.response || "I couldn't generate a response. Please try again.");
        setIsExpanded(true);
        
        // Show auth prompt after guest's first AI response
        if (!user && guestMessageCount === 1) {
          setTimeout(() => setShowAuthPrompt(true), 2000);
        }
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
    <div className="space-y-3 relative">
      <div className="flex gap-2 items-center">
        <Input
          placeholder={!user && guestMessageCount >= 1 ? "Sign in to continue..." : "Ask anything about this course..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLoading && (user || guestMessageCount < 1)) {
              handleAsk();
            }
          }}
          className="flex-1"
          disabled={isLoading || (!user && guestMessageCount >= 1)}
        />
        {!user && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Demo: {guestMessageCount}/1
          </span>
        )}
        <Button 
          onClick={handleAsk} 
          disabled={isLoading || !input.trim() || (!user && guestMessageCount >= 1)}
          size="icon"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (!user && guestMessageCount >= 1) ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isExpanded && answer && (
        <Card className="p-4 animate-in fade-in slide-in-from-top-2 duration-300 relative">
          <div className="flex items-start gap-3">
            <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert pr-4">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
            </ScrollArea>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Auth Prompt Overlay - Option C */}
          {showAuthPrompt && !user && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 rounded-lg">
              <div className="text-center max-w-sm">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary" />
                <h4 className="text-lg font-semibold mb-2">Sign in to continue</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Unlock unlimited AI questions and full course access
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => navigate('/auth')} size="sm" className="w-full">
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => setShowAuthPrompt(false)} 
                    variant="ghost" 
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
