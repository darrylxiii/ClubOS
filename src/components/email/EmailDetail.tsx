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
    ? DOMPurify.sanitize(email.body_html)
    : null;

  return (
    <div key={email.id} className="flex-1 flex flex-col bg-background transition-all duration-200 ease-in-out">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onReply}>
          <Reply className="h-4 w-4 mr-2" />
          Reply
        </Button>
        <Button variant="ghost" size="sm" onClick={onForward}>
          <Forward className="h-4 w-4 mr-2" />
          Forward
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={onArchive}>
          <Archive className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleStar(!email.is_starred)}
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
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-full overflow-hidden">
          {/* Subject */}
          <h1 className="text-2xl font-semibold">{email.subject}</h1>

          {/* Sender Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {email.from_avatar_url && (
                <AvatarImage src={email.from_avatar_url} alt={email.from_name || email.from_email} />
              )}
              <AvatarFallback>
                {getInitials(email.from_name || email.from_email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium">
                {email.from_name || email.from_email}
              </div>
              <div className="text-sm text-muted-foreground">
                {email.from_email}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(email.email_date), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>

          {/* To/Cc */}
          <div className="text-sm text-muted-foreground">
            <span>To: </span>
            {email.to_emails.map((to, i) => (
              <span key={i}>
                {to.name || to.email}
                {i < email.to_emails.length - 1 && ", "}
              </span>
            ))}
          </div>

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
          <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto break-words">
            <style>{`
              .prose img {
                max-width: 100% !important;
                height: auto !important;
              }
              .prose table {
                display: block !important;
                overflow-x: auto !important;
                max-width: 100% !important;
              }
              .prose pre {
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                overflow-x: auto !important;
              }
            `}</style>
            {sanitizedHtml ? (
              <div 
                className="break-words overflow-hidden" 
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }} 
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans break-words overflow-x-auto">
                {email.body_text || email.snippet}
              </pre>
            )}
          </div>

          {/* Attachments */}
          {email.has_attachments && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Paperclip className="h-4 w-4" />
                {email.attachment_count} attachment(s)
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
