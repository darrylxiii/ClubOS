import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MatchScoreBreakdown } from "./MatchScoreBreakdown";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface MatchScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  company: string;
  tags: string[];
  matchScore: number;
}

export const MatchScoreDialog = ({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  company,
  tags,
  matchScore,
}: MatchScoreDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !breakdown) {
      fetchOrCalculateBreakdown();
    }
  }, [open, jobId]);

  const fetchOrCalculateBreakdown = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Check if we already have a breakdown
      const { data: existingScore, error: fetchError } = await supabase
        .from('match_scores')
        .select('*')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingScore) {
        setBreakdown(existingScore);
      } else {
        // Calculate new breakdown
        const { data, error } = await supabase.functions.invoke('calculate-match-score', {
          body: { jobId, jobTitle, company, tags, userId: user.id }
        });

        if (error) throw error;

        if (data.analysis) {
          setBreakdown({
            ...data.analysis,
            user_id: user.id,
            job_id: jobId,
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching match breakdown:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load match breakdown",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Match Score Breakdown</DialogTitle>
          <DialogDescription>
            {jobTitle} at {company}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : breakdown ? (
          <MatchScoreBreakdown
            overallScore={breakdown.overall_score}
            requiredCriteriaMet={breakdown.required_criteria_met}
            requiredCriteriaTotal={breakdown.required_criteria_total}
            preferredCriteriaMet={breakdown.preferred_criteria_met}
            preferredCriteriaTotal={breakdown.preferred_criteria_total}
            clubMatchFactors={breakdown.club_match_factors}
            clubMatchScore={breakdown.club_match_score}
            additionalFactors={breakdown.additional_factors}
            gaps={breakdown.gaps}
            hardStops={breakdown.hard_stops}
            quickWins={breakdown.quick_wins}
            longerTermActions={breakdown.longer_term_actions}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No breakdown available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};