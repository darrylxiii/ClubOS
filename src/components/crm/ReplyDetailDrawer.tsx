import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Reply, Archive, Clock, ExternalLink, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import type { CRMEmailReply } from "@/types/crm-enterprise";
import { REPLY_CLASSIFICATIONS } from "@/types/crm-enterprise";

interface ReplyDetailDrawerProps {
  reply: CRMEmailReply | null;
  open: boolean;
  onClose: () => void;
  onReply: () => void;
  onArchive: () => void;
  onSnooze: () => void;
  onMarkActioned: (action: string) => void;
}

export function ReplyDetailDrawer({
  reply,
  open,
  onClose,
  onReply,
  onArchive,
  onSnooze,
  onMarkActioned,
}: ReplyDetailDrawerProps) {
  if (!reply) return null;
  
  const classification = REPLY_CLASSIFICATIONS.find(c => c.value === reply.classification);

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="h-[90vh] max-h-[90vh]">
        <DrawerHeader className="border-b border-border/20 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <DrawerTitle className="text-base truncate flex-1">
              {reply.subject || "Reply"}
            </DrawerTitle>
            {classification && (
              <Badge variant="outline" className="text-xs">
                {classification.emoji} {classification.label}
              </Badge>
            )}
          </div>
        </DrawerHeader>
        
        <ScrollArea className="flex-1 px-4 py-4">
          {/* Sender Info */}
          <div className="mb-4">
            <h3 className="font-semibold text-lg">{reply.from_name || reply.from_email}</h3>
            <p className="text-sm text-muted-foreground">{reply.from_email}</p>
            {reply.prospect_company && (
              <p className="text-sm text-muted-foreground">{reply.prospect_company}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Received {format(new Date(reply.received_at), 'PPp')}
            </p>
          </div>

          {/* Subject */}
          <div className="mb-4">
            <h4 className="font-medium">{reply.subject}</h4>
          </div>

          {/* Body */}
          <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
            {reply.body_text?.split('\n').map((line, i) => (
              <p key={i} className="mb-2">{line}</p>
            ))}
          </div>

          {/* AI Analysis */}
          {reply.ai_summary && (
            <Card className="mb-4 bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  AI Summary
                </h4>
                <p className="text-sm text-muted-foreground">{reply.ai_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Suggested Reply */}
          {reply.suggested_reply && (
            <Card className="mb-4 bg-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Reply className="w-4 h-4 text-green-500" />
                  Suggested Reply
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {reply.suggested_reply}
                </p>
                <Button size="sm" className="mt-3" asChild>
                  <a href={`mailto:${reply.from_email}?subject=Re: ${reply.subject}`}>
                    Use as Template
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* View Prospect */}
          {reply.prospect_id && (
            <Link to={`/crm/prospects/${reply.prospect_id}`}>
              <Button variant="outline" className="w-full mb-4">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Prospect Profile
              </Button>
            </Link>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="p-4 border-t border-border/30 flex items-center gap-2">
          <Button onClick={onReply} className="flex-1">
            <Reply className="w-4 h-4 mr-2" />
            Reply
          </Button>
          <Button variant="outline" onClick={() => onMarkActioned('replied')}>
            Mark Replied
          </Button>
          <Button variant="ghost" size="icon" onClick={onArchive}>
            <Archive className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onSnooze}>
            <Clock className="w-4 h-4" />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
