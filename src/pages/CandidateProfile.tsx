import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { 
  ArrowLeft, User, Briefcase, MapPin, Mail, Phone, Linkedin, 
  Github, Globe, Calendar, Target, TrendingUp, Eye, Activity, 
  Star, Clock, FileText, Edit, GraduationCap, Award, Settings,
  ClipboardList, Heart, Brain
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CandidatePipelineStatus } from "@/components/partner/CandidatePipelineStatus";
import { CandidateLinkedJobs } from "@/components/partner/CandidateLinkedJobs";
import { CandidateInteractionLog } from "@/components/partner/CandidateInteractionLog";
import { CandidateAnalytics } from "@/components/partner/CandidateAnalytics";
import { CandidateQuickActions } from "@/components/partner/CandidateQuickActions";
import { MusicSection } from "@/components/profile/MusicSection";
import { CandidateDecisionDashboard } from "@/components/partner/CandidateDecisionDashboard";
import { CandidateDocumentsViewer } from "@/components/partner/CandidateDocumentsViewer";
import { CandidateWorkAuthCard } from "@/components/partner/CandidateWorkAuthCard";
import { CandidateInternalRatingCard } from "@/components/partner/CandidateInternalRatingCard";
import { CandidateNotesManager } from "@/components/partner/CandidateNotesManager";
import { CandidatePipelineContextBanner } from "@/components/partner/CandidatePipelineContextBanner";
import { SourceInformationCard } from "@/components/partner/SourceInformationCard";
import { EditCandidateDialog } from "@/components/partner/EditCandidateDialog";
import { CandidateSettingsViewer } from "@/components/admin/CandidateSettingsViewer";
import { UserSettingsViewer } from "@/components/admin/UserSettingsViewer";
import { AssessmentHistory } from "@/components/candidate/AssessmentHistory";

