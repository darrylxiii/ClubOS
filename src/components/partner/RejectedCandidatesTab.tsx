import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Eye, TrendingDown, FileDown, RotateCcw, Loader2 } from "lucide-react";
import { RejectedCandidateDetailDialog } from "./RejectedCandidateDetailDialog";
import { RejectionInsights } from "./RejectionInsights";
import { RejectionFilters } from "./RejectionFilters";

interface RejectedCandidate {
  id: string;
  applied_at: string;
  rejected_at: string;
  current_stage_index: number;
  stages: any[];
  candidate_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  rejection_reason?: string;
  feedback_text?: string;
  stage_name?: string;
  skills_mismatch?: string[];
  salary_mismatch?: boolean;
  location_mismatch?: boolean;
  seniority_mismatch?: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

interface Props {
  jobId: string;
  stages: any[];
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

export function RejectedCandidatesTab({ jobId, stages }: Props) {
  const [loading, setLoading] = useState(true);
  const [rejectedCandidates, setRejectedCandidates] = useState<RejectedCandidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<RejectedCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<RejectedCandidate | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [reconsideringId, setReconsideringId] = useState<string | null>(null);

  // Filter states
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    fetchRejectedCandidates();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('rejected-applications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `job_id=eq.${jobId}`
        },
        () => {
          fetchRejectedCandidates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    applyFilters();
  }, [rejectedCandidates, reasonFilter, stageFilter, dateFilter]);

  const fetchRejectedCandidates = async () => {
    try {
      setLoading(true);
      
      const { data: applications, error } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .eq('status', 'rejected')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Enrich with candidate and feedback data
      const enriched = await Promise.all((applications || []).map(async (app) => {
        // Get candidate profile
        const { data: interaction } = await supabase
          .from('candidate_interactions')
          .select(`
            candidate_id,
            candidate_profiles!candidate_interactions_candidate_id_fkey (
              user_id,
              full_name,
              email,
              avatar_url
            )
          `)
          .eq('application_id', app.id)
          .maybeSingle();

        const candidateProfile = interaction?.candidate_profiles;

        // Get feedback from company table
        const { data: feedback } = await supabase
          .from('company_candidate_feedback')
          .select(`
            rejection_reason,
            feedback_text,
            stage_name,
            skills_mismatch,
            salary_mismatch,
            location_mismatch,
            seniority_mismatch,
            profiles!company_candidate_feedback_provided_by_fkey (
              full_name,
              avatar_url
            )
          `)
          .eq('application_id', app.id)
          .eq('feedback_type', 'rejection')
          .maybeSingle();

        return {
          id: app.id,
          applied_at: app.applied_at,
          rejected_at: app.updated_at,
          current_stage_index: app.current_stage_index,
          stages: Array.isArray(app.stages) ? app.stages : [],
          candidate_id: interaction?.candidate_id || '',
          full_name: candidateProfile?.full_name || 'Unknown Candidate',
          email: candidateProfile?.email || '',
          avatar_url: candidateProfile?.avatar_url,
          rejection_reason: feedback?.rejection_reason,
          feedback_text: feedback?.feedback_text,
          stage_name: feedback?.stage_name || stages[app.current_stage_index]?.name,
          skills_mismatch: Array.isArray(feedback?.skills_mismatch) ? feedback.skills_mismatch : [],
          salary_mismatch: feedback?.salary_mismatch || false,
          location_mismatch: feedback?.location_mismatch || false,
          seniority_mismatch: feedback?.seniority_mismatch,
          reviewer_name: feedback?.profiles?.full_name,
          reviewer_avatar: feedback?.profiles?.avatar_url,
        };
      }));

      setRejectedCandidates(enriched);
    } catch (error) {
      console.error('Error fetching rejected candidates:', error);
      toast.error("Failed to load rejected candidates");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...rejectedCandidates];

    // Reason filter
    if (reasonFilter !== 'all') {
      filtered = filtered.filter(c => c.rejection_reason === reasonFilter);
    }

    // Stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter(c => c.stage_name === stageFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      if (dateFilter === '7d') cutoffDate.setDate(now.getDate() - 7);
      else if (dateFilter === '30d') cutoffDate.setDate(now.getDate() - 30);
      else if (dateFilter === '90d') cutoffDate.setDate(now.getDate() - 90);
      
      if (dateFilter !== 'all') {
        filtered = filtered.filter(c => new Date(c.rejected_at) >= cutoffDate);
      }
    }

