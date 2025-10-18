import { useState, useEffect, useRef } from "react";
import { useElevenLabsConversation } from "@/hooks/useElevenLabsConversation";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Mic, MicOff, AlertCircle, CheckCircle2, Building2, Briefcase, Target, Trophy, Clock, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ScoringResult {
  overallScore: number;
  relevanceScore: number;
  clarityScore: number;
  confidenceScore: number;
  technicalScore: number;
  starMethodScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

const InterviewPrep = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [interviewDuration, setInterviewDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const timerRef = useRef<NodeJS.Timeout>();

  const conversation = useElevenLabsConversation({
    onConnect: () => {
      console.log("Voice conversation connected");
      setIsConnecting(false);
      toast.success("Voice interview ready! Start speaking.");
    },
    onDisconnect: () => {
      console.log("Voice conversation disconnected");
    },
    onMessage: (message) => {
      console.log("Received message:", message);
      
      // Add messages to transcript
      if (message.type === 'user_transcript' || message.type === 'agent_response') {
        const role = message.type === 'user_transcript' ? 'user' : 'assistant';
        const content = message.message || message.text || '';
        
        if (content.trim()) {
          setMessages(prev => [...prev, {
            role,
            content,
            timestamp: new Date()
          }]);
        }
      }
    },
    onError: (error) => {
      console.error("Voice conversation error:", error);
      toast.error("Voice conversation error. Please try again.");
      setIsConnecting(false);
      setIsRecording(false);
    },
  });

  // Mock company/job data - will be replaced with real data from database
  const mockJobData = {
    company: "Google",
    position: "Senior Software Engineer",
    description: "Build scalable distributed systems with a focus on cloud infrastructure and microservices architecture.",
    skills: ["Python", "Go", "Kubernetes", "System Design"],
    interviewType: "Technical Deep Dive"
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startInterview = async () => {
    try {
      setIsConnecting(true);
      setConversationStarted(true);
      
      // Request microphone access first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // For now, show a helpful message about setting up ElevenLabs
      toast.error(
        "To enable voice interviews, you need to:\n" +
        "1. Create an AI Agent in your ElevenLabs dashboard\n" +
        "2. Configure it with interview prompts\n" +
        "3. Add the agent ID to the code\n\n" +
        "For now, using text-based interview mode.",
        { duration: 8000 }
      );
      
      // Fall back to text mode
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm your interviewer for the ${mockJobData.position} position at ${mockJobData.company}. Let's start with a brief introduction - tell me about yourself and why you're interested in this role.`,
        timestamp: new Date()
      }]);
      
      setIsRecording(true);
      setIsConnecting(false);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setInterviewDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Error starting interview:", error);
      toast.error("Failed to start interview. Please check your microphone permissions.");
      setIsConnecting(false);
      setConversationStarted(false);
      setIsRecording(false);
    }
  };

  const endInterview = async () => {
    // End the voice conversation
    await conversation.endSession();
    
    setIsRecording(false);
    setConversationStarted(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (messages.length < 2) {
      toast.error("Interview too short to analyze");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Analyze the conversation using Lovable AI
      const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      
      const { data, error } = await supabase.functions.invoke('analyze-interview', {
        body: {
          transcript,
          jobData: mockJobData
        }
      });

      if (error) throw error;

      setScoringResult(data.analysis);
      toast.success("Interview analysis complete!");
    } catch (error) {
      console.error('Error analyzing interview:', error);
      toast.error('Failed to analyze interview');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Interview Prep Room</h1>
          <p className="text-muted-foreground">
            Practice realistic interviews with AI-powered feedback
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Job Info */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-accent" />
                  Interview Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Company</p>
                  <p className="font-semibold text-lg">{mockJobData.company}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Position</p>
                  <p className="font-semibold">{mockJobData.position}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Interview Type</p>
                  <Badge variant="secondary">{mockJobData.interviewType}</Badge>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Key Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {mockJobData.skills.map((skill) => (
                      <Badge key={skill} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Job Description</p>
                  <p className="text-sm">{mockJobData.description}</p>
                </div>
              </CardContent>
            </Card>

            {conversationStarted && (
              <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-accent" />
                    Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-accent">{formatTime(interviewDuration)}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Middle Column - Interview Interface */}
          <div className="lg:col-span-2 space-y-4">
            {!conversationStarted && !scoringResult && (
              <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-accent" />
                    Ready to Start?
                  </CardTitle>
                  <CardDescription>
                    Click below to begin your mock interview. The AI interviewer will ask you questions based on the job description.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Setup Required:</strong> To enable voice interviews, you need to create an AI Agent in your ElevenLabs dashboard and configure it. For now, the system uses text-based mode.
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    onClick={startInterview}
                    className="w-full bg-gradient-accent text-background hover:opacity-90"
                    size="lg"
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 mr-2" />
                        Start Interview
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {conversationStarted && (
              <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-accent" />
                    Conversation
                    {isRecording && (
                      <Badge variant="destructive" className="ml-auto">
                        <span className="animate-pulse">● Recording</span>
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-4 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-accent text-background'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm font-medium mb-1">
                            {message.role === 'user' ? 'You' : 'Interviewer'}
                          </p>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs mt-2 opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={endInterview}
                      variant="ghost"
                      className="w-full"
                    >
                      <MicOff className="w-4 h-4 mr-2" />
                      End Interview & Get Feedback
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAnalyzing && (
              <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Analyzing Interview...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Our AI is evaluating your interview performance across multiple dimensions...
                    </p>
                    <Progress value={66} className="w-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            {scoringResult && (
              <div className="space-y-4">
                <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-accent" />
                      Interview Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-6">
                      <p className={`text-6xl font-bold ${getScoreColor(scoringResult.overallScore)}`}>
                        {scoringResult.overallScore}%
                      </p>
                      <p className="text-muted-foreground mt-2">Overall Performance</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{scoringResult.relevanceScore}%</p>
                        <p className="text-xs text-muted-foreground">Relevance</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{scoringResult.clarityScore}%</p>
                        <p className="text-xs text-muted-foreground">Clarity</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{scoringResult.confidenceScore}%</p>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{scoringResult.technicalScore}%</p>
                        <p className="text-xs text-muted-foreground">Technical</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{scoringResult.starMethodScore}%</p>
                        <p className="text-xs text-muted-foreground">STAR Method</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{formatTime(interviewDuration)}</p>
                        <p className="text-xs text-muted-foreground">Duration</p>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Strengths
                        </h4>
                        <ul className="space-y-1">
                          {scoringResult.strengths.map((strength, index) => (
                            <li key={index} className="text-sm text-muted-foreground pl-6">
                              • {strength}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4 text-yellow-500" />
                          Areas for Improvement
                        </h4>
                        <ul className="space-y-1">
                          {scoringResult.improvements.map((improvement, index) => (
                            <li key={index} className="text-sm text-muted-foreground pl-6">
                              • {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Detailed Feedback</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {scoringResult.feedback}
                        </p>
                      </div>
                    </div>

                    <Button 
                      onClick={() => {
                        setScoringResult(null);
                        setMessages([]);
                        setInterviewDuration(0);
                      }}
                      className="w-full mt-6"
                      variant="outline"
                    >
                      Start New Interview
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default InterviewPrep;
