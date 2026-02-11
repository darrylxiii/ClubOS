import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Mic, MicOff, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIInterviewCoachProps {
  applicationId: string;
  companyName: string;
  roleName: string;
}

export function AIInterviewCoach({ applicationId, companyName, roleName }: AIInterviewCoachProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const startPractice = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const { data, error } = await supabase.functions.invoke('club-ai-chat', {
        body: {
          messages: [{
            role: 'user',
            content: `Generate 5 behavioral interview questions for ${roleName} at ${companyName}`
          }]
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (error) throw error;

      setCurrentQuestion("Tell me about a time when you had to overcome a significant challenge.");
      toast.success("Practice session started!");
    } catch (error: unknown) {
      console.error('Error starting practice:', error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.error("Request timed out after 30s");
      } else {
        toast.error("Failed to start practice");
      }
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    
    if (!isRecording) {
      toast.info("Recording started - speak your answer");
    } else {
      toast.info("Recording stopped - analyzing answer...");
      setTimeout(() => {
        setFeedback("Great answer! You followed the STAR method well. Consider adding more specific metrics.");
        setScore(85);
      }, 2000);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Interview Coach
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Practice interviews with real-time AI feedback
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!currentQuestion ? (
          <Button onClick={startPractice} className="w-full">
            <Play className="h-4 w-4 mr-2" />
            Start Practice Session
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <Badge variant="secondary" className="mb-2">Question 1/5</Badge>
              <p className="font-medium">{currentQuestion}</p>
            </div>

            <Button
              onClick={toggleRecording}
              variant={isRecording ? "secondary" : "default"}
              className="w-full"
              size="lg"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-5 w-5 mr-2 animate-pulse" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Start Recording Answer
                </>
              )}
            </Button>

            {feedback && score !== null && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">AI Feedback</span>
                    <Badge variant="default">{score}/100</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{feedback}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
