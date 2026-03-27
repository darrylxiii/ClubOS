import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2, ClipboardCheck } from "lucide-react";
import { CandidateSelectorTable } from "./CandidateSelectorTable";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useTranslation } from 'react-i18next';

const ASSESSMENT_TYPES = [
  { id: "values-poker", name: "Values Poker", description: "Discover work values alignment" },
  { id: "swipe-game", name: "Swipe Game", description: "Quick preference assessment" },
  { id: "pressure-cooker", name: "Pressure Cooker", description: "Decision-making under pressure" },
  { id: "blind-spot", name: "Blind Spot Detector", description: "Identify hidden biases" },
  { id: "miljoenenjacht", name: "Miljoenenjacht", description: "Risk assessment game" },
];

export const BulkAssessmentTab = () => {
  const { t } = useTranslation('admin');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [assessmentType, setAssessmentType] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Fetch jobs for context
  const { data: jobs } = useQuery({
    queryKey: ["jobs-for-assessment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, companies(name)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const [selectedJob, setSelectedJob] = useState<string>("");

  // Assign assessments mutation
  const assignAssessments = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Log the bulk operation
      const { data: log, error: logError } = await supabase
        .from("bulk_operation_logs")
        .insert({
          operation_type: "assessment",
          admin_id: user.id,
          target_count: selectedCandidates.length,
          status: "processing",
          started_at: new Date().toISOString(),
          metadata: { assessment_type: assessmentType, job_id: selectedJob || null },
          target_ids: selectedCandidates,
        })
        .select()
        .single();

      if (logError) throw logError;

      let successCount = 0;
      let failureCount = 0;
      const errors: any[] = [];

      // Create assessment assignments
      for (const candidateId of selectedCandidates) {
        try {
          const { error } = await supabase
            .from("assessment_assignments")
            .insert({
              assessment_id: assessmentType,
              assessment_type: assessmentType,
              assigned_to: candidateId,
              assigned_by: user.id,
              job_id: selectedJob || null,
              due_date: dueDate || null,
              notes: customMessage || null,
              status: "pending",
            });
          
          if (error) throw error;
          successCount++;
        } catch (err: unknown) {
          failureCount++;
          errors.push({ candidate_id: candidateId, error: err instanceof Error ? err.message : 'Unknown error' });
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
      toast.success(`Assessments assigned: ${result.successCount} success, ${result.failureCount} failed`);
      setSelectedCandidates([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign assessments: ${error.message}`);
    },
  });

  const canAssign = selectedCandidates.length > 0 && assessmentType;

  return (
    <div className="space-y-6">
      {/* Candidate Selection */}
      <div>
        <Label className="mb-2 block">{t('bulk-ops.bulkAssessmentTab.selectCandidates')}</Label>
        <CandidateSelectorTable
          selectedCandidates={selectedCandidates}
          onSelectionChange={setSelectedCandidates}
          filterByHasAccount={true}
        />
      </div>

      {/* Assessment Configuration */}
      <div className="space-y-4 border-t pt-6">
        <div>
          <Label htmlFor="assessment">{t('bulk-ops.bulkAssessmentTab.assessmentType')}</Label>
          <Select value={assessmentType} onValueChange={setAssessmentType}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={t('bulk-ops.bulkAssessmentTab.selectAnAssessment')} />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_TYPES.map((assessment) => (
                <SelectItem key={assessment.id} value={assessment.id}>
                  <div className="flex flex-col">
                    <span>{assessment.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {assessment.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="job">{t('bulk-ops.bulkAssessmentTab.relatedJobOptional')}</Label>
          <Select value={selectedJob} onValueChange={setSelectedJob}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={t('bulk-ops.bulkAssessmentTab.linkToAJob')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No job linked</SelectItem>
              {jobs?.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title} - {(job.companies as any)?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="dueDate">{t('bulk-ops.bulkAssessmentTab.dueDateOptional')}</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="message">{t('bulk-ops.bulkAssessmentTab.customMessageOptional')}</Label>
          <Textarea
            id="message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder={t('bulk-ops.bulkAssessmentTab.addANoteForTheCandidate')}
            rows={3}
            className="mt-1.5"
          />
        </div>

        <Button
          onClick={() => assignAssessments.mutate()}
          disabled={!canAssign || assignAssessments.isPending}
          className="w-full sm:w-auto"
        >
          {assignAssessments.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Assigning...
            </>
          ) : (
            <>
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Assign to {selectedCandidates.length} Candidate{selectedCandidates.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
