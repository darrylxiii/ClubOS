import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, Briefcase, TrendingUp, MessageSquare, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ClubAI = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const getSuggestedPrompts = () => {
    const prompts = [
      {
        icon: Briefcase,
        title: "Optimize my job search",
        prompt: `Based on my profile (${profile?.current_title || "professional"} looking for roles in ${profile?.career_preferences || "my field"}), what strategies should I use to find the best opportunities?`,
      },
      {
        icon: TrendingUp,
        title: "Prepare for interviews",
        prompt: `I have upcoming interviews. Can you help me prepare with common questions and best practices for ${profile?.current_title || "my role"}?`,
      },
      {
        icon: MessageSquare,
        title: "Review my approach",
        prompt: "Can you review my current job search strategy and suggest improvements?",
      },
      {
        icon: Target,
        title: "Salary negotiation",
        prompt: `What's the best approach to negotiate salary for a ${profile?.current_title || "senior"} position? My current range is ${profile?.current_salary_min ? `$${profile.current_salary_min}` : "undisclosed"}.`,
      },
    ];

    return prompts;
  };

  const handleSuggestedPrompt = async (promptText: string) => {
    setInput(promptText);
    await sendMessage(promptText);
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim()) return;

    const userMessage: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMessage],
        onDelta: updateAssistant,
        onDone: () => setIsLoading(false),
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
      setIsLoading(false);
    }
  };

  const streamChat = async ({
    messages,
    onDelta,
    onDone,
  }: {
    messages: Message[];
    onDelta: (chunk: string) => void;
    onDone: () => void;
  }) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-ai-chat`;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        toast.error("Rate limits exceeded, please try again later.");
        throw new Error("Rate limited");
      }
      if (resp.status === 402) {
        toast.error("Payment required. Please add funds to continue.");
        throw new Error("Payment required");
      }
      throw new Error("Failed to start stream");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          /* ignore */
        }
      }
    }

    onDone();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedPrompts = getSuggestedPrompts();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            Club AI
          </h1>
          <p className="text-muted-foreground">
            Your personal AI career strategist, available 24/7
          </p>
        </div>

        {/* Chat area - Full Screen */}
        <Card className="flex-1 border-2 border-border flex flex-col min-h-0">
          <CardContent className="p-0 flex flex-col h-full">
            {/* Messages */}
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 max-w-4xl mx-auto">
                  <Sparkles className="w-16 h-16 text-primary mb-6" />
                  <h2 className="text-2xl font-bold mb-3">Welcome to Club AI</h2>
                  <p className="text-muted-foreground mb-8 max-w-md">
                    I'm here to help you with career strategy, interview prep,
                    salary negotiation, and more. Choose a suggested prompt or ask
                    me anything!
                  </p>
                  
                  {/* Suggested Prompts */}
                  <div className="w-full max-w-2xl">
                    <h3 className="font-bold mb-4 text-left flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Suggested Prompts
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {suggestedPrompts.map((prompt, index) => {
                        const Icon = prompt.icon;
                        return (
                          <Button
                            key={index}
                            variant="outline"
                            className="w-full justify-start h-auto py-4 text-left"
                            onClick={() => handleSuggestedPrompt(prompt.prompt)}
                            disabled={isLoading}
                          >
                            <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span className="text-sm font-medium">{prompt.title}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto w-full">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-4 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <Avatar className="h-10 w-10 border-2 border-primary flex-shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Sparkles className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`rounded-lg p-4 max-w-[80%] ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      {message.role === "user" && (
                        <Avatar className="h-10 w-10 border-2 border-border flex-shrink-0">
                          <AvatarFallback className="bg-card">
                            {profile?.full_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input area */}
            <div className="border-t border-border p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask me anything about your career..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={isLoading || !input.trim()}
                    size="icon"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {isLoading && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Club AI is thinking...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ClubAI;
