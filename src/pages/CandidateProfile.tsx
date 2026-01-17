import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, User, Briefcase, MapPin, Mail, Phone, Linkedin,
  Github, Globe, Target, TrendingUp, Activity,
  Star, Clock, Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SectionLoader } from "@/components/ui/unified-loader";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CandidatePipelineStatus } from "@/components/partner/CandidatePipelineStatus";
import { CandidateLinkedJobs } from "@/components/partner/CandidateLinkedJobs";
import { CandidateInteractionLog } from "@/components/partner/CandidateInteractionLog";
import { CandidateAnalytics } from "@/components/partner/CandidateAnalytics";
import { CandidateQuickActions } from "@/components/partner/CandidateQuickActions";
import { CandidateDecisionDashboard } from "@/components/partner/CandidateDecisionDashboard";
import { CandidateDocumentsViewer } from "@/components/partner/CandidateDocumentsViewer";
import { CandidateWorkAuthCard } from "@/components/partner/CandidateWorkAuthCard";
import { CandidateInternalRatingCard } from "@/components/partner/CandidateInternalRatingCard";
import { CandidateNotesManager } from "@/components/partner/CandidateNotesManager";
import { CandidatePipelineContextBanner } from "@/components/partner/CandidatePipelineContextBanner";
import { SourceInformationCard } from "@/components/partner/SourceInformationCard";
import { EditCandidateDialog } from "@/components/partner/EditCandidateDialog";
import { UserSettingsViewer } from "@/components/admin/UserSettingsViewer";
import { AssessmentHistory } from "@/components/candidate/AssessmentHistory";
import { TalentPoolTags } from "@/components/candidates/TalentPoolTags";
import { CandidateNotesPanel } from "@/components/candidates/CandidateNotesPanel";

