import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown,
  Send,
  Copy,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { notify } from "@/lib/notify";

interface SmartReply {
  id: string;
  text: string;
  tone: 'formal' | 'friendly' | 'brief';
  confidence: number;
}

interface AISmartReplyPanelProps {
  conversationId: string;
  lastMessage: string | null;
  onSelectReply: (text: string) => void;
  onSendReply: (text: string) => Promise<void>;
}

export function AISmartReplyPanel({
  conversationId,
  lastMessage,
  onSelectReply,
  onSendReply
}: AISmartReplyPanelProps) {
  const [replies, setReplies] = useState<SmartReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Mock generate replies - in production this would call the edge function
  const generateReplies = async () => {
    if (!lastMessage) return;
    
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock responses based on common patterns
    const mockReplies: SmartReply[] = [
      {
        id: '1',
        text: "Thank you for your message! I'd be happy to discuss this further. Would you have time for a quick call this week?",
        tone: 'friendly',
        confidence: 0.92
      },
      {
        id: '2',
        text: "I appreciate you reaching out. Let me check on this and get back to you shortly with more details.",
        tone: 'formal',
        confidence: 0.88
      },
      {
        id: '3',
        text: "Got it! Let me know if you need anything else.",
        tone: 'brief',
        confidence: 0.85
      }
    ];
    
    setReplies(mockReplies);
    setLoading(false);
  };

  useEffect(() => {
    if (lastMessage) {
      generateReplies();
    }
  }, [conversationId]);

  const handleSend = async (reply: SmartReply) => {
    setSending(reply.id);
    try {
      await onSendReply(reply.text);
      notify.success("Message sent", { description: "Your reply has been sent successfully" });
    } catch (error) {
      notify.error("Failed to send", { description: "Please try again" });
    } finally {
      setSending(null);
    }
  };

  const handleCopy = (reply: SmartReply) => {
    navigator.clipboard.writeText(reply.text);
    setCopiedId(reply.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'formal': return 'bg-blue-500/10 text-blue-500';
      case 'friendly': return 'bg-emerald-500/10 text-emerald-500';
      case 'brief': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!lastMessage) {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/0 border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Smart Replies</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={generateReplies}
          disabled={loading}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {replies.map((reply, index) => (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                <div 
                  className={cn(
                    "p-3 rounded-lg border bg-card/50 cursor-pointer transition-all",
                    "hover:border-primary/30 hover:bg-card"
                  )}
                  onClick={() => onSelectReply(reply.text)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary" className={cn("text-xs", getToneColor(reply.tone))}>
                      {reply.tone}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(reply.confidence * 100)}% match
                    </span>
                  </div>
                  
                  <p className="text-sm text-foreground leading-relaxed pr-16">
                    {reply.text}
                  </p>

                  {/* Action Buttons */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(reply);
                      }}
                    >
                      {copiedId === reply.id ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-8 w-8 bg-[#25d366] hover:bg-[#25d366]/90"
                      disabled={sending === reply.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSend(reply);
                      }}
                    >
                      <Send className={cn("w-4 h-4", sending === reply.id && "animate-pulse")} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Feedback */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">Were these helpful?</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ThumbsUp className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ThumbsDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
