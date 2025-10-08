import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, User, Briefcase, MapPin, Mail, Phone, Linkedin, 
  Github, Globe, Calendar, Target, TrendingUp, Eye, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { CandidatePipelineStatus } from "@/components/partner/CandidatePipelineStatus";
import { CandidateLinkedJobs } from "@/components/partner/CandidateLinkedJobs";
import { CandidateInteractionLog } from "@/components/partner/CandidateInteractionLog";
import { CandidateAnalytics } from "@/components/partner/CandidateAnalytics";
import { CandidateQuickActions } from "@/components/partner/CandidateQuickActions";
import { MusicSection } from "@/components/profile/MusicSection";

export default function CandidateProfile() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const isTeamView = role === 'admin' || role === 'partner';

  useEffect(() => {
    loadCandidate();
  }, [candidateId]);

  const loadCandidate = async () => {
    if (!candidateId) return;

    try {
      // Load candidate profile
      const { data: candidateData, error } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("id", candidateId)
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
          candidate_id: candidateId,
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
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={candidate.avatar_url || userProfile?.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {candidate.full_name?.substring(0, 2).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="text-3xl font-bold">{candidate.full_name}</h1>
                  {candidate.current_title && (
                    <p className="text-lg text-muted-foreground flex items-center gap-2 mt-1">
                      <Briefcase className="w-4 h-4" />
                      {candidate.current_title}
                      {candidate.current_company && ` at ${candidate.current_company}`}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
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
              </div>

              {isTeamView && (
                <CandidateQuickActions 
                  candidateId={candidateId!} 
                  candidateEmail={candidate.email}
                  onRefresh={loadCandidate}
                />
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue={isTeamView ? "pipeline" : "overview"} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              {isTeamView && (
                <>
                  <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                  <TabsTrigger value="jobs">Jobs</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </>
              )}
            </TabsList>

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
            </TabsContent>

            {/* Experience Tab */}
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
            </TabsContent>

            {/* Social Tab */}
            <TabsContent value="social" className="space-y-6">
              {userProfile && (
                <MusicSection
                  spotifyConnected={userProfile.spotify_connected}
                  appleMusicConnected={userProfile.apple_music_connected}
                  spotifyPlaylists={userProfile.spotify_playlists || []}
                  appleMusicPlaylists={userProfile.apple_music_playlists || []}
                />
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Social Links</CardTitle>
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
            </TabsContent>

            {/* Team-Only Tabs */}
            {isTeamView && (
              <>
                <TabsContent value="pipeline" className="space-y-6">
                  <CandidatePipelineStatus 
                    candidateId={candidateId!} 
                    candidateEmail={candidate.email}
                  />
                </TabsContent>

                <TabsContent value="jobs" className="space-y-6">
                  <CandidateLinkedJobs 
                    candidateId={candidateId!} 
                    candidateEmail={candidate.email}
                  />
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                  <CandidateInteractionLog 
                    candidateEmail={candidate.email}
                  />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                  <CandidateAnalytics candidateId={candidateId!} />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
