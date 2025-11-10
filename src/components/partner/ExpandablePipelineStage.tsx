import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { StageDetailCard } from "./StageDetailCard";
import { StageCandidatesList } from "./StageCandidatesList";
import type { DisplaySettings } from "./PipelineDisplaySettings";

interface Stage {
  name: string;
  order: number;
  owner?: 'company' | 'quantum_club';
  format?: 'online' | 'in_person' | 'hybrid' | 'assessment';
  location?: string;
  meeting_link?: string;
  meeting_type?: string;
  assessment_type?: string;
  platform?: string;
  duration_minutes?: number;
  interviewers?: string[];
  materials_required?: string[];
  evaluation_criteria?: string;
  resources?: string[];
  description?: string;
}

interface Application {
  id: string;
  current_stage_index: number;
  full_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  current_title?: string;
  current_company?: string;
  linkedin_url?: string;
  user_id: string;
  candidate_id?: string;
  applied_at: string;
  updated_at?: string;
  status?: string;
  stages: any[];
  is_linked_user?: boolean;
}

interface ExpandablePipelineStageProps {
  stage: Stage;
  stageIndex: number;
  candidateCount: number;
  avgDays: number;
  conversionRate?: number;
  applications: Application[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (stage: Stage) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAdvanceCandidate: (app: Application) => void;
  onRejectCandidate: (app: Application) => void;
  onViewProfile: (app: Application) => void;
  displaySettings: DisplaySettings;
  totalStages: number;
}

export function ExpandablePipelineStage({
  stage,
  stageIndex,
  candidateCount,
  avgDays,
  conversionRate,
  applications,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDuplicate,
  onDelete,
  onAdvanceCandidate,
  onRejectCandidate,
  onViewProfile,
  displaySettings,
  totalStages,
}: ExpandablePipelineStageProps) {
  return (
    <Card className="overflow-hidden">
      {/* Stage Header - Always visible, clickable to expand */}
      <div onClick={onToggleExpand} className="cursor-pointer">
        <StageDetailCard
          stage={stage}
          candidateCount={candidateCount}
          avgDays={avgDays}
          conversionRate={conversionRate}
          displaySettings={displaySettings}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onViewAnalytics={() => {}}
          isExpandable={true}
          isExpanded={isExpanded}
        />
      </div>

      {/* Candidate List - Only when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <CardContent className="border-t pt-6 bg-muted/20">
              <StageCandidatesList
                candidates={applications}
                stageIndex={stageIndex}
                stageName={stage.name}
                totalStages={totalStages}
                onAdvance={onAdvanceCandidate}
                onReject={onRejectCandidate}
                onViewDetails={onViewProfile}
              />
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
