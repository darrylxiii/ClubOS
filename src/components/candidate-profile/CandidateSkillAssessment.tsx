import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { AssessmentBreakdown } from "@/hooks/useAssessmentScores";
import { SkillMatchBreakdown } from "./SkillMatchBreakdown";
import { CultureFitSignals } from "./CultureFitSignals";
import { EngagementTimeline } from "./EngagementTimeline";
import { AvailabilityNoticeCard } from "./AvailabilityNoticeCard";
import { SalaryComparisonVisualizer } from "./SalaryComparisonVisualizer";
import { CareerTrajectoryTimeline } from "./CareerTrajectoryTimeline";

interface CandidateSkillAssessmentProps {
  candidateId: string;
  candidate: any;
  jobId?: string | null;
  skills?: any[];
  breakdown?: AssessmentBreakdown | null;
  error?: string | null;
  isComputing?: boolean;
  onRecompute?: () => void;
}

export function CandidateSkillAssessment({ candidateId, candidate, jobId, skills = [], breakdown, error, isComputing, onRecompute }: CandidateSkillAssessmentProps) {
  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
          <span className="text-destructive/90 flex-1">{error}</span>
          {onRecompute && (
            <Button variant="ghost" size="sm" onClick={onRecompute} disabled={isComputing} className="text-xs h-7">
              <RefreshCw className={`w-3 h-3 mr-1 ${isComputing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Skill Match Breakdown */}
      <SkillMatchBreakdown
        candidateId={candidateId}
        candidate={candidate}
        jobId={jobId}
        breakdown={breakdown}
        skills={skills}
      />

      {/* Culture Fit + Engagement Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CultureFitSignals
          candidateId={candidateId}
          breakdown={breakdown}
        />
        <EngagementTimeline
          candidateId={candidateId}
          breakdown={breakdown}
        />
      </div>

      {/* Salary + Availability + Trajectory Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SalaryComparisonVisualizer
          candidate={candidate}
          breakdown={breakdown}
        />
        <AvailabilityNoticeCard
          candidate={candidate}
        />
        <CareerTrajectoryTimeline
          candidate={candidate}
        />
      </div>
    </div>
  );
}
