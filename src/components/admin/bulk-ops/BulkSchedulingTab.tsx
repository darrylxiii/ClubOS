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
import { useTranslation } from 'react-i18next';

export const BulkSchedulingTab = () => {
  const { t } = useTranslation('admin');
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
        .select("id, title, slug, duration_minutes")
        .eq("is_active", true)
        .order("title");
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
      toast.success(t('bulk-ops.bulkSchedulingTab.bookingLinkCopied'));
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
              subject: `Schedule your ${selectedLink.title} (${selectedLink.duration_minutes} min)`,
              html: emailBody,
            },
          });
          if (error) throw error;
          successCount++;
        } catch (err: unknown) {
          failureCount++;
          errors.push({ candidate_id: candidate.id, error: err instanceof Error ? err.message : 'Unknown error' });
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
      toast.success(t('bulk-ops.bulkSchedulingTab.linksSentResult', 'Scheduling links sent: {{success}} success, {{failed}} failed', { success: result.successCount, failed: result.failureCount }));
      setSelectedCandidates([]);
    },
    onError: (error: Error) => {
      toast.error(t('bulk-ops.bulkSchedulingTab.failedToSend', 'Failed to send scheduling links: {{error}}', { error: error.message }));
    },
  });

  const canSend = selectedCandidates.length > 0 && bookingLinkId;

  return (
    <div className="space-y-6">
      {/* Candidate Selection */}
      <div>
        <Label className="mb-2 block">{t('bulk-ops.bulkSchedulingTab.selectRecipients')}</Label>
        <CandidateSelectorTable
          selectedCandidates={selectedCandidates}
          onSelectionChange={setSelectedCandidates}
        />
      </div>

      {/* Scheduling Configuration */}
      <div className="space-y-4 border-t pt-6">
        <div>
          <Label htmlFor="bookingLink">{t('bulk-ops.bulkSchedulingTab.bookingLink')}</Label>
          <Select value={bookingLinkId} onValueChange={setBookingLinkId}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={t('bulk-ops.bulkSchedulingTab.selectABookingLink')} />
            </SelectTrigger>
            <SelectContent>
              {bookingLinks?.map((link) => (
                <SelectItem key={link.id} value={link.id}>
                  {link.title} ({link.duration_minutes} {t('bulk-ops.bulkSchedulingTab.min', 'min')})
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
          <Label htmlFor="message">{t('bulk-ops.bulkSchedulingTab.customMessageOptional')}</Label>
          <Textarea
            id="message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder={t('bulk-ops.bulkSchedulingTab.customMessagePlaceholder', 'Add a personal message... Use {{name}} for personalization, {{link}} for booking URL')}
            rows={4}
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('bulk-ops.bulkSchedulingTab.variables', 'Variables')}: {"{{name}}"}, {"{{link}}"}
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
              {t('bulk-ops.bulkSchedulingTab.sending', 'Sending...')}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {t('bulk-ops.bulkSchedulingTab.sendToCandidates', 'Send to {{count}} Candidate(s)', { count: selectedCandidates.length })}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
