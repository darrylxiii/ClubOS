import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Target, AlertTriangle, CheckCircle2, TrendingUp, 
  Award, DollarSign, Clock, MapPin, Zap, Briefcase, Activity, Star,
  Send, Calendar, FileCheck, ThumbsUp, ThumbsDown
} from "lucide-react";
import { useRecharts } from "@/hooks/useRecharts";
import { candidateProfileTokens, getScoreColor } from "@/config/candidate-profile-tokens";
import { useFieldPermissions } from "@/hooks/useFieldPermissions";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  candidate: any;
  applications?: any[];
  jobId?: string;
  applicationId?: string;
  onAction?: (action: string) => void;
}

export const CandidateDecisionDashboard = ({ candidate, applications, jobId, applicationId, onAction }: Props) => {
  const { recharts, isLoading: chartsLoading } = useRecharts();
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showVerdictDialog, setShowVerdictDialog] = useState(false);
  const [verdictNotes, setVerdictNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canEditField } = useFieldPermissions();
  const { currentRole: role } = useRole();
  
  // Early return if no candidate data
  if (!candidate) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No candidate data available
        </CardContent>
      </Card>
    );
  }

  // Calculate overall assessment score (0-100)
  const calculateOverallScore = () => {
    const scores = [
      candidate.engagement_score ? candidate.engagement_score * 10 : 0,
      candidate.fit_score ? candidate.fit_score * 10 : 0,
      candidate.internal_rating ? candidate.internal_rating * 10 : 0,
      candidate.profile_completeness || 0
    ].filter(s => s > 0);
    
    return scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  };

  const overallScore = calculateOverallScore();
  
  // Radar chart data for skills match visualization
  const radarData = [
    { category: 'Skills Match', value: candidate.fit_score ? candidate.fit_score * 10 : 0 },
    { category: 'Experience', value: candidate.years_of_experience ? Math.min(candidate.years_of_experience * 10, 100) : 0 },
    { category: 'Engagement', value: candidate.engagement_score ? candidate.engagement_score * 10 : 0 },
    { category: 'Culture Fit', value: candidate.internal_rating ? candidate.internal_rating * 10 : 0 },
    { category: 'Salary Match', value: 80 },
    { category: 'Location', value: 70 },
  ];

  // Score badges component
  const ScoreBadge = ({ label, value, max = 10, icon: Icon }: any) => {
    const percentage = (value / max) * 100;
    const color = getScoreColor(percentage);
    
    return (
      <div className={`${candidateProfileTokens.glass.card} rounded-xl p-3`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4" style={{ color: color.bg }} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold" style={{ color: color.bg }}>
          {max === 10 ? value.toFixed(1) : `${Math.round(percentage)}%`}
        </div>
      </div>
    );
  };

  const fitScore = candidate.fit_score || 0;
  const engagementScore = candidate.engagement_score || 0;
  const internalRating = candidate.internal_rating || 0;
  const completeness = candidate.profile_completeness || 0;

  // Action handlers
  const handleMoveToOffer = async () => {
    if (!applicationId) {
      toast.error("No application selected");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("applications")
        .update({ 
          status: "offer",
          updated_at: new Date().toISOString()
        })
        .eq("id", applicationId);

      if (error) throw error;
      
      toast.success("Candidate moved to Offer stage");
      setShowOfferDialog(false);
      onAction?.("offer");
    } catch (error: unknown) {
      console.error("Error moving to offer:", error);
      toast.error("Failed to move candidate to offer stage");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogVerdict = async (verdict: "proceed" | "reject") => {
    if (!applicationId) {
      toast.error("No application selected");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newStatus = verdict === "proceed" ? "final_interview" : "rejected";
      
      const { error } = await supabase
        .from("applications")
        .update({ 
          status: newStatus,
          rejection_reason: verdict === "reject" ? verdictNotes : null,
          updated_at: new Date().toISOString()
        })
        .eq("id", applicationId);

      if (error) throw error;
      
      // Log the decision
      await supabase.from("candidate_application_logs").insert({
        candidate_profile_id: candidate.id,
        action: verdict === "proceed" ? "verdict_proceed" : "verdict_reject",
        details: { 
          notes: verdictNotes,
          application_id: applicationId,
          job_id: jobId
        }
      });
      
      toast.success(verdict === "proceed" ? "Candidate proceeding to next stage" : "Candidate rejected");
      setShowVerdictDialog(false);
      setVerdictNotes("");
      onAction?.(verdict);
    } catch (error: unknown) {
      console.error("Error logging verdict:", error);
      toast.error("Failed to log verdict");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestInterview = () => {
    // Navigate to scheduling or open interview scheduling modal
    window.open(`/scheduling?candidate=${candidate.id}&job=${jobId}`, '_blank');
    toast.info("Opening interview scheduler...");
    onAction?.("schedule_interview");
  };

  const renderRadarChart = () => {
    if (chartsLoading || !recharts) {
      return <Skeleton className="w-full h-[200px]" />;
    }

    const { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } = recharts;

    return (
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis 
            dataKey="category" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <Radar 
            dataKey="value" 
            stroke="hsl(var(--primary))" 
            fill="hsl(var(--primary))" 
            fillOpacity={0.3} 
          />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions Bar - For Partners */}
      {(role === "partner" || role === "admin" || role === "strategist") && applicationId && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="font-semibold">Quick Actions</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRequestInterview}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Interview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVerdictDialog(true)}
                >
                  <FileCheck className="w-4 h-4 mr-2" />
                  Log Verdict
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowOfferDialog(true)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Move to Offer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Move to Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Offer Stage</DialogTitle>
            <DialogDescription>
              You're about to move {candidate.full_name} to the Offer stage. This will notify the TQC team to prepare an offer package.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription>
                This action will trigger the offer workflow and notify relevant stakeholders.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOfferDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleMoveToOffer} disabled={isSubmitting}>
              {isSubmitting ? "Moving..." : "Confirm Move to Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Verdict Dialog */}
      <Dialog open={showVerdictDialog} onOpenChange={setShowVerdictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Final Verdict</DialogTitle>
            <DialogDescription>
              Record your decision for {candidate.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Textarea
              placeholder="Add notes about your decision..."
              value={verdictNotes}
              onChange={(e) => setVerdictNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={() => handleLogVerdict("reject")} 
              disabled={isSubmitting}
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button 
              variant="default" 
              onClick={() => handleLogVerdict("proceed")} 
              disabled={isSubmitting}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overall Assessment Card - Enhanced with Score Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Overall Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
          {/* Top Section: Overall Score + Score Badges + Radar Chart */}
          <div className="grid grid-cols-[auto_1fr_300px] gap-6 items-start">
            {/* Overall Score - Large */}
            <div className="text-center">
              <div className="text-6xl font-black mb-2">{overallScore}</div>
              <p className="text-sm text-muted-foreground">Overall</p>
            </div>

            {/* Score Badges Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <ScoreBadge label="Fit Score" value={fitScore} icon={TrendingUp} />
              <ScoreBadge label="Engagement" value={engagementScore} icon={Activity} />
              <ScoreBadge label="Internal Rating" value={internalRating} icon={Star} />
              <ScoreBadge label="Completeness" value={completeness} max={100} icon={CheckCircle2} />
            </div>

            {/* Radar Chart - Right side */}
            <div>
              {renderRadarChart()}
            </div>
          </div>

          {/* AI Summary + Strengths - Side by side */}
          {(candidate.ai_summary || (candidate.ai_strengths && candidate.ai_strengths.length > 0)) && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4">
                {/* AI Summary */}
                {candidate.ai_summary && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4" />
                      Executive Summary
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-4">{candidate.ai_summary}</p>
                  </div>
                )}

                {/* Strengths */}
                {candidate.ai_strengths && candidate.ai_strengths.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Key Strengths
                    </h4>
                    <ul className="space-y-1">
                      {candidate.ai_strengths.slice(0, 3).map((s: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{typeof s === 'string' ? s : s.point || s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Red Flags - Full width if exists */}
          {candidate.ai_concerns && candidate.ai_concerns.length > 0 && (
            <>
              <Separator className="my-4" />
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Potential Concerns:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {candidate.ai_concerns.map((c: any, i: number) => (
                      <li key={i}>{typeof c === 'string' ? c : c.point || c}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>
      </CardContent>
    </Card>

      {/* Personality Insights */}
      {candidate.personality_insights && typeof candidate.personality_insights === 'object' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Personality & Work Style
            </CardTitle>
          </CardHeader>
          <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(candidate.personality_insights).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">{key.replace(/_/g, ' ')}</p>
                <p className="text-sm font-medium">{String(value)}</p>
              </div>
            ))}
          </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Facts Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Years of Experience */}
        {candidate.years_of_experience && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Briefcase className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{candidate.years_of_experience}</p>
                <p className="text-xs text-muted-foreground">Years Exp</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Salary Range */}
        {candidate.desired_salary_min && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-lg font-bold">
                  {candidate.preferred_currency || 'EUR'} {Math.round(candidate.desired_salary_min / 1000)}K-{Math.round(candidate.desired_salary_max / 1000)}K
                </p>
                <p className="text-xs text-muted-foreground">Salary Range</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notice Period */}
        {candidate.notice_period && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-lg font-bold">{candidate.notice_period}</p>
                <p className="text-xs text-muted-foreground">Notice Period</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Preference */}
        {candidate.desired_locations?.[0] && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <MapPin className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-lg font-bold truncate">{candidate.desired_locations[0]}</p>
                <p className="text-xs text-muted-foreground">Preferred Location</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
