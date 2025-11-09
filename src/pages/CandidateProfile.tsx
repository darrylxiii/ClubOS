import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, User, Briefcase, MapPin, Mail, Phone, Linkedin, 
  Github, Globe, Calendar, Target, TrendingUp, Eye, Activity, 
  Star, Clock, FileText, Edit
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
  const [activeTab, setActiveTab] = useState<string>(defaultTab || "overview");
  
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

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="assessments">Assessments</TabsTrigger>
              {isTeamView && <TabsTrigger value="team-assessment">Team View</TabsTrigger>}
              <TabsTrigger value="experience">Experience</TabsTrigger>
              {isTeamView && <TabsTrigger value="settings">Settings</TabsTrigger>}
              {isTeamView && <TabsTrigger value="workauth">Work Auth</TabsTrigger>}
              {isTeamView && <TabsTrigger value="pipeline">Pipeline</TabsTrigger>}
              {isTeamView && <TabsTrigger value="activity">Activity</TabsTrigger>}
            </TabsList>

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
              <TabsContent value="team-assessment" className="space-y-6">
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
              </TabsContent>
            )}

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* AI Summary */}
              {candidate.ai_summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      AI Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {candidate.ai_summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill: any, index: number) => (
                        <Badge key={index} variant="secondary">
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
                    <CardTitle>Languages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {candidate.languages.map((lang: any, index: number) => (
                        <Badge key={index} variant="outline">
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
                  <CardTitle>Career Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {candidate.desired_salary_min && candidate.desired_salary_max && (
                    <div>
                      <p className="text-sm font-medium mb-1">Salary Expectations</p>
                      <p className="text-muted-foreground">
                        {candidate.preferred_currency || 'EUR'} {candidate.desired_salary_min.toLocaleString()} - {candidate.desired_salary_max.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {candidate.notice_period && (
                    <div>
                      <p className="text-sm font-medium mb-1">Notice Period</p>
                      <p className="text-muted-foreground">{candidate.notice_period}</p>
                    </div>
                  )}
                  {candidate.remote_preference && (
                    <div>
                      <p className="text-sm font-medium mb-1">Remote Preference</p>
                      <p className="text-muted-foreground capitalize">{candidate.remote_preference}</p>
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
            <TabsContent value="experience" className="space-y-6">
              {/* Work History */}
              {candidate.work_history && candidate.work_history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Work Experience</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
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
                    <CardTitle>Education</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {candidate.education.map((edu: any, index: number) => (
                      <div key={index} className="space-y-1">
                        <h4 className="font-semibold">{edu.degree || edu.field_of_study}</h4>
                        <p className="text-sm text-muted-foreground">{edu.institution || edu.school}</p>
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
              <TabsContent value="workauth" className="space-y-6">
                <CandidateWorkAuthCard candidate={candidate} />
              </TabsContent>
            )}

            {/* Pipeline Tab - Combines Pipeline & Jobs - Admin Only */}
            {isTeamView && (
              <TabsContent value="pipeline" className="space-y-6">
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
              <TabsContent value="activity" className="space-y-6">
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