export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromJobId = searchParams.get('fromJob');
  const fromStage = searchParams.get('stage');
  const fromStageIndex = searchParams.get('stageIndex');
  const defaultTab = searchParams.get('tab');
  const section = searchParams.get('section');
  const noteId = searchParams.get('noteId');
  const { user } = useAuth();
  const { currentRole: role } = useRole();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(defaultTab || "overview");
  const [isImporting, setIsImporting] = useState(false);

  const isTeamView = role === 'admin' || role === 'partner';

  useEffect(() => {
    loadCandidate();
  }, [id]);

  // Handle deep linking to specific sections/notes
  useEffect(() => {
    if (section === 'notes' && noteId && activeTab === 'team-assessment') {
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
  }, [section, noteId, activeTab]);

  const loadCandidate = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

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
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedInImport = async () => {
    if (!candidate?.linkedin_url) {
      toast.error("LinkedIn URL is missing");
      return;
    }

    setIsImporting(true);
    const toastId = toast.loading("Importing profile data from LinkedIn...");

    try {
      const { data, error } = await supabase.functions.invoke('linkedin-scraper', {
        body: { linkedinUrl: candidate.linkedin_url }
      });

      if (error) throw error;

      if (data.success) {
        // Update candidate profile with imported data
        const { error: updateError } = await supabase
          .from("candidate_profiles")
          .update({
            full_name: data.data.full_name || candidate.full_name,
            current_title: data.data.current_title || candidate.current_title,
            current_company: data.data.current_company || candidate.current_company,
            years_of_experience: data.data.years_of_experience || candidate.years_of_experience,
            skills: data.data.skills || candidate.skills,
            work_history: data.data.work_history || candidate.work_history,
            education: data.data.education || candidate.education,
            ai_summary: data.data.ai_summary || candidate.ai_summary,
            last_profile_update: new Date().toISOString()
          })
          .eq("id", id ?? '');

        if (updateError) throw updateError;

        toast.success("Profile imported successfully", { id: toastId });
        loadCandidate();
      } else {
        throw new Error(data.error || "Import failed");
      }
    } catch (error: any) {
      console.error("Error importing LinkedIn profile:", error);
      toast.error(error.message || "Failed to import from LinkedIn", { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <SectionLoader />
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
          <div className="container mx-auto px-2 sm:px-4 pt-4 sm:pt-6">
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
            className="absolute top-2 left-2 sm:top-4 sm:left-4 z-20"
          >
            <ArrowLeft className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          {/* Header Media - Optional wallpaper */}
          <div className="relative w-full h-32 sm:h-48 md:h-64 overflow-hidden bg-muted">
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
              <>
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditDialogOpen(true)}
                    className="gap-1 sm:gap-2 bg-background/80 backdrop-blur-sm text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Edit Profile</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>

                  {candidate.linkedin_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLinkedInImport}
                      disabled={isImporting}
                      className="gap-1 sm:gap-2 bg-background/80 backdrop-blur-sm text-xs sm:text-sm px-2 sm:px-3 border-primary/20 hover:border-primary/50"
                    >
                      <Linkedin className={cn("w-3 h-3 sm:w-4 sm:h-4", isImporting && "animate-pulse")} />
                      <span className="hidden sm:inline">
                        {isImporting ? "Importing..." : "Sync LinkedIn"}
                      </span>
                      <span className="sm:hidden">Sync</span>
                    </Button>
                  )}

                  <div className="hidden sm:block">
                    <CandidateQuickActions
                      candidateId={id!}
                      candidateEmail={candidate.email}
                      candidateName={candidate.full_name || 'Candidate'}
                      onRefresh={loadCandidate}
                    />
                  </div>
                </div>
                {/* Mobile Quick Actions - Below header */}
                <div className="sm:hidden absolute bottom-2 right-2 z-10">
                  <CandidateQuickActions
                    candidateId={id!}
                    candidateEmail={candidate.email}
                    candidateName={candidate.full_name || 'Candidate'}
                    onRefresh={loadCandidate}
                  />
                </div>
              </>
            )}
          </div>

          {/* Avatar - Overlapping - Responsive positioning */}
          <div className="absolute top-24 left-4 sm:top-32 sm:left-6 md:top-48 md:left-6 transform -translate-y-1/2 z-10">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 border-2 sm:border-4 border-background shadow-xl">
              <AvatarImage src={candidate.avatar_url || userProfile?.avatar_url} />
              <AvatarFallback className="text-xl sm:text-2xl md:text-3xl font-bold">
                {candidate.full_name?.substring(0, 2).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Profile Info with Metrics */}
          <CardContent className="pt-12 sm:pt-16 md:pt-20 px-4 sm:px-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0 pr-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight break-words">{candidate.full_name}</h1>
                {candidate.current_title && (
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground flex items-start sm:items-center gap-1 sm:gap-2 mt-2 break-words">
                    <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <span className="break-words">
                      {candidate.current_title}
                      {candidate.current_company && (
                        <span className="hidden sm:inline"> at {candidate.current_company}</span>
                      )}
                      {candidate.current_company && (
                        <span className="sm:hidden block mt-1">{candidate.current_company}</span>
                      )}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Score Badges - Admin View Only */}
            {isTeamView && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
                {/* Talent Pool Tags */}
                <TalentPoolTags
                  candidateId={id!}
                  initialTags={candidate.tags || []}
                  onTagsChange={() => loadCandidate()}
                  size="sm"
                />

                {candidate.profile_completeness !== null && candidate.profile_completeness !== undefined && (
                  <Badge variant="outline" className="gap-1 text-xs sm:text-sm">
                    <Target className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">{candidate.profile_completeness}% Complete</span>
                    <span className="sm:hidden">{candidate.profile_completeness}%</span>
                  </Badge>
                )}
                {candidate.engagement_score !== null && candidate.engagement_score !== undefined && (
                  <Badge variant="outline" className="gap-1 text-xs sm:text-sm">
                    <Activity className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">Engagement: {candidate.engagement_score}/10</span>
                    <span className="sm:hidden">Eng: {candidate.engagement_score}</span>
                  </Badge>
                )}
                {candidate.fit_score !== null && candidate.fit_score !== undefined && (
                  <Badge variant="outline" className="gap-1 text-xs sm:text-sm">
                    <TrendingUp className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">Fit: {candidate.fit_score}/10</span>
                    <span className="sm:hidden">Fit: {candidate.fit_score}</span>
                  </Badge>
                )}
                {candidate.internal_rating !== null && candidate.internal_rating !== undefined && (
                  <Badge variant="outline" className="gap-1 text-xs sm:text-sm">
                    <Star className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">Rating: {candidate.internal_rating}/10</span>
                    <span className="sm:hidden">{candidate.internal_rating}/10</span>
                  </Badge>
                )}
              </div>
            )}

            {/* Contact & Location Info */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-4">
              {candidate.email && (
                <div className="flex items-center gap-1 min-w-0">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{candidate.email}</span>
                </div>
              )}
              {candidate.phone && (
                <div className="flex items-center gap-1 min-w-0">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{candidate.phone}</span>
                </div>
              )}
              {candidate.desired_locations?.[0] && (
                <div className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{candidate.desired_locations[0]}</span>
                </div>
              )}
              {candidate.years_of_experience && (
                <Badge variant="secondary" className="text-xs sm:text-sm w-fit">
                  {candidate.years_of_experience} years experience
                </Badge>
              )}
            </div>

            {/* Social Links */}
            <div className="flex flex-wrap gap-2">
              {candidate.linkedin_url && (
                <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">LinkedIn</span>
                  </a>
                </Button>
              )}
              {candidate.github_url && (
                <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                  <a href={candidate.github_url} target="_blank" rel="noopener noreferrer">
                    <Github className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">GitHub</span>
                  </a>
                </Button>
              )}
              {candidate.portfolio_url && (
                <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                  <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Portfolio</span>
                  </a>
                </Button>
              )}
            </div>

            {/* Last Updated Timestamp - Admin Only */}
            {isTeamView && candidate.last_profile_update && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1 flex-wrap">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="break-words">
                  <span className="hidden sm:inline">Last updated: </span>
                  <span className="sm:hidden">Updated: </span>
                  {new Date(candidate.last_profile_update).toLocaleDateString()}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 h-auto">
                <TabsTrigger value="overview" className="text-xs sm:text-sm whitespace-nowrap">Overview</TabsTrigger>
                <TabsTrigger value="assessments" className="text-xs sm:text-sm whitespace-nowrap">Assessments</TabsTrigger>
                {isTeamView && <TabsTrigger value="team-assessment" className="text-xs sm:text-sm whitespace-nowrap">Team</TabsTrigger>}
                <TabsTrigger value="experience" className="text-xs sm:text-sm whitespace-nowrap">Experience</TabsTrigger>
                {isTeamView && <TabsTrigger value="settings" className="text-xs sm:text-sm whitespace-nowrap">Settings</TabsTrigger>}
                {isTeamView && <TabsTrigger value="workauth" className="text-xs sm:text-sm whitespace-nowrap">Work Auth</TabsTrigger>}
                {isTeamView && <TabsTrigger value="pipeline" className="text-xs sm:text-sm whitespace-nowrap">Pipeline</TabsTrigger>}
                {isTeamView && <TabsTrigger value="activity" className="text-xs sm:text-sm whitespace-nowrap">Activity</TabsTrigger>}
              </TabsList>
            </div>

            {/* Assessments Tab - Available for all users */}
            {candidate.user_id && (
              <TabsContent value="assessments" className="space-y-6">
                <AssessmentHistory
                  userId={candidate.user_id}
                  viewMode={isTeamView ? (role === 'admin' ? 'admin' : 'partner') : 'candidate'}
                />
              </TabsContent>
            )}

            {/* Settings Tab - Admin Only */}
            {isTeamView && candidate.user_id && (
              <TabsContent value="settings" className="space-y-6">
                <UserSettingsViewer
                  userId={candidate.user_id}
                  userName={candidate.full_name}
                  source="candidate_profile"
                />
              </TabsContent>
            )}

            {/* Team Assessment Tab - Combines Decision, Documents, Notes, Internal - Admin/Partner Only */}
            {isTeamView && (
              <TabsContent value="team-assessment" className="space-y-4 sm:space-y-6">
                <ErrorBoundary>
                  <CandidateDecisionDashboard candidate={candidate} />
                </ErrorBoundary>

                <Card>
                  <CardHeader>
                    <CardTitle>Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ErrorBoundary>
                      <CandidateDocumentsViewer
                        candidateId={id!}
                        canUpload={isTeamView}
                      />
                    </ErrorBoundary>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Internal Notes & Rating</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ErrorBoundary>
                      <CandidateNotesManager
                        candidateId={id!}
                        userRole={role as any}
                        activeTab={activeTab}
                      />
                    </ErrorBoundary>
                    <CandidateInternalRatingCard
                      candidateId={id!}
                      candidate={candidate}
                      onUpdate={loadCandidate}
                    />
                  </CardContent>
                </Card>

                {/* Candidate Notes Panel */}
                <CandidateNotesPanel candidateId={id!} />
              </TabsContent>
            )}

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              {/* AI Summary */}
              {candidate.ai_summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                      AI Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {candidate.ai_summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {candidate.skills.map((skill: any, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs sm:text-sm">
                          {typeof skill === 'string' ? skill : skill.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Languages */}
              {candidate.languages && candidate.languages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Languages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {candidate.languages.map((lang: any, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs sm:text-sm">
                          {typeof lang === 'string' ? lang : `${lang.language} - ${lang.proficiency}`}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Career Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Career Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  {candidate.desired_salary_min && candidate.desired_salary_max && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium mb-1">Salary Expectations</p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        {candidate.preferred_currency || 'EUR'} {candidate.desired_salary_min.toLocaleString()} - {candidate.desired_salary_max.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {candidate.notice_period && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium mb-1">Notice Period</p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">{candidate.notice_period}</p>
                    </div>
                  )}
                  {candidate.remote_preference && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium mb-1">Remote Preference</p>
                      <p className="text-xs sm:text-sm text-muted-foreground capitalize break-words">{candidate.remote_preference}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Source Information - For Team Only */}
              {isTeamView && (
                <SourceInformationCard candidateId={id!} />
              )}
            </TabsContent>

            {/* Experience Tab - Combines Experience, Education, Social */}
            <TabsContent value="experience" className="space-y-4 sm:space-y-6">
              {/* Work History */}
              {candidate.work_history && candidate.work_history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Work Experience</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
                    {candidate.work_history.map((job: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm sm:text-base break-words">{job.title || job.position}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground break-words">{job.company}</p>
                          </div>
                          <Badge variant="outline" className="text-xs sm:text-sm w-fit">
                            {job.start_date} - {job.end_date || 'Present'}
                          </Badge>
                        </div>
                        {job.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-words">
                            {job.description}
                          </p>
                        )}
                        {index < candidate.work_history.length - 1 && <Separator />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Education */}
              {candidate.education && candidate.education.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Education</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    {candidate.education.map((edu: any, index: number) => (
                      <div key={index} className="space-y-1">
                        <h4 className="font-semibold text-sm sm:text-base break-words">{edu.degree || edu.field_of_study}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground break-words">{edu.institution || edu.school}</p>
                        <p className="text-xs text-muted-foreground">
                          {edu.start_year} - {edu.end_year || 'Present'}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Certifications */}
              {candidate.certifications && candidate.certifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Certifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {candidate.certifications.map((cert: any, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <Badge variant="secondary">{cert.name || cert}</Badge>
                        {cert.issuer && (
                          <span className="text-sm text-muted-foreground">by {cert.issuer}</span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Social Links Section */}
              {(candidate.linkedin_url || candidate.github_url || candidate.portfolio_url) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Social Profiles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {candidate.linkedin_url && (
                      <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:underline">
                        <Linkedin className="w-4 h-4" />
                        LinkedIn Profile
                      </a>
                    )}
                    {candidate.github_url && (
                      <a href={candidate.github_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:underline">
                        <Github className="w-4 h-4" />
                        GitHub Profile
                      </a>
                    )}
                    {candidate.portfolio_url && (
                      <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:underline">
                        <Globe className="w-4 h-4" />
                        Portfolio Website
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Work Authorization Tab - Admin Only */}
            {isTeamView && (
              <TabsContent value="workauth" className="space-y-4 sm:space-y-6">
                <CandidateWorkAuthCard candidate={candidate} />
              </TabsContent>
            )}

            {/* Pipeline Tab - Combines Pipeline & Jobs - Admin Only */}
            {isTeamView && (
              <TabsContent value="pipeline" className="space-y-4 sm:space-y-6">
                <ErrorBoundary>
                  <CandidatePipelineStatus
                    candidateId={id!}
                    activeTab={activeTab}
                  />
                </ErrorBoundary>
                <ErrorBoundary>
                  <CandidateLinkedJobs
                    candidateId={id!}
                    candidateEmail={candidate.email}
                    activeTab={activeTab}
                  />
                </ErrorBoundary>
              </TabsContent>
            )}

            {/* Activity Tab - Combines Analytics & Activity - Admin Only */}
            {isTeamView && (
              <TabsContent value="activity" className="space-y-4 sm:space-y-6">
                <ErrorBoundary>
                  <CandidateInteractionLog
                    candidateId={id!}
                    activeTab={activeTab}
                  />
                </ErrorBoundary>
                <ErrorBoundary>
                  <CandidateAnalytics
                    candidateId={id!}
                    activeTab={activeTab}
                  />
                </ErrorBoundary>
              </TabsContent>
            )}
          </Tabs>
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
