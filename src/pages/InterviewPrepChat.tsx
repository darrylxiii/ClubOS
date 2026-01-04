import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Briefcase, Building2, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function InterviewPrepChat() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [applicationData, setApplicationData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadApplicationData();
  }, [applicationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadApplicationData = async () => {
    if (!applicationId) return;

    try {
      const { data: application, error: appError } = await supabase
        .from('applications')
        .select('*, jobs(*)')
        .eq('id', applicationId)
        .single();

      if (appError) throw appError;

      setApplicationData(application);

      if (application.jobs?.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', application.jobs.company_id)
          .single();

        if (!companyError) {
          setCompanyData(company);
        }
      }

      // Set first stage as default
      if (application.stages && Array.isArray(application.stages) && application.stages.length > 0) {
        const firstStage = application.stages[0] as any;
        setSelectedStage(firstStage?.name || '');
      }
    } catch (error) {
      console.error('Error loading application data:', error);
      toast({
        title: "Error",
        description: "Failed to load application data",
        variant: "destructive",
      });
    }
  };

  const startInterview = async () => {
    if (!selectedStage) {
      toast({
        title: "Select a stage",
        description: "Please select an interview stage to practice",
        variant: "destructive",
      });
      return;
    }

    setIsInitialized(true);
    setIsLoading(true);

    try {
      await streamChat([]);
    } catch (error) {
      console.error('Error starting interview:', error);
      setIsInitialized(false);
    }
  };

  const streamChat = async (currentMessages: Message[]) => {
    const CHAT_URL = `https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/interview-prep-chat`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: currentMessages,
          companyInfo: {
            company_name: applicationData?.company_name || companyData?.name,
            industry: companyData?.industry,
            company_size: companyData?.company_size,
            description: companyData?.description,
            values: companyData?.values,
            tech_stack: companyData?.tech_stack,
          },
          roleInfo: {
            position: applicationData?.position,
            required_skills: applicationData?.jobs?.required_skills,
            experience_level: applicationData?.jobs?.experience_level,
            location: applicationData?.jobs?.location,
            description: applicationData?.jobs?.description,
          },
          stage: selectedStage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start chat');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantMessage = '';
      let textBuffer = '';

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantMessage += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantMessage
                };
                return newMessages;
              });
            }
          } catch (e) {
            // Incomplete JSON, put it back
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error('Error in streamChat:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to communicate with AI",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    await streamChat(newMessages);
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/applications')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Applications
        </Button>

        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-2">Interview Prep Room</h1>
            <p className="text-muted-foreground">
              Practice your interview with an AI interviewer that knows your company and role
            </p>
          </div>

          {/* Company & Role Info */}
          {applicationData && (
            <Card className="p-6 bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20 shadow-[var(--shadow-glass-md)]">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{applicationData.company_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="font-medium">{applicationData.position}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Stage Selection */}
          {!isInitialized && applicationData?.stages && (
            <Card className="p-6 bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20 shadow-[var(--shadow-glass-md)]">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Interview Stage to Practice
                  </label>
                  <Select value={selectedStage} onValueChange={setSelectedStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {applicationData.stages.map((stage: any, index: number) => (
                        <SelectItem key={index} value={stage.name}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={startInterview} className="w-full" size="lg">
                  Start Interview Practice
                </Button>
              </div>
            </Card>
          )}

          {/* Chat Interface */}
          {isInitialized && (
            <Card className="h-[600px] flex flex-col bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20 shadow-[var(--shadow-glass-md)]">
              <div className="p-4 border-b border-border/20">
                <p className="text-sm font-medium">Practicing: {selectedStage}</p>
              </div>

              <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start">
                      <div className="bg-muted/50 rounded-2xl px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border/20">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type your response..."
                    className="min-h-[60px] resize-none"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="h-[60px] w-[60px] flex-shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
