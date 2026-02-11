import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { X, Paperclip, Send, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailComposerProps {
  open: boolean;
  onClose: () => void;
  replyTo?: {
    email: string;
    subject: string;
  };
}

export function EmailComposer({ open, onClose, replyTo }: EmailComposerProps) {
  const [to, setTo] = useState(replyTo?.email || "");
  const [subject, setSubject] = useState(
    replyTo?.subject ? `Re: ${replyTo.subject}` : ""
  );
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Limit file size to 10MB per file
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async () => {
    if (attachments.length === 0) return [];

    setUploadingAttachments(true);
    const uploadedFiles: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const file of attachments) {
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("email-attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        
        uploadedFiles.push(filePath);
      }

      return uploadedFiles;
    } catch (error) {
      console.error("Failed to upload attachments:", error);
      toast.error("Failed to upload attachments");
      throw error;
    } finally {
      setUploadingAttachments(false);
    }
  };

  const handleAiAssist = async (action: string) => {
    if (!body && action !== "compose") {
      toast.error("Write some text first for AI to work with");
      return;
    }

    setAiGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("assist-email-writing", {
        body: {
          action,
          currentText: body,
          subject,
          recipientEmail: to,
        },
      });

      if (error) throw error;

      if (data?.suggestion) {
        setBody(data.suggestion);
        toast.success("AI suggestion applied");
      }
    } catch (error: unknown) {
      console.error("AI assist failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate AI suggestion");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!to || !subject) {
      toast.error("Please fill in recipient and subject");
      return;
    }

    setSending(true);

    try {
      // Upload attachments first
      const attachmentPaths = await uploadAttachments();

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to,
          subject,
          body,
          attachments: attachmentPaths,
          replyToEmailId: replyTo?.email,
        },
      });

      if (error) throw error;

      toast.success("Email sent successfully");
      setTo("");
      setSubject("");
      setBody("");
      setAttachments([]);
      onClose();
    } catch (error: unknown) {
      console.error("Failed to send email:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <SheetTitle>New Message</SheetTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Message</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={aiGenerating}
                      className="h-7 text-xs"
                    >
                      {aiGenerating ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI Assist
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAiAssist("compose")}>
                      <Sparkles className="h-3 w-3 mr-2" />
                      Compose email
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAiAssist("improve")}>
                      Improve writing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAiAssist("shorten")}>
                      Make shorter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAiAssist("expand")}>
                      Make longer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAiAssist("professional")}>
                      More professional
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAiAssist("friendly")}>
                      More friendly
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message or use AI to help you compose..."
                className="min-h-[300px] resize-none"
                disabled={aiGenerating}
              />
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <Badge key={index} variant="secondary" className="pr-1">
                      <Paperclip className="h-3 w-3 mr-1" />
                      {file.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-4 flex items-center justify-between">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAttachments}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Attach
              </Button>
            </div>
            <Button
              onClick={handleSend}
              disabled={sending || uploadingAttachments || !to || !subject}
            >
              {sending || uploadingAttachments ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadingAttachments ? "Uploading..." : "Sending..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
