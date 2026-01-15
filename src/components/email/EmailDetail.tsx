import { Email } from "@/hooks/useEmails";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Reply,
  Forward,
  Archive,
  Trash2,
  Clock,
  Mail,
  MoreVertical,
  Star,
  Paperclip,
} from "lucide-react";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SmartReplyButtons } from "./SmartReplyButtons";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EmailDetailProps {
  email: Email;
  onReply: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onSnooze: () => void;
  onMarkAsUnread: () => void;
  onToggleStar: (starred: boolean) => void;
}

export function EmailDetail({
  email,
  onReply,
  onForward,
  onArchive,
  onDelete,
  onSnooze,
  onMarkAsUnread,
  onToggleStar,
}: EmailDetailProps) {
  const [replyDraft, setReplyDraft] = useState("");

  const handleSmartReply = (reply: string, type: string) => {
    setReplyDraft(reply);
    onReply?.();
  };

  const smartReplies = email.metadata?.smart_replies || {};
  const relationship = email.metadata?.relationship || {};

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getSentimentColor = (sentiment: string | null) => {
    if (sentiment === "positive") return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (sentiment === "negative") return "text-red-600 bg-red-100 dark:bg-red-900/30";
    return "text-gray-600 bg-gray-100 dark:bg-gray-900/30";
  };

  const sanitizedHtml = email.body_html
    ? DOMPurify.sanitize(email.body_html, {
      ADD_TAGS: ['style'],
      ADD_ATTR: ['target'],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    })
    : null;

  return (
    <div key={email.id} className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      {/* Action Toolbar - Premium Feel */}
      <div className="border-b border-border p-2 px-4 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10 h-14">
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onReply}>
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reply (R)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onForward}>
                  <Forward className="h-4 w-4 mr-2" />
                  Forward
                </Button>
              </TooltipTrigger>
              <TooltipContent>Forward (F)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-4 w-px bg-border mx-2" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onArchive}>
                  <Archive className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Archive</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-1">
          <div className="text-xs text-muted-foreground mr-3 font-mono">
            {(() => {
              let dateObj = new Date(email.email_date);
              if (isNaN(dateObj.getTime())) {
                try { dateObj = new Date(email.created_at || new Date()); }
                catch (e) { dateObj = new Date(); }
              }
              return format(dateObj, "MMM d, h:mm a");
            })()}
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleStar(!email.is_starred)}
                >
                  <Star
                    className={
                      email.is_starred
                        ? "h-4 w-4 fill-yellow-500 text-yellow-500"
                        : "h-4 w-4 text-muted-foreground"
                    }
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{email.is_starred ? 'Unstar' : 'Star'}</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onMarkAsUnread}>
                  <Mail className="mr-2 h-4 w-4" /> Mark as unread
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSnooze}>
                  <Clock className="mr-2 h-4 w-4" /> Snooze
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-muted/5">
        <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">

          {/* Subject & Metadata Header */}
          <div className="mb-8 space-y-4">
            <h1 className="text-2xl font-semibold leading-tight text-foreground">{email.subject}</h1>

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border">
                  {email.from_avatar_url && (
                    <AvatarImage src={email.from_avatar_url} alt={email.from_name || email.from_email} />
                  )}
                  <AvatarFallback>
                    {getInitials(email.from_name || email.from_email)}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <div className="font-medium flex items-center gap-2">
                    {email.from_name || email.from_email}
                    <span className="text-muted-foreground font-normal text-sm">&lt;{email.from_email}&gt;</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    To: {email.to_emails.map((t: any) => t.name || t.email).join(', ')}
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex gap-2">
                {email.ai_category && (
                  <Badge variant="outline" className="text-xs capitalize font-normal">
                    {email.ai_category.replace(/_/g, " ")}
                  </Badge>
                )}
                {email.ai_priority && email.ai_priority >= 4 && (
                  <Badge variant="destructive" className="text-xs font-normal">High Priority</Badge>
                )}
              </div>
            </div>
          </div>

          {/* AI Insights Card (Collapsible idea potentially, but keep open for now) */}
          {email.ai_processed_at && (
            <div className="mb-6">
              <Card className="bg-primary/5 border-primary/10 shadow-sm">
                <CardContent className="p-4 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-medium text-primary mb-1">
                    ✨ AI Summary
                  </div>
                  <p className="text-foreground/90 leading-relaxed">
                    {email.ai_summary}
                  </p>
                  {email.ai_action_items?.length > 0 && (
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground mt-2">
                      {email.ai_action_items.map((item: any, i: number) => (
                        <li key={i}>{item.text}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attachments */}
          {email.has_attachments && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <div className="flex items-center gap-2 p-2 border rounded-md bg-background text-sm">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span>{email.attachment_count} Attachment{email.attachment_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          {/* Email Body - Paper View */}
          <Card className="shadow-sm border-border/60 overflow-hidden min-h-[400px]">
            <CardContent className="p-0">
              <div className="bg-white dark:bg-card p-6 md:p-8 min-h-[400px]">
                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                  <style>{`
                      .email-body-wrapper {
                        max-width: 100% !important;
                        overflow-x: auto !important;
                      }
                      .email-body-wrapper img {
                        max-width: 100% !important;
                        height: auto !important;
                        display: block !important;
                      }
                      
                      /* Dark mode text readability fixes */
                      /* Supports both .dark class strategy and system preference */
                      .dark .email-body-wrapper,
                      @media (prefers-color-scheme: dark) {
                          .email-body-wrapper { 
                              color: #e2e8f0 !important; 
                          }
                          /* Aggressively override text colors for common elements */
                          .email-body-wrapper p, 
                          .email-body-wrapper span, 
                          .email-body-wrapper div, 
                          .email-body-wrapper td,
                          .email-body-wrapper font,
                          .email-body-wrapper li,
                          .email-body-wrapper h1,
                          .email-body-wrapper h2,
                          .email-body-wrapper h3,
                          .email-body-wrapper h4,
                          .email-body-wrapper strong,
                          .email-body-wrapper b {
                              color: #e2e8f0 !important;
                          }
                          /* Fix links to be readable blue */
                          .email-body-wrapper a,
                          .email-body-wrapper a span {
                              color: #60a5fa !important;
                              text-decoration: underline;
                          }
                          /* ensure quoted text is readable */
                          .email-body-wrapper blockquote {
                              color: #94a3b8 !important;
                              border-left-color: #475569 !important;
                          }
                      }
                    `}</style>
                  {sanitizedHtml ? (
                    <div
                      className="email-body-wrapper break-words"
                      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans break-words overflow-x-auto">
                      {email.body_text || email.snippet}
                    </pre>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smart Replies Footer */}
          {Object.keys(smartReplies).length > 0 && (
            <div className="mt-8">
              <div className="text-sm text-muted-foreground mb-3 font-medium">Quick Reply</div>
              <SmartReplyButtons
                smartReplies={smartReplies}
                onSelectReply={handleSmartReply}
              />
            </div>
          )}

          <div className="h-12" /> {/* Bottom spacer */}
        </div>
      </ScrollArea>
    </div>
  );
}
