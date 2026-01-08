import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Paperclip, 
  Smile, 
  FileText, 
  Image, 
  Mic,
  Clock,
  AlertTriangle,
  Sparkles,
  X,
  Mail
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { differenceInHours } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface WhatsAppMessageComposerProps {
  onSend: (content: string) => Promise<void>;
  onOpenTemplates: () => void;
  messagingWindowExpiresAt: string | null;
  smartReplies?: string[];
  onSmartReplySelect?: (reply: string) => void;
  disabled?: boolean;
  sending?: boolean;
  onOpenEmailBridge?: () => void;
}

const EMOJI_QUICK_ACCESS = ['👍', '❤️', '😊', '🙏', '✨', '🎉', '💪', '👋'];

export function WhatsAppMessageComposer({
  onSend,
  onOpenTemplates,
  messagingWindowExpiresAt,
  smartReplies = [],
  onSmartReplySelect,
  disabled = false,
  sending = false,
  onOpenEmailBridge
}: WhatsAppMessageComposerProps) {
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const windowStatus = (() => {
    if (!messagingWindowExpiresAt) return null;
    const hoursLeft = differenceInHours(new Date(messagingWindowExpiresAt), new Date());
    if (hoursLeft <= 0) return { status: 'expired', hoursLeft: 0 };
    if (hoursLeft <= 4) return { status: 'urgent', hoursLeft };
    if (hoursLeft <= 12) return { status: 'warning', hoursLeft };
    return { status: 'ok', hoursLeft };
  })();

  const canSendFreeform = windowStatus === null || windowStatus.status !== 'expired';

  const handleSend = async () => {
    if (!message.trim() || sending || disabled) return;
    
    const content = message.trim();
    setMessage("");
    
    try {
      await onSend(content);
    } catch (error) {
      // Restore message on error
      setMessage(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
    setShowEmoji(false);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-sm">
      {/* Window Status Warning */}
      <AnimatePresence>
        {windowStatus && windowStatus.status !== 'ok' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              "px-4 py-2 text-sm flex items-center gap-2",
              windowStatus.status === 'expired' && "bg-red-500/10 text-red-500",
              windowStatus.status === 'urgent' && "bg-amber-500/10 text-amber-500",
              windowStatus.status === 'warning' && "bg-yellow-500/10 text-yellow-500"
            )}
          >
            {windowStatus.status === 'expired' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            {windowStatus.status === 'expired' ? (
              <span>24h window expired. Use a template to re-engage.</span>
            ) : (
              <span>{windowStatus.hoursLeft}h left to send freeform messages</span>
            )}
            {windowStatus.status === 'expired' && (
              <div className="ml-auto flex items-center gap-2">
                {onOpenEmailBridge && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={onOpenEmailBridge}
                  >
                    <Mail className="w-3.5 h-3.5 mr-1" />
                    Email Instead
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={onOpenTemplates}
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  Use Template
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Replies */}
      <AnimatePresence>
        {smartReplies.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-b border-border/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">AI Suggested Replies</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {smartReplies.slice(0, 3).map((reply, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-auto py-1.5 px-3 text-xs max-w-[200px] text-left whitespace-normal"
                  onClick={() => {
                    if (onSmartReplySelect) {
                      onSmartReplySelect(reply);
                    } else {
                      setMessage(reply);
                    }
                  }}
                >
                  <span className="line-clamp-2">{reply}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer */}
      <div className="p-4">
        <div className="flex items-end gap-2">
          {/* Attachment */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 shrink-0"
                disabled={disabled || !canSendFreeform}
              >
                <Paperclip className="w-5 h-5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start h-9" disabled>
                  <Image className="w-4 h-4 mr-2 text-blue-500" />
                  Image
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9" disabled>
                  <FileText className="w-4 h-4 mr-2 text-purple-500" />
                  Document
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9" disabled>
                  <Mic className="w-4 h-4 mr-2 text-red-500" />
                  Voice Note
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Emoji */}
          <Popover open={showEmoji} onOpenChange={setShowEmoji}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 shrink-0"
                disabled={disabled || !canSendFreeform}
              >
                <Smile className="w-5 h-5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex gap-1">
                {EMOJI_QUICK_ACCESS.map(emoji => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-lg"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Template Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 shrink-0"
                onClick={onOpenTemplates}
                disabled={disabled}
              >
                <FileText className="w-5 h-5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send Template</TooltipContent>
          </Tooltip>

          {/* Text Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={canSendFreeform ? "Type a message..." : "Use a template to restart conversation"}
              disabled={disabled || !canSendFreeform}
              className="min-h-[44px] max-h-[120px] resize-none py-3 pr-12 bg-background/50"
              rows={1}
            />
            {message && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setMessage("")}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending || disabled || !canSendFreeform}
            className={cn(
              "h-10 w-10 shrink-0 rounded-full",
              "bg-[#25d366] hover:bg-[#25d366]/90 text-white"
            )}
          >
            <Send className={cn("w-5 h-5", sending && "animate-pulse")} />
          </Button>
        </div>
      </div>
    </div>
  );
}
