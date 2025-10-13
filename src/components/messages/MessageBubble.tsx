import { Message } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Check, CheckCheck, Volume2, Pin, FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { MessageActions } from "./MessageActions";
import { MessageReactionsDisplay } from "./MessageReactionsDisplay";
import { OnlineStatusIndicator } from "./OnlineStatusIndicator";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { extractYouTubeVideoId } from "@/lib/youtubeUtils";
import { SpotifyEmbed } from "@/components/feed/SpotifyEmbed";

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
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  
  const senderName = message.sender?.full_name || "Unknown User";
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Generate signed URLs for attachments
  useEffect(() => {
    const loadAttachmentUrls = async () => {
      if (!message.attachments || message.attachments.length === 0) return;
      
      console.log('Loading attachment URLs for message:', message.id, message.attachments);
      
      const urls: Record<string, string> = {};
      
      for (const attachment of message.attachments) {
        try {
          const { data, error } = await supabase.storage
            .from('message-attachments')
            .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry
          
          if (data?.signedUrl) {
            urls[attachment.id] = data.signedUrl;
            console.log('Generated signed URL for:', attachment.file_name);
          } else {
            console.error('Failed to generate signed URL for:', attachment.file_name, error);
          }
        } catch (err) {
          console.error('Error loading attachment URL:', err);
        }
      }
      
      console.log('Final attachment URLs:', urls);
      setAttachmentUrls(urls);
    };
    
    loadAttachmentUrls();
  }, [message.attachments, message.id]);

  const renderContent = () => {
    // Check for Spotify
    if (message.media_type === 'spotify' && message.media_url) {
      const spotifyType = (message as any).spotify_type;
      const spotifyId = (message as any).spotify_id;
      if (spotifyType && spotifyId) {
        return (
          <div className="space-y-2">
            <SpotifyEmbed 
              type={spotifyType}
              spotifyId={spotifyId}
              url={message.media_url}
            />
            {message.content && message.content.trim() && (
              <p className="break-words text-sm mt-2">{message.content}</p>
            )}
          </div>
        );
      }
    }

    // Check for YouTube video
    if (message.media_type === 'youtube' && message.media_url) {
      const videoId = extractYouTubeVideoId(message.media_url);
      if (videoId) {
        return (
          <div className="space-y-2">
            <YouTubeEmbed videoId={videoId} isOwnMessage={isCurrentUser} />
            {message.content && message.content.trim() && (
              <p className="break-words text-sm mt-2">{message.content}</p>
            )}
          </div>
        );
      }
    }

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

    // Only show text content if it exists
    if (message.content && message.content.trim()) {
      return <p className="break-words">{message.content}</p>;
    }

    // Return null if no content (attachments will be shown below)
    return null;
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
      <div className="relative h-11 w-11 flex-shrink-0">
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
            className="absolute bottom-1 right-1 w-3.5 h-3.5 ring-2 ring-background"
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
          <div className="flex items-start gap-2">
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

              {/* Read receipt with timestamp for current user */}
              {isCurrentUser && (
                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                  <span className="text-[10px] text-white/60">
                    {message.read_at 
                      ? `Read ${format(new Date(message.read_at), "HH:mm")}`
                      : 'Sent'
                    }
                  </span>
                  {message.read_at ? (
                    <CheckCheck className="h-3.5 w-3.5 text-white/90" />
                  ) : (
                    <Check className="h-3.5 w-3.5 text-white/60" />
                  )}
                </div>
              )}

              {/* Image/Video/Document attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.attachments.map((attachment) => {
                    const url = attachmentUrls[attachment.id];
                    if (!url) {
                      return (
                        <div key={attachment.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>Loading {attachment.file_name}...</span>
                        </div>
                      );
                    }

                    // Image attachments
                    if (attachment.file_type.startsWith('image/')) {
                      return (
                        <a
                          key={attachment.id}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-xl overflow-hidden shadow-glass-md hover:shadow-glass-lg transition-shadow"
                        >
                          <img
                            src={url}
                            alt={attachment.file_name}
                            className="max-w-xs rounded-xl hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </a>
                      );
                    }
                    
                    // Video attachments
                    if (attachment.file_type.startsWith('video/')) {
                      return (
                        <video
                          key={attachment.id}
                          controls
                          className="max-w-xs rounded-xl shadow-glass-md"
                        >
                          <source src={url} type={attachment.file_type} />
                          Your browser doesn't support video playback.
                        </video>
                      );
                    }
                    
                    // Document attachments (PDF, DOC, etc)
                    const fileSize = attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : '';
                    return (
                      <a
                        key={attachment.id}
                        href={url}
                        download={attachment.file_name}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl shadow-glass-sm hover:shadow-glass-md transition-all",
                          "border border-border/30 hover:border-primary/30 group",
                          isCurrentUser ? "bg-white/10" : "bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-lg",
                          isCurrentUser ? "bg-white/20" : "bg-primary/10"
                        )}>
                          <FileText className={cn(
                            "h-5 w-5",
                            isCurrentUser ? "text-white" : "text-primary"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            isCurrentUser ? "text-white" : "text-foreground"
                          )}>
                            {attachment.file_name}
                          </p>
                          {fileSize && (
                            <p className={cn(
                              "text-xs",
                              isCurrentUser ? "text-white/70" : "text-muted-foreground"
                            )}>
                              {fileSize}
                            </p>
                          )}
                        </div>
                        <Download className={cn(
                          "h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity",
                          isCurrentUser ? "text-white/80" : "text-primary"
                        )} />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timestamp and Actions inline */}
            <div className={cn(
              "flex items-center gap-1.5 text-xs text-muted-foreground/80 mt-3",
              isCurrentUser && "order-first flex-row-reverse"
            )}>
              <span className="font-medium whitespace-nowrap">
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

          {/* Reactions at bottom right */}
          <div className={cn(
            "flex justify-end mt-1",
            !isCurrentUser && "justify-start"
          )}>
            <MessageReactionsDisplay messageId={message.id} />
          </div>
        </div>
      </div>
    </div>
  );
};