export default function CandidateProfile() {
  const { candidateId: id } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromJobId = searchParams.get('fromJob');
  const fromStage = searchParams.get('stage');
  const fromStageIndex = searchParams.get('stageIndex');
  const defaultTab = searchParams.get('tab');
  const section = searchParams.get('section');
  const noteId = searchParams.get('noteId');
  const { user } = useAuth();
  const { role } = useUserRole();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const isTeamView = role === 'admin' || role === 'partner';

  // Manage expanded sections with localStorage persistence
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`candidate_${id}_sections`);
      if (saved) {
        setExpandedSections(JSON.parse(saved));
      } else {
        // Default expansion state
        setExpandedSections({
          assessment: true,
          summary: true,
          skills: true,
          experience: true,
          education: true,
          internal: true,
          workauth: false,
          documents: false,
          pipeline: false,
          activity: false,
          assessments: false,
          settings: false,
        });
      }
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      localStorage.setItem(`candidate_${id}_sections`, JSON.stringify(expandedSections));
    }
  }, [expandedSections, id]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    loadCandidate();
  }, [id]);

  // Handle deep linking to specific sections/notes
  useEffect(() => {
    if (section === 'notes' && noteId) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        const noteElement = document.getElementById(`note-${noteId}`);
        if (noteElement) {
          noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          noteElement.classList.add('ring-2', 'ring-primary', 'animate-pulse');
          setTimeout(() => {
            noteElement.classList.remove('animate-pulse');
          }, 2000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [section, noteId]);

  const loadCandidate = async () => {
    if (!id) return;

    try {
      // Load candidate profile
      const { data: candidateData, error } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setCandidate(candidateData);

      // If candidate has a user_id, load their public profile data
      if (candidateData.user_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", candidateData.user_id)
          .single();
        
        setUserProfile(profileData);
      }

      // Track profile view for team members
      if (isTeamView && user) {
        await supabase.from("candidate_profile_views").insert({
          candidate_id: id,
          viewer_id: user.id,
          view_context: "full_profile",
          view_source: "candidate_profile_page",
        });
      }
    } catch (error) {
      console.error("Error loading candidate:", error);
      toast.error("Failed to load candidate profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!candidate) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Candidate Not Found</h2>
              <Button onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Pipeline Context Banner */}
        {fromJobId && (
          <div className="container mx-auto px-4 pt-6">
            <CandidatePipelineContextBanner
              candidateId={id!}
              candidateName={candidate.full_name}
              jobId={fromJobId}
              currentStage={fromStage || undefined}
              stageIndex={fromStageIndex ? parseInt(fromStageIndex) : undefined}
            />
          </div>
        )}

        {/* Enhanced Header with Media Support */}
        <Card className="border-0 rounded-none border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Header Media - Optional wallpaper */}
          <div className="relative w-full h-64 overflow-hidden bg-muted">
            {candidate.header_media_url ? (
              <>
                {candidate.header_media_type === 'video' ? (
                  <video 
                    src={candidate.header_media_url} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <img 
                    src={candidate.header_media_url} 
                    alt="Profile header" 
                    className="w-full h-full object-cover" 
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-card/90 to-card/60" />
            )}
            
            {/* Admin Actions - Top Right */}
            {isTeamView && (
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                  className="gap-2 bg-background/80 backdrop-blur-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
                <CandidateQuickActions 
                  candidateId={id!} 
                  candidateEmail={candidate.email}
                  candidateName={candidate.full_name || 'Candidate'}
                  onRefresh={loadCandidate}
                />
              </div>
            )}
          </div>

          {/* Avatar - Overlapping */}
          <div className="absolute top-64 left-6 transform -translate-y-1/2 z-10">
            <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
              <AvatarImage src={candidate.avatar_url || userProfile?.avatar_url} />
              <AvatarFallback className="text-3xl font-bold">
                {candidate.full_name?.substring(0, 2).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Profile Info with Metrics */}
          <CardContent className="pt-20">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold tracking-tight">{candidate.full_name}</h1>
                {candidate.current_title && (
                  <p className="text-lg text-muted-foreground flex items-center gap-2 mt-2">
                    <Briefcase className="w-5 h-5" />
                    {candidate.current_title}
                    {candidate.current_company && ` at ${candidate.current_company}`}
                  </p>
                )}
              </div>
            </div>
            
            {/* Score Badges - Admin View Only */}
            {isTeamView && (
              <div className="flex flex-wrap gap-2 mb-4">
                {candidate.profile_completeness !== null && candidate.profile_completeness !== undefined && (
                  <Badge variant="outline" className="gap-1">
                    <Target className="w-3 h-3" />
                    {candidate.profile_completeness}% Complete
                  </Badge>
                )}
                {candidate.engagement_score !== null && candidate.engagement_score !== undefined && (
                  <Badge variant="outline" className="gap-1">
                    <Activity className="w-3 h-3" />
                    Engagement: {candidate.engagement_score}/10
                  </Badge>
                )}
                {candidate.fit_score !== null && candidate.fit_score !== undefined && (
                  <Badge variant="outline" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Fit: {candidate.fit_score}/10
                  </Badge>
                )}
                {candidate.internal_rating !== null && candidate.internal_rating !== undefined && (
                  <Badge variant="outline" className="gap-1">
                    <Star className="w-3 h-3" />
                    Rating: {candidate.internal_rating}/10
                  </Badge>
                )}
              </div>
            )}
            
            {/* Contact & Location Info */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              {candidate.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {candidate.email}
                </div>
              )}
              {candidate.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {candidate.phone}
                </div>
              )}
              {candidate.desired_locations?.[0] && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {candidate.desired_locations[0]}
                </div>
              )}
              {candidate.years_of_experience && (
                <Badge variant="secondary">
                  {candidate.years_of_experience} years experience
                </Badge>
              )}
            </div>

            {/* Social Links */}
            <div className="flex gap-2">
              {candidate.linkedin_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="w-4 h-4 mr-1" />
                    LinkedIn
                  </a>
                </Button>
              )}
              {candidate.github_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={candidate.github_url} target="_blank" rel="noopener noreferrer">
                    <Github className="w-4 h-4 mr-1" />
                    GitHub
                  </a>
                </Button>
              )}
              {candidate.portfolio_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-1" />
                    Portfolio
                  </a>
                </Button>
              )}
            </div>
            
            {/* Last Updated Timestamp - Admin Only */}
            {isTeamView && candidate.last_profile_update && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last updated: {new Date(candidate.last_profile_update).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Main Content - One Page Layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* AI Assessment Dashboard */}
              {isTeamView && (
                <CollapsibleSection
                  title="AI-Powered Assessment"
                  icon={<Target className="w-5 h-5" />}
                  importance="critical"
                  defaultExpanded={true}
                  storageKey={`candidate_${id}_section_assessment`}
                >
                  <ErrorBoundary>
                    <CandidateDecisionDashboard candidate={candidate} />
                  </ErrorBoundary>
                </CollapsibleSection>
              )}

              {/* Professional Summary */}
              <CollapsibleSection
                title="Professional Summary"
                icon={<User className="w-5 h-5" />}
                defaultExpanded={expandedSections.summary}
                onToggle={() => toggleSection('summary')}
                storageKey={`candidate_${id}_section_summary`}
              >
                {candidate.ai_summary && (
                  <div className="mb-4">
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {candidate.ai_summary}
                    </p>
                  </div>
                )}
                {candidate.years_of_experience && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span>{candidate.years_of_experience} years of experience</span>
                  </div>
                )}
                {candidate.current_title && candidate.current_company && (
                  <div className="flex items-center gap-2 text-sm mt-2">
                    <Star className="w-4 h-4 text-muted-foreground" />
                    <span>{candidate.current_title} at {candidate.current_company}</span>
                  </div>
                )}
              </CollapsibleSection>

              {/* Skills & Expertise */}
              <CollapsibleSection
                title="Skills & Expertise"
                icon={<Brain className="w-5 h-5" />}
                badge={candidate.skills?.length || 0}
                defaultExpanded={expandedSections.skills}
                onToggle={() => toggleSection('skills')}
                storageKey={`candidate_${id}_section_skills`}
              >
                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Technical Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill: any, index: number) => (
                        <Badge key={index} variant="secondary">
                          {typeof skill === 'string' ? skill : skill.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {candidate.languages && candidate.languages.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Languages</h4>
                    <div className="flex flex-wrap gap-2">
                      {candidate.languages.map((lang: any, index: number) => (
                        <Badge key={index} variant="outline">
                          {typeof lang === 'string' ? lang : `${lang.language} - ${lang.proficiency}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {candidate.certifications && candidate.certifications.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Certifications</h4>
                    <div className="flex flex-wrap gap-2">
                      {candidate.certifications.map((cert: any, index: number) => (
                        <Badge key={index} variant="outline">
                          <Award className="w-3 h-3 mr-1" />
                          {cert.name || cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleSection>

              {/* Work Experience */}
              {candidate.work_history && candidate.work_history.length > 0 && (
                <CollapsibleSection
                  title="Work Experience"
                  icon={<Briefcase className="w-5 h-5" />}
                  badge={candidate.work_history.length}
                  defaultExpanded={expandedSections.experience}
                  onToggle={() => toggleSection('experience')}
                  storageKey={`candidate_${id}_section_experience`}
                >
                  <div className="space-y-6">
                    {candidate.work_history.map((job: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{job.title || job.position}</h4>
                            <p className="text-sm text-muted-foreground">{job.company}</p>
                          </div>
                          <Badge variant="outline">
                            {job.start_date} - {job.end_date || 'Present'}
                          </Badge>
                        </div>
                        {job.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {job.description}
                          </p>
                        )}
                        {index < candidate.work_history.length - 1 && <Separator className="my-4" />}
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Education */}
              {candidate.education && candidate.education.length > 0 && (
                <CollapsibleSection
                  title="Education"
                  icon={<GraduationCap className="w-5 h-5" />}
                  badge={candidate.education.length}
                  defaultExpanded={expandedSections.education}
                  onToggle={() => toggleSection('education')}
                  storageKey={`candidate_${id}_section_education`}
                >
                  <div className="space-y-4">
                    {candidate.education.map((edu: any, index: number) => (
                      <div key={index} className="space-y-1">
                        <h4 className="font-semibold">{edu.degree || edu.field_of_study}</h4>
                        <p className="text-sm text-muted-foreground">{edu.institution || edu.school}</p>
                        <p className="text-xs text-muted-foreground">
                          {edu.start_year} - {edu.end_year || 'Present'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Source Information - For Team Only */}
              {isTeamView && (
                <SourceInformationCard candidateId={id!} />
              )}
            </div>

            {/* RIGHT COLUMN - Team Assessment & Context */}
            {isTeamView && (
              <div className="space-y-6">
                {/* Internal Assessment */}
                <CollapsibleSection
                  title="Internal Assessment"
                  icon={<Star className="w-5 h-5" />}
                  importance="high"
                  defaultExpanded={expandedSections.internal}
                  onToggle={() => toggleSection('internal')}
                  storageKey={`candidate_${id}_section_internal`}
                >
                  <div className="space-y-6">
                    <ErrorBoundary>
                      <CandidateNotesManager 
                        candidateId={id!}
                        userRole={role as any}
                        compact
                      />
                    </ErrorBoundary>
                    <Separator />
                    <CandidateInternalRatingCard 
                      candidateId={id!}
                      candidate={candidate}
                      onUpdate={loadCandidate}
                    />
                  </div>
                </CollapsibleSection>

                {/* Work Authorization */}
                <CollapsibleSection
                  title="Work Authorization"
                  icon={<Globe className="w-5 h-5" />}
                  defaultExpanded={expandedSections.workauth}
                  onToggle={() => toggleSection('workauth')}
                  storageKey={`candidate_${id}_section_workauth`}
                >
                  <CandidateWorkAuthCard candidate={candidate} />
                </CollapsibleSection>

                {/* Documents */}
                <CollapsibleSection
                  title="Documents"
                  icon={<FileText className="w-5 h-5" />}
                  defaultExpanded={expandedSections.documents}
                  onToggle={() => toggleSection('documents')}
                  storageKey={`candidate_${id}_section_documents`}
                >
                  <ErrorBoundary>
                    <CandidateDocumentsViewer 
                      candidateId={id!} 
                      canUpload={isTeamView}
                      compact
                    />
                  </ErrorBoundary>
                </CollapsibleSection>

                {/* Pipeline & Applications */}
                <CollapsibleSection
                  title="Pipeline & Applications"
                  icon={<TrendingUp className="w-5 h-5" />}
                  defaultExpanded={expandedSections.pipeline}
                  onToggle={() => toggleSection('pipeline')}
                  storageKey={`candidate_${id}_section_pipeline`}
                >
                  <div className="space-y-6">
                    <ErrorBoundary>
                      <CandidatePipelineStatus 
                        candidateId={id!}
                        compact
                      />
                    </ErrorBoundary>
                    <ErrorBoundary>
                      <CandidateLinkedJobs 
                        candidateId={id!} 
                        candidateEmail={candidate.email}
                        compact
                      />
                    </ErrorBoundary>
                  </div>
                </CollapsibleSection>

                {/* Activity & Analytics */}
                <CollapsibleSection
                  title="Activity & Analytics"
                  icon={<Activity className="w-5 h-5" />}
                  defaultExpanded={expandedSections.activity}
                  onToggle={() => toggleSection('activity')}
                  storageKey={`candidate_${id}_section_activity`}
                >
                  <div className="space-y-6">
                    <ErrorBoundary>
                      <CandidateInteractionLog 
                        candidateId={id!}
                        compact
                        maxItems={5}
                      />
                    </ErrorBoundary>
                    <ErrorBoundary>
                      <CandidateAnalytics 
                        candidateId={id!}
                        compact
                      />
                    </ErrorBoundary>
                  </div>
                </CollapsibleSection>
              </div>
            )}
          </div>

          {/* Full-width sections */}
          <div className="mt-6 space-y-6">
            {/* Assessments */}
            {candidate.user_id && (
              <CollapsibleSection
                title="Assessments"
                icon={<ClipboardList className="w-5 h-5" />}
                defaultExpanded={expandedSections.assessments}
                onToggle={() => toggleSection('assessments')}
                storageKey={`candidate_${id}_section_assessments`}
              >
                <AssessmentHistory 
                  userId={candidate.user_id}
                  viewMode={isTeamView ? (role === 'admin' ? 'admin' : 'partner') : 'candidate'}
                />
              </CollapsibleSection>
            )}

            {/* Advanced Settings - Admin Only */}
            {isTeamView && candidate.user_id && (
              <CollapsibleSection
                title="Advanced Settings"
                icon={<Settings className="w-5 h-5" />}
                defaultExpanded={expandedSections.settings}
                onToggle={() => toggleSection('settings')}
                storageKey={`candidate_${id}_section_settings`}
              >
                <UserSettingsViewer 
                  userId={candidate.user_id} 
                  userName={candidate.full_name}
                  source="candidate_profile"
                />
              </CollapsibleSection>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {candidate && (
        <EditCandidateDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          candidate={candidate}
          onSave={loadCandidate}
        />
      )}
    </AppLayout>
  );
}
