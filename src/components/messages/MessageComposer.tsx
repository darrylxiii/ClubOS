import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Paperclip,
  Send,
  Loader2,
} from "lucide-react";
import { useState, useRef, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EnhancedEmojiPicker } from "./EnhancedEmojiPicker";
import { GifPicker } from "./GifPicker";
import { VoiceRecorder } from "./VoiceRecorder";

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
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
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
    await onSend("", undefined, { gif_url: gifUrl });
    toast({ title: "GIF sent" });
  };

  const handleVoiceSend = async (audioUrl: string, duration: number) => {
    await onSend("", undefined, { 
      media_type: 'audio', 
      media_url: audioUrl, 
      media_duration: duration 
    });
  };

  return (
    <div className="border-t border-border/20 bg-background p-3 md:p-4">
      {attachment && (
        <div className="mb-2 flex items-center gap-2 text-xs sm:text-sm font-medium bg-muted/50 p-2 sm:p-3 rounded-lg border border-border/20">
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

      <div className="flex items-end gap-2">
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
          className="flex-shrink-0 rounded-lg h-10 w-10"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <EnhancedEmojiPicker onSelect={handleEmojiSelect} />
        
        <GifPicker onSelect={handleGifSelect} />

        <VoiceRecorder onSend={handleVoiceSend} />

        <Textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            onTyping?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled || sending}
          className="min-h-[42px] max-h-32 resize-none bg-muted/30 border-border/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm px-3 py-2"
          rows={1}
        />

        <Button
          onClick={handleSend}
          disabled={disabled || sending || (!message.trim() && !attachment)}
          size="icon"
          className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-2 px-1 hidden sm:block">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};
