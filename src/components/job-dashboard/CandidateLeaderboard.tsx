import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Star, Zap, TrendingUp, Crown, Sparkles, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";

interface Application {
  id: string;
  candidate_id?: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  current_title?: string;
  current_company?: string;
  match_score?: number;
  current_stage_index: number;
}

interface CandidateLeaderboardProps {
  applications: Application[];
  stages: { name: string; order: number }[];
  jobId: string;
}

interface RankedCandidate extends Application {
  rank: number;
  compositeScore: number;
  stageProgress: number;
  aiRecommendation?: string;
}

import { calculateCandidateScore } from "@/utils/candidateScoring";
import { adminCandidateService } from "@/services/adminCandidateService";
import { toast } from "sonner";

export const CandidateLeaderboard = memo(({
  applications,
  stages,
  jobId
}: CandidateLeaderboardProps) => {
  const navigate = useNavigate();

  const rankedCandidates = useMemo((): RankedCandidate[] => {
    const maxStage = stages.length > 1 ? stages.length - 1 : 1;

    const scored = applications.map(app => {
      // Calculate real composite score
      const { compositeScore, aiRecommendation } = calculateCandidateScore({
        id: app.id,
        match_score: app.match_score,
        current_stage_index: app.current_stage_index,
        // Fallback for missing data until parent component enables it
        profile_completeness: (app as any).profile_completeness || 70,
        last_activity_at: (app as any).last_activity_at || new Date().toISOString()
      }, maxStage);

      const stageProgress = (app.current_stage_index / maxStage) * 100;

      return {
        ...app,
        rank: 0,
        compositeScore,
        stageProgress,
        match_score: app.match_score || 0,
        aiRecommendation
      };
    });

    // Sort and assign ranks
    return scored
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 5)
      .map((c, idx) => ({ ...c, rank: idx + 1 }));
  }, [applications, stages]);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1: return (
        <motion.div
          className="relative"
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Crown className="w-5 h-5 text-amber-500" />
          <motion.div
            className="absolute inset-0"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Crown className="w-5 h-5 text-amber-500" />
          </motion.div>
        </motion.div>
      );
      case 2: return <Trophy className="w-4 h-4 text-slate-400" />;
      case 3: return <Trophy className="w-4 h-4 text-amber-700" />;
      default: return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-primary';
    return 'text-muted-foreground';
  };

  if (rankedCandidates.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border border-border/50 shadow-[var(--shadow-glass-lg)] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Trophy className="w-4 h-4 text-amber-500" />
              </motion.div>
              <div>
                <CardTitle className="text-base font-bold">Top Candidates</CardTitle>
                <p className="text-xs text-muted-foreground">AI-ranked by composite score</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              AI Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <TooltipProvider>
            <AnimatePresence>
              {rankedCandidates.map((candidate, index) => (
                <motion.div
                  key={candidate.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group ${candidate.rank === 1
                    ? 'bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/20'
                    : 'bg-background/50 hover:bg-background/80 border border-transparent hover:border-border/50'
                    }`}
                  onClick={() => {
                    if (candidate.candidate_id) {
                      navigate(`/candidate/${candidate.candidate_id}`);
                    }
                  }}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center">
                    {getRankBadge(candidate.rank)}
                  </div>

                  {/* Avatar */}
                  <Avatar className={`h-10 w-10 border-2 ${candidate.rank === 1 ? 'border-amber-500/50' : 'border-border/30'
                    }`}>
                    <AvatarImage src={candidate.avatar_url || undefined} />
                    <AvatarFallback className="text-sm bg-muted font-semibold">
                      {(candidate.full_name || 'C').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{candidate.full_name}</p>
                      {candidate.rank === 1 && (
                        <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px] px-1.5 py-0">
                          Top Pick
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {candidate.current_title || 'Candidate'} • {stages[candidate.current_stage_index]?.name}
                    </p>
                    {candidate.aiRecommendation && (
                      <motion.p
                        className="text-[10px] text-primary mt-0.5 flex items-center gap-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        {candidate.aiRecommendation}
                      </motion.p>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-end">
                          <div className={`text-lg font-bold ${getScoreColor(candidate.compositeScore)}`}>
                            {candidate.compositeScore}
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-success" />
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round(candidate.stageProgress)}%
                            </span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">Composite Score: {candidate.compositeScore}</p>
                          <p>Match: {candidate.match_score}%</p>
                          <p>Progress: {Math.round(candidate.stageProgress)}%</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Fast Track Button */}
                  <motion.div
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-primary/10 hover:bg-primary/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.promise(adminCandidateService.fastTrackCandidate(candidate.id), {
                              loading: 'Fast tracking candidate...',
                              success: 'Candidate fast tracked! Stage updated.',
                              error: 'Failed to fast track candidate'
                            });
                          }}
                        >
                          <Zap className="w-4 h-4 text-primary" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Fast Track</TooltipContent>
                    </Tooltip>
                  </motion.div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </AnimatePresence>
          </TooltipProvider>
        </CardContent>
      </Card>
    </motion.div>
  );
});

CandidateLeaderboard.displayName = 'CandidateLeaderboard';
