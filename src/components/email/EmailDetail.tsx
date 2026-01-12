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
  Tag,
  User,
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
    // In production, this would open the composer with the draft
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
    <div key={email.id} className="flex-1 flex flex-col bg-background transition-all duration-200 ease-in-out overflow-hidden">
      {/* Header - Responsive */}
      <div className="border-b border-border p-2 sm:p-3 md:p-4 flex items-center gap-1 sm:gap-2 flex-wrap flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onReply} className="min-h-[44px]">
          <Reply className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Reply</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onForward} className="min-h-[44px]">
          <Forward className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Forward</span>
        </Button>
        <div className="flex-1 min-w-0" />
        <Button variant="ghost" size="icon" onClick={onArchive} className="min-h-[44px] min-w-[44px] flex-shrink-0">
          <Archive className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="min-h-[44px] min-w-[44px] flex-shrink-0">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleStar(!email.is_starred)}
          className="min-h-[44px] min-w-[44px] flex-shrink-0"
        >
          <Star
            className={
              email.is_starred
                ? "h-4 w-4 fill-yellow-500 text-yellow-500"
                : "h-4 w-4"
            }
          />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-50 bg-popover">
            <DropdownMenuItem onClick={onMarkAsUnread}>
              <Mail className="mr-2 h-4 w-4" />
              Mark as unread
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSnooze}>
              <Clock className="mr-2 h-4 w-4" />
              Snooze
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Tag className="mr-2 h-4 w-4" />
              Add label
            </DropdownMenuItem>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Assign to strategist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
          {/* Subject */}
          <h1 className="text-xl sm:text-2xl font-semibold break-words">{email.subject}</h1>

          {/* Sender Info - Responsive */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
              {email.from_avatar_url && (
                <AvatarImage src={email.from_avatar_url} alt={email.from_name || email.from_email} />
              )}
              <AvatarFallback>
                {getInitials(email.from_name || email.from_email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="font-medium truncate">
                {email.from_name || email.from_email}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {email.from_email}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 hidden sm:block">
              {format(new Date(email.email_date), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>

          {/* Mobile date */}
          <div className="text-xs text-muted-foreground sm:hidden">
            {format(new Date(email.email_date), "MMM d, yyyy 'at' h:mm a")}
          </div>

          {/* To/Cc */}
          <div className="text-sm text-muted-foreground break-words">
            <span>To: </span>
            {email.to_emails.map((to, i) => (
              <span key={i}>
                {to.name || to.email}
                {i < email.to_emails.length - 1 && ", "}
              </span>
            ))}
          </div>

          {/* Smart Reply Suggestions */}
          {email.ai_processed_at && Object.keys(smartReplies).length > 0 && (
            <SmartReplyButtons
              smartReplies={smartReplies}
              onSelectReply={handleSmartReply}
            />
          )}

          {/* AI Insights */}
          {email.ai_processed_at && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-primary">✨ AI Insights</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {email.ai_category && (
                    <Badge variant="secondary">
                      {email.ai_category.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {email.ai_priority && email.ai_priority >= 4 && (
                    <Badge variant="destructive">High Priority</Badge>
                  )}
                  {email.ai_sentiment && (
                    <Badge className={getSentimentColor(email.ai_sentiment)}>
                      {email.ai_sentiment}
                    </Badge>
                  )}
                  {relationship.relationshipStrength && (
                    <Badge variant="outline" className="capitalize">
                      {relationship.relationshipStrength} Contact
                    </Badge>
                  )}
                </div>

                {email.ai_summary && (
                  <p className="text-sm text-muted-foreground">
                    {email.ai_summary}
                  </p>
                )}

                {email.ai_action_items && email.ai_action_items.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Action Items:</div>
                    {email.ai_action_items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Email Body */}
          <div className="prose prose-sm dark:prose-invert max-w-full overflow-x-auto break-words">
            <style>{`
              .email-body-wrapper {
                max-width: 100% !important;
                overflow-x: auto !important;
                overflow-y: visible !important;
                word-break: break-word !important;
              }
              .email-body-wrapper * {
                max-width: 100% !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
              }
              .email-body-wrapper img {
                max-width: 100% !important;
                height: auto !important;
                display: block !important;
              }
              .email-body-wrapper table {
                display: block !important;
                overflow-x: auto !important;
                max-width: 100% !important;
                width: auto !important;
              }
              .email-body-wrapper pre {
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                overflow-x: auto !important;
              }
              /* Dark mode email content fixes */
              @media (prefers-color-scheme: dark) {
                .email-body-wrapper,
                .email-body-wrapper > div,
                .email-body-wrapper table,
                .email-body-wrapper td,
                .email-body-wrapper th {
                  background-color: transparent !important;
                  background: none !important;
                }
                .email-body-wrapper * {
                  color: inherit !important;
                }
              }
            `}</style>
            {sanitizedHtml ? (
              <div
                className="email-body-wrapper break-words overflow-hidden bg-transparent dark:bg-transparent"
                style={{
                  unicodeBidi: 'normal',
                  maxWidth: '100%',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                }}
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans break-words overflow-x-auto max-w-full">
                {email.body_text || email.snippet}
              </pre>
            )}
          </div>

          {/* Attachments - Responsive Grid */}
          {email.has_attachments && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Paperclip className="h-4 w-4 flex-shrink-0" />
                <span>{email.attachment_count} attachment(s)</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
