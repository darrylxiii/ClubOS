import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "@/components/ui/model-selector";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Sparkles, Briefcase, TrendingUp, MessageSquare, Target, Plus, Clock, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { AIQuickActions } from "@/components/ai/AIQuickActions";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useClubAIChat } from "@/hooks/useClubAIChat";

const ClubAI = () => {
  const {
    messages,
    isLoading,
    profile,
    showConfirmDialog,
    setShowConfirmDialog,
    pendingAction,
    setPendingAction,
    setPendingNavigation,
    scrollRef,
    messagesEndRef,
    conversations,
    currentConversationId,
    setCurrentConversationId,
    showConversations,
    setShowConversations,
    selectedModel,
    setSelectedModel,
    selectedMode,
    setSelectedMode,
    dynamicPlaceholders,
    createNewConversation,
    deleteConversation,
    sendMessage,
    handleConfirm,
  } = useClubAIChat();

  const { suggestions: aiSuggestions, unreadCount } = useAISuggestions();

  const getSuggestedPrompts = () => [
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

  const suggestedPrompts = getSuggestedPrompts();

  return (
    <>
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
            <Button variant="outline" size="sm" onClick={createNewConversation}>
              <Plus className="w-4 h-4 mr-2" />New Chat
            </Button>
            <Sheet open={showConversations} onOpenChange={setShowConversations}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />History ({conversations.length})
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>Conversation History</SheetTitle></SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                  <div className="space-y-2">
                    {conversations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No conversations yet. Start chatting!</p>
                    ) : (
                      conversations.map((conv) => {
                        const firstMessage = Array.isArray(conv.messages) && conv.messages.length > 0
                          ? conv.messages[0]?.content?.substring(0, 60) + "..."
                          : "New conversation";
                        const isActive = conv.id === currentConversationId;
                        return (
                          <Card
                            key={conv.id}
                            className={`p-3 cursor-pointer transition-colors ${isActive ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                            onClick={() => { setCurrentConversationId(conv.id); setShowConversations(false); }}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{firstMessage}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">{new Date(conv.updated_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}>
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

        {/* Chat area */}
        <Card className="flex-1 border-2 border-border flex flex-col overflow-hidden">
          <CardContent className="p-0 flex flex-col h-full">
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 max-w-4xl mx-auto">
                  <Sparkles className="w-16 h-16 text-primary mb-6" />
                  <h2 className="text-2xl font-bold mb-3">Welcome to Club AI</h2>
                  <p className="text-muted-foreground mb-8 max-w-md">
                    I'm here to help you with career strategy, interview prep, salary negotiation, and more. Choose a suggested prompt or ask me anything!
                  </p>
                  <div className="w-full max-w-2xl">
                    <h3 className="font-bold mb-4 text-left flex items-center gap-2">
                      <Target className="w-5 h-5" />Suggested Prompts
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {suggestedPrompts.map((prompt, index) => {
                        const Icon = prompt.icon;
                        return (
                          <Button key={index} variant="outline" className="w-full justify-start h-auto py-4 text-left" onClick={() => sendMessage(prompt.prompt)} disabled={isLoading}>
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
                    <div key={index} className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      {message.role === "assistant" && (
                        <Avatar className="h-10 w-10 border-2 border-primary flex-shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground"><Sparkles className="w-5 h-5" /></AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`rounded-lg p-4 max-w-[80%] ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {message.mode && message.mode !== "normal" && message.role === "user" && (
                          <div className="mb-2 flex gap-1">
                            {message.mode === "search" && <Badge variant="secondary" className="text-xs bg-[#1EAEDB]/15 text-[#1EAEDB] border-[#1EAEDB]">🌐 Search Mode</Badge>}
                            {message.mode === "think" && <Badge variant="secondary" className="text-xs bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]">🧠 Deep Think</Badge>}
                            {message.mode === "canvas" && <Badge variant="secondary" className="text-xs bg-[#F97316]/15 text-[#F97316] border-[#F97316]">🎨 Canvas Mode</Badge>}
                          </div>
                        )}
                        {message.role === "assistant" ? (
                          <div className="space-y-3">
                            <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
                                  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
                                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                  h1: ({ children }) => <h1 className="text-lg font-semibold mt-3 mb-2">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                                  a: (props) => <a {...props} className="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noreferrer" />,
                                  code: ({ children, className }) => {
                                    const isInline = !className;
                                    return isInline ? <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code> : <code className={className}>{children}</code>;
                                  },
                                  pre: ({ children }) => <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-2">{children}</pre>,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
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
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      {message.role === "user" && (
                        <Avatar className="h-10 w-10 border-2 border-border flex-shrink-0">
                          <AvatarFallback className="bg-card">{profile?.full_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
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
                <div className="flex items-center justify-center">
                  <ModelSelector value={selectedModel} onValueChange={setSelectedModel} className="w-full max-w-xs" />
                </div>
                <PromptInputBox
                  placeholders={dynamicPlaceholders}
                  showSearch={selectedMode === "search"}
                  showThink={selectedMode === "think"}
                  showCanvas={selectedMode === "canvas"}
                  onSearchToggle={() => setSelectedMode(selectedMode === "search" ? "normal" : "search")}
                  onThinkToggle={() => setSelectedMode(selectedMode === "think" ? "normal" : "think")}
                  onCanvasToggle={() => setSelectedMode(selectedMode === "canvas" ? "normal" : "canvas")}
                  isLoading={isLoading}
                  onSend={(messageText, files) => {
                    if (messageText) {
                      messageText = messageText.replace(/^\[(Search|Think|Canvas): /, '');
                      if (selectedMode === "search") messageText = `[Search: ${messageText}]`;
                      else if (selectedMode === "think") messageText = `[Think: ${messageText}]`;
                      else if (selectedMode === "canvas") messageText = `[Canvas: ${messageText}]`;

                      const modelMap: Record<string, string> = {
                        "club-ai-0.1": "google/gemini-2.5-flash",
                        "claude-sonnet-4-5": "claude-sonnet-4-5",
                        "google/gemini-3": "google/gemini-2.5-pro",
                        "openai/gpt-5.1-pro": "openai/gpt-5"
                      };
                      const actualModel = modelMap[selectedModel] || selectedModel;
                      sendMessage(messageText, undefined, actualModel);
                    }
                  }}
                />
                {isLoading && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">Club AI is thinking...</p>
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
                <Sparkles className="h-5 w-5 text-primary" />Confirm Action
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                {pendingAction || "Would you like me to proceed with this action?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm} className="bg-primary hover:bg-primary/90">Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default ClubAI;
