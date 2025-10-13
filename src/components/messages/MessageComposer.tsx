import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Paperclip,
  Send,
  Loader2,
  Music,
} from "lucide-react";
import { useState, useRef, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EnhancedEmojiPicker } from "./EnhancedEmojiPicker";
import { GifPicker } from "./GifPicker";
import { VoiceRecorder } from "./VoiceRecorder";
import { YouTubePicker } from "./YouTubePicker";
import { validatePostMediaFile } from "@/lib/fileValidation";
import { extractSpotifyInfo } from "@/lib/spotifyEmbedUtils";

interface MessageComposerProps {
  conversationId: string;
  onSend: (content: string, attachment?: File, metadata?: any) => Promise<void>;
  onTyping?: () => void;
  disabled?: boolean;
}

export const MessageComposer = ({
  conversationId,
  onSend,
  onTyping,
  disabled,
}: MessageComposerProps) => {
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSend = async () => {
    if ((!message.trim() && !attachment) || sending) return;

    setSending(true);
    try {
      await onSend(message.trim(), attachment || undefined);
      setMessage("");
      setAttachment(null);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      const validation = validatePostMediaFile(file);
      if (!validation.valid) {
        toast({
          title: "Invalid file",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }
      setAttachment(file);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  const handleGifSelect = async (gifUrl: string) => {
    try {
      await onSend("", undefined, { gif_url: gifUrl });
      toast({ title: "GIF sent" });
    } catch (error) {
      console.error("Error sending GIF:", error);
      toast({
        title: "Failed to send GIF",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleVoiceSend = async (audioUrl: string, duration: number) => {
    try {
      await onSend("", undefined, { 
        media_type: 'audio', 
        media_url: audioUrl, 
        media_duration: duration 
      });
    } catch (error) {
      console.error("Error sending voice message:", error);
      toast({
        title: "Failed to send voice message",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleYouTubeSelect = async (videoId: string, url: string) => {
    try {
      await onSend(message.trim() || "", undefined, {
        media_type: 'youtube',
        media_url: url,
      });
      setMessage("");
      toast({ title: "YouTube video shared" });
    } catch (error) {
      console.error("Error sending YouTube video:", error);
      toast({
        title: "Failed to share video",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSpotifySelect = async (url: string) => {
    const spotifyInfo = extractSpotifyInfo(url);
    if (spotifyInfo) {
      try {
        await onSend(message.trim() || "", undefined, {
          media_type: 'spotify',
          media_url: url,
          spotify_type: spotifyInfo.type,
          spotify_id: spotifyInfo.id,
        });
        setMessage("");
        toast({ title: `Spotify ${spotifyInfo.type} shared` });
      } catch (error) {
        console.error("Error sending Spotify:", error);
        toast({
          title: "Failed to share Spotify",
          description: "Please try again",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Invalid Spotify link",
        description: "Please enter a valid Spotify URL",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-background p-3 md:p-4 border-t border-border/20">
      {attachment && (
        <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm font-medium bg-muted/50 p-2 sm:p-3 rounded-lg border border-border/20">
          <Paperclip className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
          <span className="truncate text-foreground">{attachment.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAttachment(null)}
            className="ml-auto hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors text-xs h-7"
          >
            Remove
          </Button>
        </div>
      )}

      {/* Controls row - above the message input */}
      <div className="flex items-center gap-1 mb-3 pb-3 border-b border-border/10">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx"
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          className="flex-shrink-0 rounded-lg h-9 w-9 hover:bg-muted"
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <EnhancedEmojiPicker onSelect={handleEmojiSelect} />
        
        <GifPicker onSelect={handleGifSelect} />

        <YouTubePicker onSelect={handleYouTubeSelect} />
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hover:bg-muted"
              disabled={disabled}
              title="Share Spotify"
            >
              <Music className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Share Spotify</h4>
              <p className="text-xs text-muted-foreground">
                Paste a Spotify link (song, album, playlist, or podcast)
              </p>
              <Input
                placeholder="https://open.spotify.com/track/..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSpotifySelect(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Message input row with voice note inside */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 bottom-2.5 z-10">
            <VoiceRecorder onSend={handleVoiceSend} />
          </div>
          <Textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              onTyping?.();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled || sending}
            className="min-h-[42px] max-h-32 resize-none bg-muted/30 border-border/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm pl-12 pr-3 py-2.5"
            rows={1}
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={disabled || sending || (!message.trim() && !attachment)}
          size="icon"
          className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
};
