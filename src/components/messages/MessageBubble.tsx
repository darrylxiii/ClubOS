import { Message } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Check, CheckCheck, Volume2, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
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
        <div className="absolute -top-5 left-0 flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20 shadow-glass-sm">
          <Pin className="h-3 w-3" />
          <span>Pinned Message</span>
        </div>
      )}

      {/* Avatar with online status */}
      <div className="relative">
        <Avatar 
          className="h-11 w-11 cursor-pointer shadow-glass-md ring-2 ring-background hover:ring-primary/60 hover:scale-105 transition-all duration-200"
          onClick={() => navigate(`/profile/${message.sender_id}`)}
        >
          <AvatarImage src={message.sender?.avatar_url || undefined} className="object-cover" />
          <AvatarFallback className="bg-gradient-accent text-white font-semibold text-base">
            {initials}
          </AvatarFallback>
        </Avatar>
        {!isCurrentUser && (
          <OnlineStatusIndicator 
            userId={message.sender_id} 
            className="absolute bottom-0 right-0 ring-2 ring-background"
          />
        )}
      </div>

      {/* Message Content & Actions */}
      <div className="flex flex-col max-w-lg">
        {!isCurrentUser && isGroup && (
          <span className="text-xs font-semibold mb-1.5 px-3 text-foreground/80 hover:text-primary transition-colors cursor-pointer"
            onClick={() => navigate(`/profile/${message.sender_id}`)}>
            {senderName}
          </span>
        )}

        <div className="flex flex-col gap-1.5 relative">
          <div className="flex items-end gap-2">
            <div
              className={cn(
                "rounded-2xl px-4 py-3 max-w-md shadow-glass-md backdrop-blur-xl transition-all duration-200",
                "hover:shadow-glass-lg hover:scale-[1.01]",
                isCurrentUser
                  ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-white font-medium shadow-glow"
                  : "glass-strong border border-border/50 text-foreground"
              )}
            >
              {renderContent()}

              {/* Read receipt for current user */}
              {isCurrentUser && (
                <div className="flex items-center justify-end gap-1 mt-1.5">
                  {message.is_read ? (
                    <CheckCheck className="h-3.5 w-3.5 text-white/90" />
                  ) : (
                    <Check className="h-3.5 w-3.5 text-white/60" />
                  )}
                </div>
              )}

              {/* Image/Video attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.attachments.map((attachment) => {
                    if (attachment.file_type.startsWith('image/')) {
                      return (
                        <a
                          key={attachment.id}
                          href={`${supabase.storage.from('message-attachments').getPublicUrl(attachment.file_path).data.publicUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-xl overflow-hidden shadow-glass-md hover:shadow-glass-lg transition-shadow"
                        >
                          <img
                            src={`${supabase.storage.from('message-attachments').getPublicUrl(attachment.file_path).data.publicUrl}`}
                            alt={attachment.file_name}
                            className="max-w-xs rounded-xl hover:scale-105 transition-transform duration-300"
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
                        className="text-sm font-medium underline hover:no-underline text-primary transition-colors"
                      >
                        {attachment.file_name}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reactions inline with message */}
            <div className={cn("flex-shrink-0 mb-1", isCurrentUser && "order-first")}>
              <MessageReactionsDisplay messageId={message.id} />
            </div>
          </div>
        </div>

        {/* Actions & Timestamp */}
        <div className={cn(
          "flex items-center gap-2 mt-1.5 px-2",
          isCurrentUser && "flex-row-reverse"
        )}>
          <span className="text-xs font-medium text-muted-foreground/80">
            {format(new Date(message.created_at), "HH:mm")}
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
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
