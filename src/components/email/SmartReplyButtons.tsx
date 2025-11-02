import { Button } from "@/components/ui/button";
import { Sparkles, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SmartReplyButtonsProps {
  smartReplies: {
    professional?: string;
    friendly?: string;
    decline?: string;
  };
  onSelectReply: (reply: string, type: string) => void;
}

export function SmartReplyButtons({ smartReplies, onSelectReply }: SmartReplyButtonsProps) {
  if (!smartReplies || Object.keys(smartReplies).length === 0) {
    return null;
  }

  const replyOptions = [
    { type: "professional", label: "Professional", reply: smartReplies.professional, variant: "default" as const },
    { type: "friendly", label: "Friendly", reply: smartReplies.friendly, variant: "secondary" as const },
    { type: "decline", label: "Decline", reply: smartReplies.decline, variant: "outline" as const },
  ].filter(option => option.reply);

  return (
    <Card className="p-4 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">AI Smart Replies</h3>
        <Badge variant="secondary" className="text-xs">Powered by QUIN</Badge>
      </div>
      
      <div className="space-y-2">
        {replyOptions.map((option) => (
          <div key={option.type} className="group">
            <div className="flex items-start gap-2">
              <Button
                variant={option.variant}
                size="sm"
                onClick={() => onSelectReply(option.reply!, option.type)}
                className="flex-1 justify-start text-left h-auto py-3 px-4 hover:scale-[1.02] transition-transform"
              >
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs uppercase tracking-wide">{option.label}</span>
                    <Send className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs opacity-80 line-clamp-2 font-normal">{option.reply}</p>
                </div>
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
        <Sparkles className="h-3 w-3" />
        Click to use as draft, then customize before sending
      </p>
    </Card>
  );
}
