import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Search, CheckCircle2, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface AddToJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  onAdded?: () => void;
}

interface JobResult {
  id: string;
  title: string;
  company_name: string | null;
  status: string;
  pipeline_stages: any[] | null;
  alreadyInPipeline?: boolean;
}

export const AddToJobDialog = ({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  onAdded,
}: AddToJobDialogProps) => {
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [existingJobIds, setExistingJobIds] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
  const [startStageIndex, setStartStageIndex] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  // Fetch active jobs + candidate's existing applications
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch active jobs
        const { data: jobsData } = await supabase
          .from("jobs")
          .select("id, title, company_name, status, pipeline_stages")
          .in("status", ["active", "open", "published"])
          .order("created_at", { ascending: false })
          .limit(100);

        // Fetch candidate's existing active applications
        const { data: existingApps } = await supabase
          .from("applications")
          .select("job_id")
          .eq("candidate_id", candidateId)
          .not("status", "in", '("rejected","withdrawn")');

        const existingIds = new Set(
          (existingApps || []).map((a) => a.job_id).filter(Boolean) as string[]
        );
        setExistingJobIds(existingIds);

        setJobs(
          (jobsData || []).map((j) => ({
            ...j,
            pipeline_stages: j.pipeline_stages as any[] | null,
            alreadyInPipeline: existingIds.has(j.id),
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    setSelectedJob(null);
    setStartStageIndex("0");
    setNotes("");
    setSearch("");
  }, [open, candidateId]);

  const filteredJobs = useMemo(() => {
    if (!debouncedSearch) return jobs;
    const q = debouncedSearch.toLowerCase();
    return jobs.filter(
      (j) =>
        j.title?.toLowerCase().includes(q) ||
        j.company_name?.toLowerCase().includes(q)
    );
  }, [jobs, debouncedSearch]);

  const stages: { name: string }[] = useMemo(() => {
    if (!selectedJob?.pipeline_stages) {
      return [
        { name: "Applied" },
        { name: "Screening" },
        { name: "Interview" },
        { name: "Final Round" },
      ];
    }
    return selectedJob.pipeline_stages as { name: string }[];
  }, [selectedJob]);

  const handleSubmit = async () => {
    if (!selectedJob) return;
    setSubmitting(true);

    try {
      const {
        data: { user: adminUser },
      } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Not authenticated");

      // Insert application
      const { data: newApp, error: appError } = await supabase
        .from("applications")
        .insert({
          user_id: null,
          candidate_id: candidateId,
          job_id: selectedJob.id,
          position: selectedJob.title,
          sourced_by: adminUser.id,
          company_name: selectedJob.company_name || "Unknown",
          current_stage_index: parseInt(startStageIndex),
          status: "active",
          stages: [
            {
              name: "Admin Added",
              status: "in_progress",
              started_at: new Date().toISOString(),
              notes: notes || null,
            },
          ],
        })
        .select("id")
        .single();

      if (appError) {
        if (
          appError.code === "23505" &&
          appError.message?.includes("idx_unique_active_application")
        ) {
          throw new Error(
            `${candidateName} is already active in this job pipeline.`
          );
        }
        throw appError;
      }

      // Log interaction
      await supabase.from("candidate_interactions").insert({
        candidate_id: candidateId,
        application_id: newApp.id,
        interaction_type: "status_change",
        interaction_direction: "internal",
        title: "Added to Job Pipeline",
        content: `Added to **${selectedJob.title}** (${selectedJob.company_name || "N/A"}) at stage ${stages[parseInt(startStageIndex)]?.name || "Applied"}.${notes ? `\n\nNotes: ${notes}` : ""}`,
        created_by: adminUser.id,
        is_internal: true,
        visible_to_candidate: false,
      });

      // Audit log
      await supabase.from("pipeline_audit_logs").insert({
        job_id: selectedJob.id,
        user_id: adminUser.id,
        action: "candidate_added",
        stage_data: {
          candidate_name: candidateName,
          starting_stage: startStageIndex,
          starting_stage_name:
            stages[parseInt(startStageIndex)]?.name || "Applied",
          source: "profile_add_to_job",
        },
        metadata: {
          candidate_id: candidateId,
          application_id: newApp.id,
        },
      });

      toast.success(`Added to ${selectedJob.title}`, {
        description: `${candidateName} is now in the pipeline.`,
      });

      onAdded?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error("Failed to add candidate to job", {
        description: err.message || "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg glass-card">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-full bg-accent/10">
              <Briefcase className="w-5 h-5 text-accent" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Add to Job Pipeline
              </DialogTitle>
              <DialogDescription>
                Add <strong>{candidateName}</strong> to a job without creating a
                duplicate profile.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Job list */}
        <ScrollArea className="h-56 rounded-lg border border-border/40">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active jobs found.
            </p>
          ) : (
            <div className="p-1 space-y-1">
              {filteredJobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const disabled = job.alreadyInPipeline;
                return (
                  <button
                    key={job.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelectedJob(job);
                      setStartStageIndex("0");
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                      disabled
                        ? "opacity-50 cursor-not-allowed"
                        : isSelected
                          ? "bg-accent/10 border border-accent/30"
                          : "hover:bg-foreground/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {job.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.company_name || "No company"}
                        </p>
                      </div>
                      {disabled ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0 border-muted-foreground/30"
                        >
                          Already in pipeline
                        </Badge>
                      ) : isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Stage picker */}
        {selectedJob && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Starting Stage</Label>
              <Select
                value={startStageIndex}
                onValueChange={setStartStageIndex}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Why are you adding this candidate?"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedJob || submitting}
            className="gap-2"
          >
            {submitting ? (
              "Adding..."
            ) : (
              <>
                <Briefcase className="w-4 h-4" />
                Add to Pipeline
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