    setFilteredCandidates(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Rejected Date', 'Stage', 'Reason', 'Feedback', 'Skills Gap', 'Salary Mismatch', 'Location Mismatch', 'Seniority'];
    const rows = filteredCandidates.map(c => [
      c.full_name,
      c.email,
      new Date(c.rejected_at).toLocaleDateString(),
      c.stage_name || '',
      REJECTION_LABELS[c.rejection_reason || ''] || '',
      c.feedback_text || '',
      c.skills_mismatch?.join('; ') || '',
      c.salary_mismatch ? 'Yes' : 'No',
      c.location_mismatch ? 'Yes' : 'No',
      c.seniority_mismatch || ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rejected-candidates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("CSV exported successfully");
  };

  const handleViewDetails = (candidate: RejectedCandidate) => {
    setSelectedCandidate(candidate);
    setDetailDialogOpen(true);
  };

  const handleReconsider = async (candidate: RejectedCandidate, e: React.MouseEvent) => {
    e.stopPropagation();
    setReconsideringId(candidate.id);
    
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

      // Log the reconsideration action
      const { error: logError } = await supabase
        .from('candidate_interactions')
        .insert({
          candidate_id: candidate.candidate_id,
          application_id: candidate.id,
          interaction_type: 'status_change',
          interaction_direction: 'internal',
          title: 'Candidate Reconsidered',
          content: `Candidate moved back to active pipeline from rejected status. Previous rejection reason: ${REJECTION_LABELS[candidate.rejection_reason || ''] || 'Unknown'}`,
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

      toast.success(`${candidate.full_name} moved back to active pipeline`);
      fetchRejectedCandidates();
    } catch (error) {
      console.error('Error reconsidering candidate:', error);
      toast.error("Failed to reconsider candidate");
    } finally {
      setReconsideringId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card className="border-2 border-destructive/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-2xl">Rejected Candidates</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredCandidates.length} of {rejectedCandidates.length} total rejections
                </p>
              </div>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
              <FileDown className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* AI Insights */}
      <RejectionInsights candidates={rejectedCandidates} stages={stages} />

      {/* Filters */}
      <RejectionFilters
        reasonFilter={reasonFilter}
        stageFilter={stageFilter}
        dateFilter={dateFilter}
        stages={stages}
        onReasonChange={setReasonFilter}
        onStageChange={setStageFilter}
        onDateChange={setDateFilter}
      />

      {/* Candidates List */}
      <div className="space-y-3">
        {filteredCandidates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingDown className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No rejected candidates match your filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredCandidates.map((candidate) => (
            <Card key={candidate.id} className="hover:border-border/60 transition-all duration-200">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={candidate.avatar_url} />
                    <AvatarFallback>{candidate.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{candidate.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{candidate.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleReconsider(candidate, e)}
                          disabled={reconsideringId === candidate.id}
                          className="gap-2"
                        >
                          {reconsideringId === candidate.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                          Reconsider
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(candidate)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                      </div>
                    </div>

                    {/* Pipeline Progress */}
                    <div className="flex items-center gap-2">
                      {stages.map((stage, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <div
                            className={`w-3 h-3 rounded-full transition-all ${
                              idx < candidate.current_stage_index
                                ? 'bg-primary'
                                : idx === candidate.current_stage_index
                                ? 'bg-destructive animate-pulse'
                                : 'bg-muted'
                            }`}
                          />
                          {idx < stages.length - 1 && (
                            <div className={`w-8 h-0.5 ${idx < candidate.current_stage_index ? 'bg-primary' : 'bg-muted'}`} />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-2">
                      {candidate.rejection_reason && (
                        <Badge className={REJECTION_COLORS[candidate.rejection_reason]}>
                          {REJECTION_LABELS[candidate.rejection_reason]}
                        </Badge>
                      )}
                      <Badge variant="outline">
                        Rejected at: {candidate.stage_name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(candidate.rejected_at).toLocaleDateString()}
                      </span>
                      {candidate.reviewer_name && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>Rejected by:</span>
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={candidate.reviewer_avatar} />
                            <AvatarFallback className="text-[10px]">
                              {candidate.reviewer_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{candidate.reviewer_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Mismatch Indicators */}
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills_mismatch && candidate.skills_mismatch.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Skills: {candidate.skills_mismatch.slice(0, 3).join(', ')}
                          {candidate.skills_mismatch.length > 3 && ` +${candidate.skills_mismatch.length - 3}`}
                        </Badge>
                      )}
                      {candidate.salary_mismatch && (
                        <Badge variant="destructive" className="text-xs">Salary Mismatch</Badge>
                      )}
                      {candidate.location_mismatch && (
                        <Badge variant="destructive" className="text-xs">Location Mismatch</Badge>
                      )}
                      {candidate.seniority_mismatch && (
                        <Badge variant="destructive" className="text-xs">
                          {candidate.seniority_mismatch === 'too_junior' ? 'Too Junior' : 'Too Senior'}
                        </Badge>
                      )}
                    </div>

                    {/* Feedback Preview */}
                    {candidate.feedback_text && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {candidate.feedback_text}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Dialog */}
      {selectedCandidate && (
        <RejectedCandidateDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          candidate={selectedCandidate}
          stages={stages}
          jobId={jobId}
          onRefresh={fetchRejectedCandidates}
        />
      )}
    </div>
  );
}
