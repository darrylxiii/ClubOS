import { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Download, 
  Search, 
  TrendingDown,
  Users,
  AlertTriangle,
  Clock,
  Lightbulb
} from "lucide-react";
import { RejectedCandidateDetailDialog } from "@/components/partner/RejectedCandidateDetailDialog";
import { PageLoadingSkeleton } from "@/components/LoadingSkeletons";
import { PartnerPageHeader } from "@/components/partner/PartnerPageHeader";
import { PartnerInlineStats } from "@/components/partner/PartnerInlineStats";
import { PartnerGlassCard } from "@/components/partner/PartnerGlassCard";

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

const REJECTION_COLORS: { [key: string]: string } = {
  'skills_gap': 'bg-destructive/20 text-destructive border-destructive/30',
  'experience_junior': 'bg-primary/20 text-primary border-primary/30',
  'experience_senior': 'bg-accent/20 text-accent-foreground border-accent/30',
  'salary_high': 'bg-destructive/20 text-destructive border-destructive/30',
  'location': 'bg-secondary/40 text-secondary-foreground border-secondary/30',
  'culture_fit': 'bg-muted text-muted-foreground border-border/30',
  'communication': 'bg-accent/20 text-accent-foreground border-accent/30',
  'other': 'bg-muted text-muted-foreground border-border/30',
};

