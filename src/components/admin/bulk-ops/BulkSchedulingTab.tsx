import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2, Calendar, Copy, Check } from "lucide-react";
import { CandidateSelectorTable } from "./CandidateSelectorTable";
import { Textarea } from "@/components/ui/textarea";

export const BulkSchedulingTab = () => {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [bookingLinkId, setBookingLinkId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Fetch booking links
  const { data: bookingLinks } = useQuery({
    queryKey: ["booking-links-for-bulk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_links")
        .select("id, name, slug, duration_minutes")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Get selected booking link URL
  const selectedLink = bookingLinks?.find((l) => l.id === bookingLinkId);
  const bookingUrl = selectedLink 
    ? `${window.location.origin}/book/${selectedLink.slug}`
    : "";

  const handleCopyUrl = () => {
    if (bookingUrl) {
      navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Booking link copied!");
    }
  };

  // Send scheduling links mutation
  const sendSchedulingLinks = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!selectedLink) throw new Error("No booking link selected");

      // Log the bulk operation
      const { data: log, error: logError } = await supabase
        .from("bulk_operation_logs")
        .insert({
          operation_type: "scheduling",
          admin_id: user.id,
          target_count: selectedCandidates.length,
          status: "processing",
          started_at: new Date().toISOString(),
          metadata: { booking_link_id: bookingLinkId, booking_url: bookingUrl },
          target_ids: selectedCandidates,
        })
        .select()
        .single();

      if (logError) throw logError;

      // Get candidate emails
      const { data: candidates, error: candidatesError } = await supabase
        .from("candidate_profiles")
        .select("id, email, full_name")
        .in("id", selectedCandidates);

      if (candidatesError) throw candidatesError;

      let successCount = 0;
      let failureCount = 0;
      const errors: any[] = [];

      // Send emails with booking links
      for (const candidate of candidates || []) {
        try {
          const personalizedMessage = customMessage
            .replace(/{{name}}/g, candidate.full_name || "Candidate")
            .replace(/{{link}}/g, bookingUrl);

          const emailBody = `
            <p>Hi ${candidate.full_name || "there"},</p>
            ${customMessage ? `<p>${personalizedMessage}</p>` : ""}
            <p>Please use the link below to schedule a meeting:</p>
            <p><a href="${bookingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #C9A24E; color: white; text-decoration: none; border-radius: 6px;">Schedule Meeting</a></p>
            <p>Or copy this link: ${bookingUrl}</p>
            <p>Best regards,<br/>The Quantum Club Team</p>
          `;

          const { error } = await supabase.functions.invoke("send-email", {
            body: {
              to: candidate.email,
              subject: `Schedule your ${selectedLink.name} (${selectedLink.duration_minutes} min)`,
              html: emailBody,
            },
          });
          if (error) throw error;
          successCount++;
        } catch (err: any) {
          failureCount++;
          errors.push({ candidate_id: candidate.id, error: err.message });
        }
      }

      // Update log
      await supabase
        .from("bulk_operation_logs")
        .update({
          status: "completed",
          success_count: successCount,
          failure_count: failureCount,
          error_details: errors.length > 0 ? { errors } : {},
          completed_at: new Date().toISOString(),
        })
        .eq("id", log.id);

      return { successCount, failureCount };
    },
    onSuccess: (result) => {
      toast.success(`Scheduling links sent: ${result.successCount} success, ${result.failureCount} failed`);
      setSelectedCandidates([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to send scheduling links: ${error.message}`);
    },
  });

  const canSend = selectedCandidates.length > 0 && bookingLinkId;

  return (
    <div className="space-y-6">
      {/* Candidate Selection */}
      <div>
        <Label className="mb-2 block">Select Recipients</Label>
        <CandidateSelectorTable
          selectedCandidates={selectedCandidates}
          onSelectionChange={setSelectedCandidates}
        />
      </div>

      {/* Scheduling Configuration */}
      <div className="space-y-4 border-t pt-6">
        <div>
          <Label htmlFor="bookingLink">Booking Link</Label>
          <Select value={bookingLinkId} onValueChange={setBookingLinkId}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select a booking link" />
            </SelectTrigger>
            <SelectContent>
              {bookingLinks?.map((link) => (
                <SelectItem key={link.id} value={link.id}>
                  {link.name} ({link.duration_minutes} min)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {bookingUrl && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm flex-1 truncate">{bookingUrl}</span>
            <Button variant="ghost" size="sm" onClick={handleCopyUrl}>
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        <div>
          <Label htmlFor="message">Custom Message (Optional)</Label>
          <Textarea
            id="message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add a personal message... Use {{name}} for personalization, {{link}} for booking URL"
            rows={4}
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Variables: {"{{name}}"}, {"{{link}}"}
          </p>
        </div>

        <Button
          onClick={() => sendSchedulingLinks.mutate()}
          disabled={!canSend || sendSchedulingLinks.isPending}
          className="w-full sm:w-auto"
        >
          {sendSchedulingLinks.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send to {selectedCandidates.length} Candidate{selectedCandidates.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
