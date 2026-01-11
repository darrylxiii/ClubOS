import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Phone,
  MoreVertical,
  ExternalLink,
  Pin,
  Tag,
  ArrowDown,
  Sparkles,
  MessageSquare
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { WhatsAppMessageBubble } from "./WhatsAppMessageBubble";
import { WhatsAppMessageComposer } from "./WhatsAppMessageComposer";
import type { WhatsAppConversation } from "@/hooks/useWhatsAppConversations";
import type { WhatsAppMessage } from "@/hooks/useWhatsAppMessages";

interface WhatsAppChatThreadProps {
  conversation: WhatsAppConversation | null;
  messages: WhatsAppMessage[];
  loading?: boolean;
  sending?: boolean;
  smartReplies?: string[];
  onSend: (content: string) => Promise<void>;
  onOpenTemplates: () => void;
  onOpenInsights: () => void;
  onOpenEmailBridge?: () => void;
  onPin?: () => void;
  onViewProfile?: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export function WhatsAppChatThread({
  conversation,
  messages,
  loading,
  sending,
  smartReplies = [],
  onSend,
  onOpenTemplates,
  onOpenInsights,
  onOpenEmailBridge,
  onPin,
  onViewProfile,
  hasMore,
  onLoadMore,
  loadingMore
}: WhatsAppChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at);
    let dateKey: string;

    if (isToday(date)) {
      dateKey = 'Today';
    } else if (isYesterday(date)) {
      dateKey = 'Yesterday';
    } else {
      dateKey = format(date, 'MMMM d, yyyy');
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, WhatsAppMessage[]>);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    // Only auto-scroll if we are already at the bottom OR if it's the initial load (no messages yet or just loaded)
    // But if we just loaded MORE messages (history), we do NOT want to auto scroll to bottom.
    if (!loadingMore && autoScroll && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll, loadingMore]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
    setAutoScroll(isNearBottom);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  };

  if (!conversation) {
    // ... (unchanged)
    return (
      <div className="min-h-[600px] h-full flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/30 p-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#25d366]/20 to-[#128c7e]/20 flex items-center justify-center mb-6 ring-1 ring-[#25d366]/20">
          <MessageSquare className="w-10 h-10 text-[#25d366]" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Select a Conversation</h2>
        <p className="text-muted-foreground text-center max-w-sm mb-6">
          Choose a conversation from the list to view messages and connect with candidates.
        </p>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#25d366]" />
            <span>Real-time messaging with WhatsApp Business API</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#25d366]" />
            <span>AI-powered insights and smart replies</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#25d366]" />
            <span>Template messages for consistent outreach</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    // ... (unchanged)
    return (
      <div className="h-full flex flex-col">
        {/* Header Skeleton */}
        <div className="h-16 border-b border-border flex items-center gap-3 px-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        {/* Messages Skeleton */}
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
              <Skeleton className={cn("h-16 rounded-2xl", i % 2 === 0 ? "w-48" : "w-64")} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[600px] h-full flex flex-col bg-gradient-to-br from-background via-background to-[#25d366]/5">
      {/* Header */}
      <div className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-3 px-4">
        <Avatar className="w-10 h-10 border-2 border-[#25d366]/30">
          <AvatarImage src={conversation.profile_picture_url || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-[#25d366] to-[#128c7e] text-white">
            {conversation.candidate_name?.[0] || <User className="w-5 h-5" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {conversation.candidate_name || conversation.candidate_phone}
            </h3>
            {conversation.is_pinned && (
              <Pin className="w-3.5 h-3.5 text-amber-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {conversation.candidate_phone}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {/* AI Insights Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onOpenInsights}
          >
            <Sparkles className="w-4 h-4 text-primary" />
          </Button>

          {/* Call */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            asChild
          >
            <a href={`tel:${conversation.candidate_phone}`}>
              <Phone className="w-4 h-4" />
            </a>
          </Button>

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewProfile && (
                <DropdownMenuItem onClick={onViewProfile}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
              )}
              {onPin && (
                <DropdownMenuItem onClick={onPin}>
                  <Pin className="w-4 h-4 mr-2" />
                  {conversation.is_pinned ? 'Unpin' : 'Pin'} Conversation
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Tag className="w-4 h-4 mr-2" />
                Manage Tags
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 relative" onScrollCapture={handleScroll}>
        <div className="p-4 space-y-4">
          {hasMore && (
            <div className="flex justify-center pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="text-muted-foreground hover:text-foreground"
              >
                {loadingMore ? (
                  <>
                    <span className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-4 h-4 mr-2 rotate-180" />
                    Load Previous Messages
                  </>
                )}
              </Button>
            </div>
          )}

          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs font-normal">
                  {date}
                </Badge>
              </div>

              {/* Messages */}
              <div className="space-y-2">
                {dateMessages.map((message) => (
                  <WhatsAppMessageBubble key={message.id} message={message} />
                ))}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 right-4"
            >
              <Button
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg bg-card border border-border"
                onClick={scrollToBottom}
              >
                <ArrowDown className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Composer */}
      <WhatsAppMessageComposer
        onSend={onSend}
        onOpenTemplates={onOpenTemplates}
        onOpenEmailBridge={onOpenEmailBridge}
        messagingWindowExpiresAt={conversation.messaging_window_expires_at}
        smartReplies={smartReplies}
        sending={sending}
      />
    </div>
  );
}
