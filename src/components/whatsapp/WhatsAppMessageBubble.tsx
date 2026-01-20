import { cn } from "@/lib/utils";
import { Check, CheckCheck, Clock, AlertCircle, Image, FileText, Mic } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface WhatsAppMessageBubbleProps {
  message: {
    id: string;
    direction: string;
    message_type: string;
    content: string | null;
    template_name: string | null;
    media_url: string | null;
    status: string;
    sentiment_score: number | null;
    intent_classification: string | null;
    created_at: string;
  };
  showAIBadge?: boolean;
}

export function WhatsAppMessageBubble({ message, showAIBadge = true }: WhatsAppMessageBubbleProps) {
  const isOutgoing = message.direction === 'outbound';
  
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />;
      case 'failed':
        return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getSentimentColor = () => {
    if (!message.sentiment_score) return null;
    if (message.sentiment_score > 0.3) return 'bg-emerald-500/20 border-emerald-500/30';
    if (message.sentiment_score < -0.3) return 'bg-red-500/20 border-red-500/30';
    return 'bg-amber-500/20 border-amber-500/30';
  };

  const getIntentBadge = () => {
    if (!message.intent_classification || !showAIBadge) return null;
    
    const intents: Record<string, { icon: string; color: string }> = {
      'interested': { icon: '🔥', color: 'bg-emerald-500/20 text-emerald-400' },
      'question': { icon: '❓', color: 'bg-blue-500/20 text-blue-400' },
      'reschedule': { icon: '📅', color: 'bg-amber-500/20 text-amber-400' },
      'objection': { icon: '⚠️', color: 'bg-red-500/20 text-red-400' },
      'positive': { icon: '✨', color: 'bg-emerald-500/20 text-emerald-400' },
      'negative': { icon: '👎', color: 'bg-red-500/20 text-red-400' },
      'neutral': { icon: '💬', color: 'bg-muted text-muted-foreground' },
    };
    
    const intent = intents[message.intent_classification] || intents['neutral'];
    
    return (
      <span className={cn("text-xs px-1.5 py-0.5 rounded-full", intent.color)}>
        {intent.icon} {message.intent_classification}
      </span>
    );
  };

  const renderMediaContent = () => {
    if (message.message_type === 'image' && message.media_url) {
      return (
        <div className="mb-2">
          <img 
            src={message.media_url} 
            alt="Shared image" 
            className="max-w-[280px] rounded-lg"
          />
        </div>
      );
    }
    
    if (message.message_type === 'document' && message.media_url) {
      return (
        <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg mb-2">
          <FileText className="w-8 h-8 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Document</p>
            <p className="text-xs text-muted-foreground">Click to download</p>
          </div>
        </div>
      );
    }
    
    if (message.message_type === 'audio' && message.media_url) {
      return (
        <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg mb-2">
          <Mic className="w-6 h-6 text-primary" />
          <div className="flex-1 h-8 bg-muted rounded-full flex items-center px-3">
            <div className="flex gap-0.5">
              {Array.from({ length: 20 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-0.5 bg-primary/50 rounded-full"
                  style={{ height: `${Math.random() * 16 + 4}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex",
        isOutgoing ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2 relative group",
          isOutgoing 
            ? "bg-[#005c4b] text-white rounded-br-md" 
            : "bg-card border border-border rounded-bl-md",
          getSentimentColor()
        )}
      >
        {/* Template indicator */}
        {message.template_name && (
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <span className="opacity-60">📋</span>
            <span className="italic">{message.template_name}</span>
          </div>
        )}
        
        {/* Media content */}
        {renderMediaContent()}
        
        {/* Message content */}
        <p className={cn(
          "text-sm whitespace-pre-wrap break-words",
          isOutgoing ? "text-white" : "text-foreground"
        )}>
          {message.content || (message.template_name ? `[Template: ${message.template_name}]` : '[Media message]')}
        </p>
        
        {/* Footer with time and status */}
        <div className={cn(
          "flex items-center gap-1.5 mt-1",
          isOutgoing ? "justify-end" : "justify-between"
        )}>
          {!isOutgoing && getIntentBadge()}
          
          <div className="flex items-center gap-1">
            <span className={cn(
              "text-[10px]",
              isOutgoing ? "text-white/70" : "text-muted-foreground"
            )}>
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
            {isOutgoing && getStatusIcon()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
