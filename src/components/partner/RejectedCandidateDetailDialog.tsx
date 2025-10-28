import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  ArrowRight, 
  AlertTriangle, 
  TrendingUp, 
  MapPin, 
  DollarSign, 
  Briefcase,
  Mail,
  Clock,
  User
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: any;
  stages: any[];
  jobId: string;
  onRefresh: () => void;
}

const REJECTION_COLORS: { [key: string]: string } = {
  'skills_gap': 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  'experience_junior': 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  'experience_senior': 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  'salary_high': 'bg-red-500/20 text-red-500 border-red-500/30',
  'location': 'bg-green-500/20 text-green-500 border-green-500/30',
  'culture_fit': 'bg-pink-500/20 text-pink-500 border-pink-500/30',
  'communication': 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  'other': 'bg-gray-500/20 text-gray-500 border-gray-500/30',
};

const REJECTION_LABELS: { [key: string]: string } = {
  'skills_gap': 'Skills Gap',
  'experience_junior': 'Too Junior',
  'experience_senior': 'Too Senior',
  'salary_high': 'Salary Too High',
  'location': 'Location Mismatch',
  'culture_fit': 'Culture Fit',
  'communication': 'Communication',
  'other': 'Other',
};

export function RejectedCandidateDetailDialog({ 
  open, 
  onOpenChange, 
  candidate, 
  stages,
  jobId,
  onRefresh 
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleReconsider = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', candidate.id);

      if (updateError) throw updateError;

      // Log the reconsideration action in interaction log
      const { error: logError } = await supabase
        .from('candidate_interactions')
        .insert({
          candidate_id: candidate.candidate_id,
          application_id: candidate.id,
          interaction_type: 'status_change',
          interaction_direction: 'internal',
          title: 'Candidate Reconsidered',
          content: `Candidate moved back to active pipeline from rejected status. Previous rejection reason: ${REJECTION_LABELS[candidate.rejection_reason] || 'Unknown'}`,
          metadata: {
            action: 'reconsider',
            previous_status: 'rejected',
            new_status: 'active',
            previous_rejection_reason: candidate.rejection_reason,
            stage: candidate.stage_name
          },
          created_by: user.id,
          is_internal: true,
          visible_to_candidate: false,
        });

      if (logError) console.error('Failed to log reconsideration:', logError);

      toast.success("Candidate moved back to active pipeline");
      onRefresh();
      onOpenChange(false);
    } catch (error) {
      console.error('Error reconsidering candidate:', error);
      toast.error("Failed to reconsider candidate");
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysInPipeline = () => {
    const start = new Date(candidate.applied_at);
    const end = new Date(candidate.rejected_at);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={candidate.avatar_url} />
              <AvatarFallback>{candidate.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl">{candidate.full_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4" />
                {candidate.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rejection Summary */}
          <Card className="border-2 border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Rejection Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {candidate.rejection_reason && (
                  <Badge className={`${REJECTION_COLORS[candidate.rejection_reason]} text-base py-1.5 px-4`}>
                    {REJECTION_LABELS[candidate.rejection_reason]}
                  </Badge>
                )}
                <Badge variant="outline" className="text-sm">
                  Rejected at: {candidate.stage_name}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Applied:</span>
                  <span className="font-medium">{new Date(candidate.applied_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Rejected:</span>
                  <span className="font-medium">{new Date(candidate.rejected_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Days in pipeline:</span>
                  <span className="font-medium">{calculateDaysInPipeline()}</span>
                </div>
                {candidate.reviewer_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Reviewed by:</span>
                    <span className="font-medium">{candidate.reviewer_name}</span>
                  </div>
                )}
              </div>

              {candidate.feedback_text && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Detailed Feedback</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {candidate.feedback_text}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Journey */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pipeline Journey</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {stages.map((stage, idx) => (
                  <div key={idx} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          idx < candidate.current_stage_index
                            ? 'bg-primary border-primary text-primary-foreground'
                            : idx === candidate.current_stage_index
                            ? 'bg-destructive border-destructive text-destructive-foreground animate-pulse'
                            : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                        }`}
                      >
                        {idx < candidate.current_stage_index ? (
                          '✓'
                        ) : idx === candidate.current_stage_index ? (
                          '✗'
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span className="text-xs mt-2 text-center max-w-20">{stage.name}</span>
                    </div>
                    {idx < stages.length - 1 && (
                      <ArrowRight 
                        className={`w-8 h-8 mx-2 ${
                          idx < candidate.current_stage_index 
                            ? 'text-primary' 
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Mismatch Analysis */}
          {(candidate.skills_mismatch?.length > 0 || candidate.salary_mismatch || candidate.location_mismatch || candidate.seniority_mismatch) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mismatch Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidate.skills_mismatch && candidate.skills_mismatch.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4 text-orange-500" />
                      <h4 className="font-semibold">Skills Gap</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills_mismatch.map((skill: string) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {candidate.seniority_mismatch && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-purple-500" />
                      <h4 className="font-semibold">Seniority Level</h4>
                    </div>
                    <Badge variant="outline">
                      {candidate.seniority_mismatch === 'too_junior' ? 'Too Junior for this role' : 'Too Senior for this role'}
                    </Badge>
                  </div>
                )}

                {candidate.salary_mismatch && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-red-500" />
                      <h4 className="font-semibold">Compensation</h4>
                    </div>
                    <Badge variant="destructive">Salary expectations too high</Badge>
                  </div>
                )}

                {candidate.location_mismatch && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <h4 className="font-semibold">Location</h4>
                    </div>
                    <Badge variant="destructive">Location not aligned with role requirements</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleReconsider} disabled={loading}>
            Reconsider Candidate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
