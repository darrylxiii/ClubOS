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
import { useUserRole } from "@/hooks/useUserRole";
import { BackButton } from "@/components/candidate-profile/BackButton";
import { ActivityFeedCard } from "@/components/candidate-profile/ActivityFeedCard";
import { CandidateEditModal } from "@/components/candidate-profile/CandidateEditModal";

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
  
  const { role } = useUserRole();
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

      // Load additional data - cast to any to bypass strict types
      const experienceQuery = await (supabase as any)
        .from('experience')
        .select('*')
        .eq('user_id', candidateId)
        .order('start_date', { ascending: false });
      
      const educationQuery = await (supabase as any)
        .from('education')
        .select('*')
        .eq('user_id', candidateId)
        .order('start_date', { ascending: false });
      
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
      setExperiences(experienceQuery.data || []);
      setEducation(educationQuery.data || []);
      setCertifications([]);
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
                {/* Career Preferences - Compact */}
                <Card className={`${candidateProfileTokens.glass.card} sticky top-24`}>
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
                <div className="sticky top-[32rem]">
                  <CandidateWorkAuthCard candidate={candidate} />
                </div>

                {/* Activity Feed */}
                <ActivityFeedCard candidateId={candidateId!} />
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
