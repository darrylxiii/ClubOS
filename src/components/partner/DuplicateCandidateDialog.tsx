import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Linkedin, Mail, Briefcase, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DuplicateCandidate {
  id: string;
  candidate_id: string;
  current_stage_index: number;
  candidate_profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    linkedin_url: string | null;
    current_title: string | null;
    current_company: string | null;
  };
}

interface DuplicateCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateCandidate[];
  matchType: "name" | "linkedin" | "both" | "email";
  jobTitle?: string;
  onProceed: () => void;
  onCancel: () => void;
}

const STAGE_NAMES = ["Applied", "Screening", "Interview", "Final Round", "Offer", "Hired"];

export const DuplicateCandidateDialog = ({
  open,
  onOpenChange,
  duplicates,
  matchType,
  jobTitle,
  onProceed,
  onCancel,
}: DuplicateCandidateDialogProps) => {
  const getMatchTypeText = () => {
    switch (matchType) {
      case "email":
        return "with the same email address";
      case "name":
        return "with the same name";
      case "linkedin":
        return "with the same LinkedIn profile";
      case "both":
        return "with the same name and LinkedIn profile";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass-card">
        <DialogHeader>
          <div className="flex items-start gap-3 mb-2">
            <div className="p-3 rounded-full bg-gradient-to-br from-orange-500 to-amber-500">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-black uppercase text-orange-500">
                Candidate Already in Pipeline
              </DialogTitle>
              <DialogDescription className="text-base mt-1">
                {duplicates.length === 1 ? "A candidate" : `${duplicates.length} candidates`} {getMatchTypeText()} already {duplicates.length === 1 ? "exists" : "exist"} in <strong className="text-foreground">{jobTitle || "this job"}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-[400px] overflow-y-auto py-2">
          {duplicates.map((duplicate, index) => (
            <div
              key={duplicate.id}
              className="p-4 rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-amber-500/5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-lg">
                      {duplicate.candidate_profiles.full_name || "Unnamed Candidate"}
                    </h4>
                    {matchType === "name" || matchType === "both" ? (
                      <Badge variant="secondary" className="bg-orange-500/20 text-orange-700 dark:text-orange-300">
                        Name Match
                      </Badge>
                    ) : null}
                    {matchType === "linkedin" || matchType === "both" ? (
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300">
                        LinkedIn Match
                      </Badge>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    {duplicate.candidate_profiles.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 text-accent" />
                        <span>{duplicate.candidate_profiles.email}</span>
                      </div>
                    )}

                    {duplicate.candidate_profiles.linkedin_url && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Linkedin className="w-4 h-4 text-blue-500" />
                        <a
                          href={duplicate.candidate_profiles.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent transition-colors truncate"
                        >
                          {duplicate.candidate_profiles.linkedin_url}
                        </a>
                      </div>
                    )}

                    {(duplicate.candidate_profiles.current_title || duplicate.candidate_profiles.current_company) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Briefcase className="w-4 h-4 text-accent" />
                        <span>
                          {duplicate.candidate_profiles.current_title || "Unknown Title"}
                          {duplicate.candidate_profiles.current_company && ` at ${duplicate.candidate_profiles.current_company}`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      <span className="font-medium">
                        Current Stage: <span className="text-accent">{STAGE_NAMES[duplicate.current_stage_index] || `Stage ${duplicate.current_stage_index + 1}`}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/5 space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong className="text-orange-600 dark:text-orange-400">⚠️ Note:</strong> This candidate is already active in <strong>{jobTitle || "this job"}</strong>'s pipeline.
          </p>
          <p className="text-xs text-muted-foreground">
            The same person can apply to <strong>multiple different jobs</strong>, but can only have one active application per job. If you need to re-add them, first reject or withdraw their existing application.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Go Back
          </Button>
          <Button
            type="button"
            onClick={onProceed}
            variant="outline"
            className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <AlertTriangle className="w-4 h-4" />
            Try Adding Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
