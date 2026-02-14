import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Reply, Archive, Clock, ExternalLink, Star, X, Send, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import type { CRMEmailReply } from "@/types/crm-enterprise";
import { REPLY_CLASSIFICATIONS } from "@/types/crm-enterprise";

interface ReplyDetailPanelProps {
  reply: CRMEmailReply;
  onClose: () => void;
  onReply: () => void;
  onArchive: () => void;
  onSnooze: () => void;
  onMarkActioned: (action: string) => void;
}

export function ReplyDetailPanel({
  reply,
  onClose,
  onReply,
  onArchive,
  onSnooze,
  onMarkActioned,
}: ReplyDetailPanelProps) {
  const classification = REPLY_CLASSIFICATIONS.find(c => c.value === reply.classification);
  const [showComposer, setShowComposer] = useState(false);
  const [replyText, setReplyText] = useState(reply.suggested_reply || "");
  const [sending, setSending] = useState(false);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-instantly-reply', {
        body: {
          prospect_id: reply.prospect_id,
          subject: `Re: ${reply.subject || ''}`,
          body: replyText,
        },
      });
      if (error) throw error;
      notify.success('Reply sent via Instantly');
      onMarkActioned('replied');
      setShowComposer(false);
      setReplyText('');
    } catch (err) {
      console.error('Failed to send reply:', err);
      notify.error('Failed to send reply', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSending(false);
    }
  };

  // Render email body: prefer sanitized HTML, fall back to plain text
  const renderEmailBody = () => {
    if (reply.body_html) {
      const sanitized = DOMPurify.sanitize(reply.body_html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'pre', 'code', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img', 'hr'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target'],
      });
      return (
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed [&_a]:text-primary [&_img]:max-w-full [&_img]:h-auto [&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      );
    }

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed">
        {reply.body_text?.split('\n').map((line, i) => (
          <p key={i} className="mb-2 last:mb-0">{line}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-border/30 bg-card/30 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="font-semibold text-base truncate">{reply.subject || "Reply"}</h2>
          {classification && (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {classification.emoji} {classification.label}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0 h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Prospect bar */}
      {reply.prospect_id && (
        <div className="px-6 py-2 border-b border-border/20 bg-muted/10 flex-shrink-0">
          <Link
            to={`/crm/prospects/${reply.prospect_id}`}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            View Prospect Profile
            {reply.prospect_company && <span className="text-muted-foreground ml-1">• {reply.prospect_company}</span>}
          </Link>
        </div>
      )}

      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-6 py-5 space-y-6">
          {/* Sender info */}
          <div>
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg leading-tight">{reply.from_name || reply.from_email}</h3>
                <p className="text-sm text-muted-foreground">{reply.from_email}</p>
                {reply.prospect_company && !reply.prospect_id && (
                  <p className="text-sm text-muted-foreground">{reply.prospect_company}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                {format(new Date(reply.received_at), 'PPp')}
              </span>
            </div>
          </div>

          {/* Email body (HTML or plain text) */}
          {renderEmailBody()}

          {/* AI Summary */}
          {reply.ai_summary && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  AI Summary
                  <span className="text-[10px] text-muted-foreground">Powered by QUIN</span>
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{reply.ai_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Suggested Reply */}
          {reply.suggested_reply && !showComposer && (
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Reply className="w-4 h-4 text-green-500" />
                  Suggested Reply
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {reply.suggested_reply}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setReplyText(reply.suggested_reply || '');
                    setShowComposer(true);
                  }}
                >
                  Use as Template
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Inline Reply Composer */}
          {showComposer && (
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Reply className="w-4 h-4 text-primary" />
                  Reply to {reply.from_name || reply.from_email}
                </h4>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  className="min-h-[120px] resize-y bg-background"
                  disabled={sending}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sending}
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send via Instantly
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowComposer(false)}
                    disabled={sending}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Sticky action bar */}
      <div className="px-6 py-3 border-t border-border/30 bg-card/30 backdrop-blur-sm flex items-center gap-2 flex-shrink-0">
        <Button
          onClick={() => setShowComposer(!showComposer)}
          size="sm"
          className="flex-1 max-w-[160px]"
        >
          <Reply className="w-4 h-4 mr-2" />
          Reply
        </Button>
        <Button variant="outline" size="sm" onClick={() => onMarkActioned('replied')}>
          Mark Replied
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onArchive}>
          <Archive className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSnooze}>
          <Clock className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
