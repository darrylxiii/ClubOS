import { useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";
import { CandidateHeroSection } from "@/components/candidate-profile/CandidateHeroSection";
import { CandidateDecisionDashboard } from "@/components/partner/CandidateDecisionDashboard";
import { SkillMatrix } from "@/components/jobs/SkillMatrix";
import { ExperienceTimeline } from "@/components/candidate-profile/ExperienceTimeline";
import { PortfolioGrid } from "@/components/candidate-profile/PortfolioGrid";
import { CandidateDocumentsViewer } from "@/components/partner/CandidateDocumentsViewer";
import { CandidateInternalRatingCard } from "@/components/partner/CandidateInternalRatingCard";
import { CandidateNotesManager } from "@/components/partner/CandidateNotesManager";
import { CandidateWorkAuthCard } from "@/components/partner/CandidateWorkAuthCard";
import { PipelineBreakdownCard } from "@/components/candidate-profile/PipelineBreakdownCard";
import { CandidatePipelineContextBanner } from "@/components/partner/CandidatePipelineContextBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/contexts/RoleContext";
import { BackButton } from "@/components/candidate-profile/BackButton";
import { ActivityFeedCard } from "@/components/candidate-profile/ActivityFeedCard";
import { CandidateEditModal } from "@/components/candidate-profile/CandidateEditModal";
import { AuditLogViewer } from "@/components/candidate-profile/AuditLogViewer";
import { MeetingIntelligenceCard } from "@/components/candidate-profile/MeetingIntelligenceCard";
import { AssessmentInsightsCard } from "@/components/candidate-profile/AssessmentInsightsCard";
import { InterviewScorecard } from "@/components/candidate-profile/InterviewScorecard";
import { MoveProbabilityCard } from "@/components/talent-pool/MoveProbabilityCard";
import { RelationshipCard } from "@/components/talent-pool/RelationshipCard";
import { TierBadge } from "@/components/talent-pool/TierBadge";
import { ApplicationLogViewer } from "@/components/candidate/ApplicationLogViewer";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { CandidateTagManager } from "@/components/candidates/CandidateTagManager";
import { Progress } from "@/components/ui/progress";

export default function UnifiedCandidateProfile() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [searchParams] = useSearchParams();
  const fromJob = searchParams.get('fromJob') || searchParams.get('job');
  const fromCompany = searchParams.get('fromCompany');
  const fromAdmin = searchParams.get('fromAdmin') === 'true';
  const fromSearch = searchParams.get('fromSearch') === 'true';
  const applicationId = searchParams.get('application');
  const stage = searchParams.get('stage');
  const stageIndex = searchParams.get('stageIndex');

  const { currentRole: role } = useRole();
  const isAdmin = role === 'admin' || role === 'strategist';
  const isPartner = role === 'partner';

  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [relationship, setRelationship] = useState<any>(null);

  useEffect(() => {
    if (candidateId) {
      loadCandidateData();
    }
  }, [candidateId]);

  const loadCandidateData = async () => {
    try {
      // Load candidate and profile
      const { data: candidateData } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidateId)
        .single();

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', candidateId)
        .maybeSingle();

      // Map JSONB data from candidate_profiles into structured arrays
      const monthNameMap: Record<string, number> = {
        jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
        jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
      };
      const parseMonth = (m: any): number => {
        if (typeof m === 'number') return m;
        if (typeof m === 'string') {
          const mapped = monthNameMap[m.toLowerCase().substring(0, 3)];
          if (mapped) return mapped;
          const parsed = parseInt(m, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) return parsed;
        }
        return 1;
      };
      const normalizeDate = (d: any): string | undefined => {
        if (!d) return undefined;
        if (typeof d === 'number') return `${d}-01-01`;
        if (typeof d === 'object' && d !== null && !(d instanceof String)) {
          if (d.year) return `${d.year}-${String(parseMonth(d.month)).padStart(2, '0')}-01`;
          return undefined;
        }
        if (typeof d === 'string') {
          if (d.trim() === '' || d.includes('[object') || d === 'undefined' || d === 'null') return undefined;
          if (/^\d{4}$/.test(d)) return `${d}-01-01`;
          if (/^\d{4}-\d{1,2}$/.test(d)) return `${d}-01`;
          return d;
        }
        return undefined;
      };

      const mappedExperiences = ((candidateData as any)?.work_history || []).map((job: any, idx: number) => ({
        id: job.id || `work-${idx}`,
        title: job.title || job.position || 'Untitled Role',
        company: job.company || 'Unknown Company',
        company_logo: job.company_logo || null,
        location: job.location || null,
        start_date: normalizeDate(job.start_date) || '',
        end_date: normalizeDate(job.end_date) || undefined,
        current: !normalizeDate(job.end_date),
        description: job.description || null,
        skills: job.skills || [],
      }));

      const mappedEducation = ((candidateData as any)?.education || []).map((edu: any, idx: number) => ({
        id: edu.id || `edu-${idx}`,
        degree: edu.degree || edu.field_of_study || 'Degree',
        institution: edu.institution || edu.school || 'Institution',
        field: edu.field_of_study || edu.field || null,
        school_logo: edu.school_logo || null,
        start_date: normalizeDate(edu.start_date || edu.start_year) || '',
        end_date: normalizeDate(edu.end_date || edu.end_year) || undefined,
      }));

      const mappedCertifications = ((candidateData as any)?.certifications || []).map((cert: any, idx: number) => ({
        id: cert.id || `cert-${idx}`,
        name: cert.name || 'Certification',
        issuer: cert.issuer || cert.authority || 'Unknown',
        issued_date: normalizeDate(cert.issue_date || cert.start_date),
      }));

      const skillsQuery = await (supabase as any)
        .from('candidate_skills')
        .select('*')
        .eq('candidate_id', candidateId);

      // Load portfolio directly
      const { data: portfolioData } = await supabase
        .from('profile_portfolio')
        .select('*')
        .eq('user_id', candidateId);

      // Load application if ID provided
      let applicationData = null;
      if (applicationId) {
        const { data } = await supabase
          .from('applications')
          .select('*')
          .eq('id', applicationId)
          .single();
        applicationData = data;
      }

      // Merge candidate and profile data
      const mergedData = {
        ...candidateData,
        ...profileData,
        id: candidateId,
      };

      setCandidate(mergedData);
      setProfile(profileData);
      setExperiences(mappedExperiences);
      setEducation(mappedEducation);
      setCertifications(mappedCertifications);
      setPortfolioItems(portfolioData || []);
      setSkills(skillsQuery.data || []);
      setApplication(applicationData);
    } catch (error) {
      console.error('Error loading candidate data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-6">
              <Skeleton className="h-96 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!candidate) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Candidate not found</p>
        </div>
      </AppLayout>
    );
  }

  const mustHaveSkills = skills.filter((s) => s.is_must_have).map((s) => s.skill_name);
  const niceToHaveSkills = skills.filter((s) => !s.is_must_have).map((s) => s.skill_name);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-4 max-w-7xl space-y-4">
        {/* Back Button */}
        <BackButton
          fromJob={fromJob || undefined}
          fromCompany={fromCompany || undefined}
          fromAdmin={fromAdmin}
          fromSearch={fromSearch}
        />

        {/* Hero Section - Compact */}
        <CandidateHeroSection
          candidate={candidate}
          fromJob={fromJob || undefined}
          stage={stage || application?.stage}
          isAdmin={isAdmin}
          onEdit={() => setIsEditModalOpen(true)}
          onRefresh={loadCandidateData}
        />

        {/* Full Pipeline Breakdown - Prominent after hero */}
        {application && (
          <PipelineBreakdownCard
            application={application}
          />
        )}

        {/* Main Content Grid: 70/30 split */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Left Column: Main Content */}
          <div className="space-y-4">
            {/* Decision Intelligence Zone (Always Expanded) */}
            <CandidateDecisionDashboard candidate={candidate} applications={application ? [application] : []} />

            {/* Meeting Intelligence - Interview Insights */}
            <MeetingIntelligenceCard candidateId={candidateId!} />

            {/* Interview Scorecard - AI Analysis from Interviews */}
            <InterviewScorecard candidateId={candidateId!} />

            {/* Assessment Insights */}
            <AssessmentInsightsCard candidateId={candidateId!} />

            {/* Skills & Expertise */}
            <SkillMatrix mustHaveSkills={mustHaveSkills} niceToHaveSkills={niceToHaveSkills} />

            {/* Experience Timeline */}
            <ExperienceTimeline
              experiences={experiences}
              education={education}
              certifications={certifications}
            />

            {/* Portfolio & Links */}
            <PortfolioGrid candidate={candidate} portfolioItems={portfolioItems} />

            {/* Documents & Assessments */}
            <Card className={candidateProfileTokens.glass.card}>
              <CardHeader>
                <CardTitle>Documents & Files</CardTitle>
              </CardHeader>
              <CardContent>
                <CandidateDocumentsViewer
                  candidateId={candidateId!}
                  canUpload={isAdmin}
                />
              </CardContent>
            </Card>

            {/* Internal Team Zone - TQC Only */}
            {isAdmin && (
              <Card className={candidateProfileTokens.glass.card}>
                <CardHeader>
                  <CardTitle>TQC Internal Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <CandidateInternalRatingCard
                    candidateId={candidateId!}
                    candidate={candidate}
                    onUpdate={loadCandidateData}
                  />
                </CardContent>
              </Card>
            )}

            <Card className={candidateProfileTokens.glass.card}>
              <CardHeader>
                <CardTitle>
                  {isPartner ? 'Collaboration Notes' : 'Team Notes'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {isPartner
                    ? 'Share notes with TQC and your team about this candidate'
                    : 'Internal notes and observations about this candidate'}
                </p>
                <CandidateNotesManager
                  candidateId={candidateId!}
                  userRole={role as any}
                  activeTab="team-assessment"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar: Sticky Cards - Tighter spacing */}
          <div className="space-y-4">
            {/* Candidate Tags */}
            {isAdmin && (
              <CandidateTagManager candidateId={candidateId!} />
            )}

            {/* Profile Completeness */}
            {isAdmin && (
              <Card className={`${candidateProfileTokens.glass.card}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Data Completeness</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Score</span>
                    <span className={`font-semibold ${
                      (candidate.profile_completeness || 0) >= 80 ? 'text-emerald-500' :
                      (candidate.profile_completeness || 0) >= 50 ? 'text-amber-500' : 'text-destructive'
                    }`}>
                      {candidate.profile_completeness || 0}%
                    </span>
                  </div>
                  <Progress value={candidate.profile_completeness || 0} className="h-2" />
                </CardContent>
              </Card>
            )}

            {/* Talent Pool Status - Admin Only */}
            {isAdmin && (
              <Card className={`${candidateProfileTokens.glass.card}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Talent Pool Status</CardTitle>
                    {candidate.talent_tier && (
                      <TierBadge tier={candidate.talent_tier} size="sm" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(`/talent-pool?candidate=${candidateId}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View in Talent Pool
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Move Probability Card - Admin Only */}
            {isAdmin && (
              <MoveProbabilityCard candidateId={candidateId!} />
            )}

            {/* Relationship Card - Admin Only */}
            {isAdmin && (
              <RelationshipCard relationship={relationship} />
            )}

            {/* Career Preferences - Compact */}
            <Card className={`${candidateProfileTokens.glass.card}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Career Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {/* Salary - Compact row */}
                {(candidate.desired_salary_min || candidate.desired_salary_max) && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Salary:</span>
                    <span className="font-medium text-xs">
                      {candidate.preferred_currency || 'EUR'} {Math.round(candidate.desired_salary_min / 1000)}K-{Math.round(candidate.desired_salary_max / 1000)}K
                    </span>
                  </div>
                )}

                {/* Notice Period - Compact row */}
                {candidate.notice_period && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Notice:</span>
                    <Badge variant="outline" className="text-xs">{candidate.notice_period}</Badge>
                  </div>
                )}

                {/* Remote Preference - Compact row */}
                {candidate.remote_preference && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Work:</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {candidate.remote_preference.replace('_', ' ')}
                    </Badge>
                  </div>
                )}

                {/* Locations - Compact */}
                {candidate.desired_locations && candidate.desired_locations.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Desired Locations:</span>
                    <div className="flex flex-wrap gap-1">
                      {candidate.desired_locations.map((loc: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {loc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Authorization */}
            <CandidateWorkAuthCard candidate={candidate} />

            {/* Activity Feed */}
            <ActivityFeedCard candidateId={candidateId!} />

            {/* Application Activity Log - Admin Only */}
            {isAdmin && (
              <ApplicationLogViewer candidateId={candidateId!} limit={10} />
            )}
          </div>
        </div>

        {/* Edit Modal */}
        <CandidateEditModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          candidate={candidate}
          onSaved={loadCandidateData}
        />

        {/* Audit Log for Admins */}
        {isAdmin && candidate && (
          <div className="mt-8">
            <AuditLogViewer candidateId={candidate.id} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