export default function PartnerRejections() {
  const { t } = useTranslation('partner');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rejectedCandidates, setRejectedCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJob, setFilterJob] = useState<string>("all");
  const [filterReason, setFilterReason] = useState<string>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!membership) {
        toast.error("No company found for this user");
        return;
      }

      setCompanyId(membership.company_id);

      const { data: companyJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', membership.company_id);
      if (jobsError) throw jobsError;
      setJobs(companyJobs || []);

      const jobIds = companyJobs?.map(j => j.id) || [];
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select(`*, jobs!applications_job_id_fkey (id, title, location, pipeline_stages)`)
        .in('job_id', jobIds)
        .eq('status', 'rejected')
        .order('updated_at', { ascending: false });
      if (appsError) throw appsError;

      const candidateIds = applications?.map(app => app.candidate_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', candidateIds);

      const applicationIds = applications?.map(app => app.id) || [];
      const { data: feedbacks } = await supabase
        .from('company_candidate_feedback')
        .select('*')
        .in('application_id', applicationIds)
        .eq('feedback_type', 'rejection');

      const enrichedCandidates = (applications || []).map(app => {
        const profile = profiles?.find(p => p.id === app.candidate_id);
        const feedback = feedbacks?.find(f => f.application_id === app.id);
        return {
          ...app,
          full_name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url,
          email: profile?.email,
          rejection_reason: feedback?.rejection_reason,
          feedback_text: feedback?.feedback_text,
          skills_mismatch: feedback?.skills_mismatch,
          salary_mismatch: feedback?.salary_mismatch,
          location_mismatch: feedback?.location_mismatch,
          seniority_mismatch: feedback?.seniority_mismatch,
          stage_name: feedback?.stage_name,
          rejected_at: app.updated_at,
          applied_at: app.applied_at,
        };
      });

      setRejectedCandidates(enrichedCandidates);
    } catch (error) {
      console.error('Error loading rejections:', error);
      toast.error("Failed to load rejection data");
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = rejectedCandidates.filter(candidate => {
    const matchesSearch = searchQuery === "" || 
      candidate.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.jobs?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJob = filterJob === "all" || candidate.job_id === filterJob;
    const matchesReason = filterReason === "all" || candidate.rejection_reason === filterReason;
    return matchesSearch && matchesJob && matchesReason;
  });

  const stats = {
    total: rejectedCandidates.length,
    thisMonth: rejectedCandidates.filter(c => {
      const rejectedDate = new Date(c.rejected_at);
      const now = new Date();
      return rejectedDate.getMonth() === now.getMonth() && rejectedDate.getFullYear() === now.getFullYear();
    }).length,
    topReason: Object.entries(
      rejectedCandidates.reduce((acc, c) => {
        const reason = c.rejection_reason || 'other';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => (b[1] as number) - (a[1] as number))[0],
    talentPool: rejectedCandidates.filter(c => 
      c.rejection_reason === 'experience_junior' || c.rejection_reason === 'experience_senior'
    ).length,
  };

  const handleExport = () => {
    const csv = [
      ['Candidate', 'Email', 'Job', 'Reason', 'Applied Date', 'Rejected Date', 'Days in Pipeline'].join(','),
      ...filteredCandidates.map(c => [
        c.full_name, c.email, c.jobs?.title,
        REJECTION_LABELS[c.rejection_reason] || 'Unknown',
        new Date(c.applied_at).toLocaleDateString(),
        new Date(c.rejected_at).toLocaleDateString(),
        Math.floor((new Date(c.rejected_at).getTime() - new Date(c.applied_at).getTime()) / (1000 * 60 * 60 * 24))
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `company-rejections-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Export completed");
  };

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PartnerInlineStats
        stats={[
          { value: stats.total, label: 'Total Rejections', icon: TrendingDown, highlight: true },
          { value: stats.thisMonth, label: 'This Month', icon: Clock },
          { value: stats.talentPool, label: 'Talent Pool', icon: Lightbulb },
          { value: filteredCandidates.length, label: 'Showing', icon: Users },
        ]}
      />

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">{t('partnerRejections.text1')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Candidates rejected for seniority mismatches might be perfect for other roles. 
            Review your talent pool regularly for cross-role opportunities.
          </p>
        </div>
      </div>

      {/* Filters */}
      <PartnerGlassCard>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('partnerRejections.text2')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card/50 border-border/30"
            />
          </div>
          <Select value={filterJob} onValueChange={setFilterJob}>
            <SelectTrigger className="bg-card/50 border-border/30">
              <SelectValue placeholder={t('partnerRejections.text3')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('partnerRejections.text4')}</SelectItem>
              {jobs.map(job => (
                <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterReason} onValueChange={setFilterReason}>
            <SelectTrigger className="bg-card/50 border-border/30">
              <SelectValue placeholder={t('partnerRejections.text5')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('partnerRejections.text6')}</SelectItem>
              {Object.entries(REJECTION_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline" className="border-border/30">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </PartnerGlassCard>

      {/* Results */}
      <PartnerGlassCard
        title={`Rejected Candidates (${filteredCandidates.length})`}
        icon={<Users className="w-5 h-5 text-muted-foreground" />}
      >
        <VirtualizedPartnerRejectionList
          candidates={filteredCandidates}
          onSelectCandidate={(candidate) => {
            setSelectedCandidate(candidate);
            setDetailDialogOpen(true);
          }}
        />
      </PartnerGlassCard>

      {selectedCandidate && (
        <RejectedCandidateDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          candidate={selectedCandidate}
          stages={selectedCandidate.jobs?.pipeline_stages || []}
          jobId={selectedCandidate.job_id}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}

function VirtualizedPartnerRejectionList({
  candidates,
  onSelectCandidate,
}: {
  candidates: any[];
  onSelectCandidate: (candidate: any) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: candidates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 10,
  });

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No rejected candidates found
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[600px] overflow-y-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const candidate = candidates[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="pb-3"
            >
              <div
                onClick={() => onSelectCandidate(candidate)}
                className="flex items-center justify-between p-4 rounded-lg bg-card/20 border border-border/10 hover:bg-card/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={candidate.avatar_url} />
                    <AvatarFallback>{candidate.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{candidate.full_name}</p>
                    <p className="text-sm text-muted-foreground">{candidate.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{candidate.jobs?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(candidate.rejected_at).toLocaleDateString()}
                    </p>
                  </div>
                  {candidate.rejection_reason && (
                    <Badge className={REJECTION_COLORS[candidate.rejection_reason]}>
                      {REJECTION_LABELS[candidate.rejection_reason]}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
