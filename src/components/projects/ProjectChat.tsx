import { useState, useRef, useEffect } from "react";
import { useProjectMessages, ProjectMessage } from "@/hooks/useProjectMessages";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Send, Paperclip, Image as ImageIcon, FileText, 
  Check, CheckCheck, Loader2, MessageSquare
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

interface ProjectChatProps {
  projectId?: string;
  contractId?: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  className?: string;
}

export function ProjectChat({
  projectId,
  contractId,
  recipientId,
  recipientName,
  recipientAvatar,
  className,
}: ProjectChatProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, isLoading, sendMessage, markAsRead, unreadCount } = 
    useProjectMessages(projectId, contractId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    const unreadMessages = messages
      .filter((m) => !m.is_read && m.recipient_id === user?.id)
      .map((m) => m.id);

    if (unreadMessages.length > 0) {
      markAsRead.mutate(unreadMessages);
    }
  }, [messages, user?.id, markAsRead]);

  const handleSend = () => {
    if (!message.trim()) return;

    sendMessage.mutate({
      recipientId,
      message: message.trim(),
    });
    setMessage("");
    inputRef.current?.focus();
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, "HH:mm");
    }
    if (isYesterday(date)) {
      return `Yesterday ${format(date, "HH:mm")}`;
    }
    return format(date, "MMM d, HH:mm");
  };

  const groupMessagesByDate = (msgs: ProjectMessage[]) => {
    const groups: { [key: string]: ProjectMessage[] } = {};
    msgs.forEach((msg) => {
      const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      {/* Header */}
      <CardHeader className="border-b py-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={recipientAvatar} />
            <AvatarFallback>{recipientName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-base">{recipientName}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {messages.length > 0 
                ? `${messages.length} messages` 
                : "Start a conversation"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} new</Badge>
          )}
        </div>
      </CardHeader>

      {/* Messages */}
      <ScrollArea 
        ref={scrollRef} 
        className="flex-1 p-4"
        style={{ height: "400px" }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">No messages yet</p>
            <p className="text-sm">Start the conversation below</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(messageGroups).map(([date, msgs]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {isToday(new Date(date))
                      ? "Today"
                      : isYesterday(new Date(date))
                      ? "Yesterday"
                      : format(new Date(date), "MMMM d, yyyy")}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {msgs.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-2",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isOwn && (
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={msg.sender?.avatar_url} />
                            <AvatarFallback>
                              {msg.sender?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2",
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.message}
                          </p>
                          <div
                            className={cn(
                              "flex items-center gap-1 mt-1",
                              isOwn ? "justify-end" : "justify-start"
                            )}
                          >
                            <span className="text-[10px] opacity-70">
                              {formatMessageDate(msg.created_at)}
                            </span>
                            {isOwn && (
                              msg.is_read ? (
                                <CheckCheck className="h-3 w-3 opacity-70" />
                              ) : (
                                <Check className="h-3 w-3 opacity-70" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Button type="button" variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!message.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
