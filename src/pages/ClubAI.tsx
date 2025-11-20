import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles, Loader2, Briefcase, TrendingUp, MessageSquare, Target, Plus, Clock, Trash2, Globe, Brain, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { EncryptedText } from "@/components/ui/encrypted-text";
import { AIQuickActions } from "@/components/ai/AIQuickActions";
import { useAISuggestions } from "@/hooks/useAISuggestions";

interface Message {
  role: "user" | "assistant";
  content: string;
  needsConfirmation?: boolean;
  confirmationMessage?: string;
  action?: {
    type: "navigate";
    path: string;
    reason: string;
  };
  mode?: "search" | "think" | "canvas" | "normal";
}

const ClubAI = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<string>("");
  const [pendingNavigation, setPendingNavigation] = useState<{ path: string; reason: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Conversation management
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  
  // AI suggestions
  const { suggestions: aiSuggestions, unreadCount } = useAISuggestions();
  
  // Model and mode selection
  const [selectedModel, setSelectedModel] = useState<string>("google/gemini-2.5-flash");
  const [selectedMode, setSelectedMode] = useState<"normal" | "search" | "think" | "canvas">("normal");

  useEffect(() => {
    loadProfile();
    loadConversations();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

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
  
  const loadConversations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", user.id)
        .eq("conversation_type", "club_ai")
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };
  
  const loadConversation = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();
      
      if (error) throw error;
      
      if (data && Array.isArray(data.messages)) {
        setMessages(data.messages as unknown as Message[]);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };
  
  const createNewConversation = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          conversation_type: "club_ai",
          messages: [],
          context: {}
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setCurrentConversationId(data.id);
      setMessages([]);
      await loadConversations();
      
      toast({
        title: "New conversation started",
        description: "You can now chat with Club AI"
      });
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive"
      });
    }
  };
  
  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("ai_conversations")
        .delete()
        .eq("id", conversationId);
      
      if (error) throw error;
      
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      
      await loadConversations();
      
      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed"
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      });
    }
  };
  
  const saveConversation = async (updatedMessages: Message[]) => {
    if (!user || !currentConversationId) return;
    
    try {
      const { error } = await supabase
        .from("ai_conversations")
        .update({
          messages: updatedMessages as any,
          updated_at: new Date().toISOString()
        })
        .eq("id", currentConversationId);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error saving conversation:", error);
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
    await sendMessage(promptText);
  };

  const sendMessage = async (messageText: string, uploadedFiles?: File[], selectedModel?: string) => {
    if (!messageText.trim() && (!uploadedFiles || uploadedFiles.length === 0)) return;
    
    // Create conversation if none exists
    if (!currentConversationId) {
      await createNewConversation();
      // Wait a bit for the conversation to be created
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Detect mode from message prefix
    let mode: "search" | "think" | "canvas" | "normal" = "normal";
    if (messageText.startsWith("[Search:")) mode = "search";
    else if (messageText.startsWith("[Think:")) mode = "think";
    else if (messageText.startsWith("[Canvas:")) mode = "canvas";

    // Process uploaded files
    let imageDataUrls: string[] = [];
    let documentData: Array<{ name: string; type: string; content: string }> = [];
    
    if (uploadedFiles && uploadedFiles.length > 0) {
      const imageFiles = uploadedFiles.filter(f => f.type.startsWith('image/'));
      const docFiles = uploadedFiles.filter(f => !f.type.startsWith('image/'));
      
      // Convert images to base64
      if (imageFiles.length > 0) {
        const imagePromises = imageFiles.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });
        
        try {
          imageDataUrls = await Promise.all(imagePromises);
        } catch (error) {
          console.error("Error converting images to base64:", error);
          toast({
            title: "Error",
            description: "Failed to process uploaded images",
            variant: "destructive"
          });
          return;
        }
      }
      
      // Process documents
      if (docFiles.length > 0) {
        const docPromises = docFiles.map(async (file) => {
          return new Promise<{ name: string; type: string; content: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              resolve({
                name: file.name,
                type: file.type,
                content: base64
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });
        
        try {
          documentData = await Promise.all(docPromises);
        } catch (error) {
          console.error("Error processing documents:", error);
          toast({
            title: "Error",
            description: "Failed to process uploaded documents",
            variant: "destructive"
          });
          return;
        }
      }
    }

    const userMessage: Message = { role: "user", content: messageText, mode };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    let assistantContent = "";
    let needsConfirmation = false;
    let confirmationMessage = "";
    let pendingToolCalls: any[] = [];

    const updateAssistant = (chunk: string, toolCalls?: any) => {
      assistantContent += chunk;
      
      // Handle tool calls
      if (toolCalls && Array.isArray(toolCalls)) {
        toolCalls.forEach((tc: any) => {
          if (tc.function?.name === "navigate_to_page") {
            try {
              const args = JSON.parse(tc.function.arguments || "{}");
              pendingToolCalls.push({
                type: "navigate",
                path: args.path,
                reason: args.reason
              });
            } catch (e) {
              console.error("Failed to parse tool call:", e);
            }
          }
        });
      }
      
      // Check if the message contains confirmation markers
      if (assistantContent.toLowerCase().includes("<button>confirm</button>") || 
          assistantContent.toLowerCase().includes("confirm button") ||
          assistantContent.toLowerCase().includes("click to confirm")) {
        needsConfirmation = true;
        // Extract confirmation message (text before the button marker)
        const match = assistantContent.match(/(.*?)(?:<button>confirm<\/button>|confirm button|click to confirm)/is);
        if (match) {
          confirmationMessage = match[1].trim();
        }
      }
      
      // Clean up button tags from the content
      const cleanContent = assistantContent
        .replace(/<button>confirm<\/button>/gi, "")
        .replace(/\*\*Confirm\*\*/gi, "")
        .trim();
      
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const action = pendingToolCalls.length > 0 ? pendingToolCalls[0] : undefined;
        
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 
              ? { 
                  ...m, 
                  content: cleanContent,
                  needsConfirmation,
                  confirmationMessage: confirmationMessage || cleanContent,
                  action
                } 
              : m
          );
        }
        return [...prev, { 
          role: "assistant", 
          content: cleanContent,
          needsConfirmation,
          confirmationMessage: confirmationMessage || cleanContent,
          action
        }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMessage],
        userId: user?.id,
        conversationId: currentConversationId,
        images: imageDataUrls.length > 0 ? imageDataUrls : undefined,
        documents: documentData.length > 0 ? documentData : undefined,
        selectedModel,
        onDelta: updateAssistant,
        onDone: async () => {
          setIsLoading(false);
          // Save conversation after AI response is complete
          const assistantMessage: Message = {
            role: "assistant",
            content: assistantContent,
            needsConfirmation,
            confirmationMessage,
            action: pendingToolCalls.length > 0 ? pendingToolCalls[0] : undefined
          };
          const finalMessages = [...messages, userMessage, assistantMessage];
          await saveConversation(finalMessages);
          await loadConversations();
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const streamChat = async ({
    messages,
    userId,
    conversationId,
    images,
    documents,
    selectedModel,
    onDelta,
    onDone,
  }: {
    messages: Message[];
    userId?: string;
    conversationId?: string | null;
    images?: string[];
    documents?: Array<{ name: string; type: string; content: string }>;
    selectedModel?: string;
    onDelta: (chunk: string, toolCall?: any) => void;
    onDone: () => void;
  }) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-ai-chat`;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, userId, conversationId, images, documents, selectedModel }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        toast({
          title: "Rate Limit Exceeded",
          description: "Rate limits exceeded, please try again later.",
          variant: "destructive"
        });
        throw new Error("Rate limited");
      }
      if (resp.status === 402) {
        toast({
          title: "Payment Required",
          description: "Payment required. Please add funds to continue.",
          variant: "destructive"
        });
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
          const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
          
          if (content) onDelta(content);
          if (toolCalls) onDelta("", toolCalls);
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

  const suggestedPrompts = getSuggestedPrompts();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="mb-3 pt-3 flex-shrink-0 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight mb-1 flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-primary" />
              Club AI
            </h1>
            <p className="text-sm text-muted-foreground">
              Your personal AI career strategist, available 24/7
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={createNewConversation}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
            
            <Sheet open={showConversations} onOpenChange={setShowConversations}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  History ({conversations.length})
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Conversation History</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                  <div className="space-y-2">
                    {conversations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No conversations yet. Start chatting!
                      </p>
                    ) : (
                      conversations.map((conv) => {
                        const firstMessage = Array.isArray(conv.messages) && conv.messages.length > 0
                          ? conv.messages[0]?.content?.substring(0, 60) + "..."
                          : "New conversation";
                        const isActive = conv.id === currentConversationId;
                        
                        return (
                          <Card
                            key={conv.id}
                            className={`p-3 cursor-pointer transition-colors ${
                              isActive ? "border-primary bg-primary/5" : "hover:bg-muted"
                            }`}
                            onClick={() => {
                              setCurrentConversationId(conv.id);
                              setShowConversations(false);
                            }}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {firstMessage}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(conv.updated_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteConversation(conv.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Chat area - Full Screen */}
        <Card className="flex-1 border-2 border-border flex flex-col overflow-hidden">
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
                        {message.mode && message.mode !== "normal" && message.role === "user" && (
                          <div className="mb-2 flex gap-1">
                            {message.mode === "search" && (
                              <Badge variant="secondary" className="text-xs bg-[#1EAEDB]/15 text-[#1EAEDB] border-[#1EAEDB]">
                                🌐 Search Mode
                              </Badge>
                            )}
                            {message.mode === "think" && (
                              <Badge variant="secondary" className="text-xs bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]">
                                🧠 Deep Think
                              </Badge>
                            )}
                            {message.mode === "canvas" && (
                              <Badge variant="secondary" className="text-xs bg-[#F97316]/15 text-[#F97316] border-[#F97316]">
                                🎨 Canvas Mode
                              </Badge>
                            )}
                          </div>
                        )}
                         {message.role === "assistant" ? (
                          <div className="space-y-3">
                            <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                              <EncryptedText 
                                text={message.content}
                                revealDelayMs={15}
                                encryptedClassName="text-muted-foreground/40"
                                revealedClassName="text-foreground"
                              />
                            </div>
                            {message.needsConfirmation && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setPendingAction(message.confirmationMessage || "");
                                  setPendingNavigation(message.action ? { path: message.action.path, reason: message.action.reason } : null);
                                  setShowConfirmDialog(true);
                                }}
                                className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                              >
                                Confirm
                              </Button>
                            )}
                          </div>
                        ) : (
                          <EncryptedText 
                            text={message.content}
                            className="text-sm whitespace-pre-wrap"
                            revealDelayMs={20}
                            encryptedClassName="text-primary-foreground/30"
                            revealedClassName="text-primary-foreground"
                          />
                        )}
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
              <div className="max-w-4xl mx-auto space-y-3">
                {/* Model Selector */}
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant={selectedModel === "google/gemini-2.5-pro" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedModel("google/gemini-2.5-pro")}
                    className="text-xs"
                  >
                    Quantum 1.0
                  </Button>
                  <Button
                    variant={selectedModel === "google/gemini-2.5-flash" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedModel("google/gemini-2.5-flash")}
                    className="text-xs"
                  >
                    Claude
                  </Button>
                  <Button
                    variant={selectedModel === "openai/gpt-5" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedModel("openai/gpt-5")}
                    className="text-xs"
                  >
                    Chat-GPT
                  </Button>
                </div>
                
                <PromptInputBox
                  placeholders={[
                    "What's the best strategy for my job search?",
                    "How should I prepare for technical interviews?",
                    "Can you review my career trajectory?",
                    "What salary should I negotiate for?",
                    "Help me optimize my LinkedIn profile"
                  ]}
                  showSearch={selectedMode === "search"}
                  showThink={selectedMode === "think"}
                  showCanvas={selectedMode === "canvas"}
                  onSearchToggle={() => setSelectedMode(selectedMode === "search" ? "normal" : "search")}
                  onThinkToggle={() => setSelectedMode(selectedMode === "think" ? "normal" : "think")}
                  onCanvasToggle={() => setSelectedMode(selectedMode === "canvas" ? "normal" : "canvas")}
                  isLoading={isLoading}
                  onSend={(messageText, files) => {
                    if (messageText) {
                      // Add mode prefix if not normal
                      if (selectedMode === "search") messageText = `[Search: ${messageText}]`;
                      else if (selectedMode === "think") messageText = `[Think: ${messageText}]`;
                      else if (selectedMode === "canvas") messageText = `[Canvas: ${messageText}]`;
                      
                      sendMessage(messageText, undefined, selectedModel);
                    }
                  }}
                />
                {isLoading && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Club AI is thinking...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Confirm Action
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                {pendingAction || "Would you like me to proceed with this action?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={async () => {
                  setShowConfirmDialog(false);
                  
                  // Send confirmation to AI
                  const confirmMessage: Message = {
                    role: "user",
                    content: "Yes, confirmed. Please proceed."
                  };
                  
                  setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages, confirmMessage];
                    setIsLoading(true);
                    
                    let assistantContent = "";
                    let pendingToolCalls: any[] = [];
                    
                    const updateAssistant = (chunk: string, toolCalls?: any) => {
                      assistantContent += chunk;
                      
                      // Handle tool calls
                      if (toolCalls && Array.isArray(toolCalls)) {
                        toolCalls.forEach((tc: any) => {
                          if (tc.function?.name === "navigate_to_page") {
                            try {
                              const args = JSON.parse(tc.function.arguments || "{}");
                              pendingToolCalls.push({
                                type: "navigate",
                                path: args.path,
                                reason: args.reason
                              });
                            } catch (e) {
                              console.error("Failed to parse tool call:", e);
                            }
                          }
                        });
                      }
                      
                      const cleanContent = assistantContent
                        .replace(/<button>confirm<\/button>/gi, "")
                        .replace(/\*\*Confirm\*\*/gi, "")
                        .trim();
                      
                      setMessages((prev) => {
                        const last = prev[prev.length - 1];
                        const action = pendingToolCalls.length > 0 ? pendingToolCalls[0] : undefined;
                        
                        if (last?.role === "assistant") {
                          return prev.map((m, i) =>
                            i === prev.length - 1 ? { ...m, content: cleanContent, action } : m
                          );
                        }
                        return [...prev, { role: "assistant", content: cleanContent, action }];
                      });
                    };
                    
                    streamChat({
                      messages: updatedMessages,
                      userId: user?.id,
                      onDelta: updateAssistant,
                      onDone: () => {
                        setIsLoading(false);
                        
                        // Check if last message has navigation action
                        setMessages((prev) => {
                          const lastMsg = prev[prev.length - 1];
                          if (lastMsg?.action?.type === "navigate") {
                            setTimeout(() => {
                              navigate(lastMsg.action!.path);
                            }, 1500);
                          }
                          return prev;
                        });
                      },
                    }).catch((error) => {
                      console.error("Error after confirmation:", error);
                      toast({
                        title: "Error",
                        description: "Failed to process confirmation",
                        variant: "destructive"
                      });
                      setIsLoading(false);
                    });
                    
                    return updatedMessages;
                  });
                }}
                className="bg-primary hover:bg-primary/90"
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default ClubAI;
