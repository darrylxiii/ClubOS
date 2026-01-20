import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { CandidateSelectorTable } from "./CandidateSelectorTable";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailTemplate {
  id: string;
  name: string;
  subject_template: string | null;
  content_template: string | null;
}

export const BulkEmailTab = () => {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  // Fetch email templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        // Use any to bypass excessive type instantiation
        const client = supabase as any;
        const { data } = await client
          .from("email_templates")
          .select("id, name, subject_template, content_template")
          .eq("is_active", true)
          .order("name");
        if (data) {
          setTemplates(data as EmailTemplate[]);
        }
      } catch (err) {
        console.error("Failed to fetch templates:", err);
      }
    };
    fetchTemplates();
  }, []);

  // Apply template
  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      setSubject(String(template.subject_template || ""));
      setMessage(String(template.content_template || ""));
    }
  };

  // Send bulk email mutation
  const sendBulkEmail = useMutation({
    mutationFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error("Not authenticated");

      // Use any to bypass type issues
      const client = supabase as any;

      // Log the bulk operation
      const { data: log, error: logError } = await client
        .from("bulk_operation_logs")
        .insert({
          operation_type: "email",
          admin_id: user.id,
          target_count: selectedCandidates.length,
          status: "processing",
          started_at: new Date().toISOString(),
          metadata: { subject, template_id: templateId || null },
          target_ids: selectedCandidates,
        })
        .select()
        .single();

      if (logError) throw logError;

      // Get candidate emails
      const { data: candidates, error: candidatesError } = await client
        .from("candidate_profiles")
        .select("id, email, full_name")
        .in("id", selectedCandidates);

      if (candidatesError) throw candidatesError;

      let successCount = 0;
      let failureCount = 0;
      const errors: any[] = [];

      // Send emails
      for (const candidate of candidates || []) {
        try {
          const { error } = await supabase.functions.invoke("send-email", {
            body: {
              to: candidate.email,
              subject,
              html: message.replace(/{{name}}/g, candidate.full_name || "Candidate"),
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
      await client
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
      toast.success(`Emails sent: ${result.successCount} success, ${result.failureCount} failed`);
      setSelectedCandidates([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to send emails: ${error.message}`);
    },
  });

  const canSend = selectedCandidates.length > 0 && subject.trim() && message.trim();

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

      {/* Email Composition */}
      <div className="space-y-4 border-t pt-6">
        <div>
          <Label htmlFor="template">Email Template (Optional)</Label>
          <Select value={templateId} onValueChange={handleTemplateSelect}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select a template or write custom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom Email</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message... Use {{name}} for personalization"
            rows={8}
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Available variables: {"{{name}}"} - Candidate's full name
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will send {selectedCandidates.length} email{selectedCandidates.length !== 1 ? "s" : ""}. 
            Please review carefully before sending.
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => sendBulkEmail.mutate()}
          disabled={!canSend || sendBulkEmail.isPending}
          className="w-full sm:w-auto"
        >
          {sendBulkEmail.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send {selectedCandidates.length} Email{selectedCandidates.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
