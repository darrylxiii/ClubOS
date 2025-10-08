import { Message } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Check, CheckCheck, Volume2, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { UserProfilePreview } from "@/components/UserProfilePreview";
import { MessageActions } from "./MessageActions";
import { MessageReactionsDisplay } from "./MessageReactionsDisplay";
import { OnlineStatusIndicator } from "./OnlineStatusIndicator";
import { supabase } from "@/integrations/supabase/client";

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  isGroup?: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MessageBubble = ({
  message,
  isCurrentUser,
  isGroup,
  onReply,
  onEdit,
  onDelete,
}: MessageBubbleProps) => {
  const navigate = useNavigate();
  const senderName = message.sender?.full_name || "Unknown User";
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const renderContent = () => {
    if (message.gif_url) {
      return (
        <img
          src={message.gif_url}
          alt="GIF"
          className="max-w-xs rounded-lg"
        />
      );
    }

    if (message.media_type === 'audio' && message.media_url) {
      return (
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          <audio controls src={message.media_url} className="max-w-xs" />
          <span className="text-xs opacity-70">
            {message.media_duration ? `${Math.floor(message.media_duration / 60)}:${(message.media_duration % 60).toString().padStart(2, '0')}` : ''}
          </span>
        </div>
      );
    }

    return <p className="break-words">{message.content}</p>;
  };

  return (
    <div 
      className={cn(
        "flex gap-3 group animate-fade-in relative",
        isCurrentUser && "flex-row-reverse"
      )}
    >
      {message.pinned_at && (
        <div className="absolute -top-4 left-0 flex items-center gap-1 text-xs text-muted-foreground">
          <Pin className="h-3 w-3" />
          <span>Pinned</span>
        </div>
      )}

      {/* Avatar with online status */}
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="relative">
            <Avatar 
              className="h-10 w-10 cursor-pointer shadow-glass-sm ring-2 ring-background hover:ring-primary/50 transition-all"
              onClick={() => navigate(`/profile/${message.sender_id}`)}
            >
              <AvatarImage src={message.sender?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-accent text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!isCurrentUser && (
              <OnlineStatusIndicator 
                userId={message.sender_id} 
                className="absolute bottom-0 right-0"
              />
            )}
          </div>
        </HoverCardTrigger>
        <HoverCardContent side="left" className="w-80 glass-card p-0">
          <UserProfilePreview userId={message.sender_id} />
        </HoverCardContent>
      </HoverCard>

      {/* Message Content & Actions */}
      <div className="flex flex-col max-w-lg">
        {!isCurrentUser && isGroup && (
          <span className="text-xs font-medium mb-1 px-2 text-muted-foreground hover:text-accent transition-colors cursor-pointer"
            onClick={() => navigate(`/profile/${message.sender_id}`)}>
            {senderName}
          </span>
        )}

        <div className="flex flex-col gap-1">
          <div
            className={cn(
              "rounded-2xl px-4 py-2 max-w-md glass-card shadow-glass-sm",
              isCurrentUser
                ? "bg-gradient-accent text-white"
                : "glass-subtle"
            )}
          >
            {renderContent()}

            {/* Read receipt for current user */}
            {isCurrentUser && (
              <div className="flex items-center justify-end gap-1 mt-1">
                {message.is_read ? (
                  <CheckCheck className="h-3 w-3 text-primary" />
                ) : (
                  <Check className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            )}

            {/* Image/Video attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment) => {
                  if (attachment.file_type.startsWith('image/')) {
                    return (
                      <a
                        key={attachment.id}
                        href={`${supabase.storage.from('message-attachments').getPublicUrl(attachment.file_path).data.publicUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={`${supabase.storage.from('message-attachments').getPublicUrl(attachment.file_path).data.publicUrl}`}
                          alt={attachment.file_name}
                          className="max-w-xs rounded-lg"
                        />
                      </a>
                    );
                  }
                  return (
                    <a
                      key={attachment.id}
                      href={`${supabase.storage.from('message-attachments').getPublicUrl(attachment.file_path).data.publicUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline hover:no-underline"
                    >
                      {attachment.file_name}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reactions */}
          <MessageReactionsDisplay messageId={message.id} />
        </div>

        {/* Actions & Timestamp */}
        <div className={cn(
          "flex items-center gap-2 mt-1 px-2",
          isCurrentUser && "flex-row-reverse"
        )}>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), "HH:mm")}
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <MessageActions 
              message={message as any}
              isOwnMessage={isCurrentUser}
              onEdit={onEdit}
              onReply={onReply}
              onDelete={onDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
