import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Briefcase, GraduationCap, Award, Folder, Settings, Download, Share2, Eye, Music2, Edit, FileText, Mail, Shield } from "lucide-react";
import { ExperienceSection } from "@/components/profile/ExperienceSection";
import { EducationSection } from "@/components/profile/EducationSection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { PortfolioSection } from "@/components/profile/PortfolioSection";
import { LinkedInImport } from "@/components/profile/LinkedInImport";
import { MusicSection } from "@/components/profile/MusicSection";
import { ProfileHeaderUpload } from "@/components/profile/ProfileHeaderUpload";
import { SocialActivityFeed } from "@/components/profile/SocialActivityFeed";
import { ChangeAvatarDialog } from "@/components/profile/ChangeAvatarDialog";
import { ActivityTimeline } from "@/components/profile/ActivityTimeline";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ShareProfileDialog } from "@/components/profile/ShareProfileDialog";
import { FreelanceInfoSection } from "@/components/profile/FreelanceInfoSection";
import EditProfileSlugDialog from "@/components/profile/EditProfileSlugDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { UserSettingsViewer } from "@/components/admin/UserSettingsViewer";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SectionLoader } from "@/components/ui/unified-loader";

interface EnhancedProfileProps {
  viewingUserId?: string;
  isSharedView?: boolean;
}

export default function EnhancedProfile({ viewingUserId, isSharedView = false }: EnhancedProfileProps = {}) {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [slugDialogOpen, setSlugDialogOpen] = useState(false);

  // Determine which user's profile to show
  const profileUserId = viewingUserId || user?.id;
  const isOwnProfile = !isSharedView && user?.id === profileUserId;
  const isAdminViewing = (currentRole === 'admin' || currentRole === 'strategist') && !isOwnProfile;

  useEffect(() => {
    loadProfile();
  }, [profileUserId]);

  const loadProfile = async () => {
    if (!profileUserId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileUserId)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }
    setProfile(data);
    setLoading(false);
  };

  const handleExportData = async () => {
    if (!user || !isOwnProfile) return;

    toast.success('Preparing your data export...');

    const { error } = await supabase
      .from('profile_data_exports')
      .insert({
        user_id: user.id,
        export_status: 'pending'
      });

    if (error) {
      toast.error('Failed to request data export');
      return;
    }

    toast.success('Data export requested. You\'ll receive an email when ready.');
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

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Profile Header */}
        <Card className="relative overflow-visible">
          {/* Header Media (Image or Video Wallpaper) */}
          <div className="relative w-full h-64 overflow-hidden bg-muted rounded-t-lg">
            {profile?.header_media_url ? (
              <>
                {profile.header_media_type === 'video' ? (
                  <video
                    src={profile.header_media_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={profile.header_media_url}
                    alt="Profile header"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
              </>
            ) : null}

            {/* Upload button in bottom right - only for own profile */}
            {isOwnProfile && (
              <div className="absolute bottom-4 right-4">
                <ProfileHeaderUpload
                  currentMediaUrl={profile?.header_media_url}
                  currentMediaType={profile?.header_media_type}
                  onUploadComplete={loadProfile}
                />
              </div>
            )}
          </div>

          {/* Avatar positioned to overlap header and content */}
          <div className="absolute top-64 left-6 transform -translate-y-1/2 z-10">
            <Avatar className="w-32 h-32 border-4 border-background">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                {profile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <Button
                size="sm"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full h-10 w-10 p-0 shadow-lg"
                onClick={() => setAvatarDialogOpen(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>

          <CardContent className="pt-20">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold">{profile?.full_name || 'Your Name'}</h1>
                  <p className="text-muted-foreground">{profile?.current_title || 'Your Title'}</p>
                </div>
                {isOwnProfile && (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/profile/${profile?.profile_slug || user?.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShareDialogOpen(true)}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSlugDialogOpen(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit URL
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {profile?.location && (
                  <Badge variant="secondary">{profile.location}</Badge>
                )}
                {profile?.stealth_mode_enabled && (
                  <Badge variant="outline">Stealth Mode Active</Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {profile?.career_preferences || 'Add your professional summary here...'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Stats */}
        <ProfileStats
          stats={{
            profileViews: profile?.profile_views || 0,
            connections: profile?.connection_count || 0,
            applicationsActive: profile?.active_applications || 0,
            achievementsUnlocked: profile?.achievements_count || 0,
            engagementRate: profile?.engagement_rate || 0
          }}
        />

        {/* Freelance Info - Show if user is open to freelance work */}
        <FreelanceInfoSection
          profile={profile}
          isOwnProfile={isOwnProfile}
        />

        {/* Quick Actions - Only for own profile */}
        {isOwnProfile && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Import data and manage your profile</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <LinkedInImport />
              <Button variant="outline" asChild>
                <a href="/profile/documents">
                  <FileText className="w-4 h-4 mr-2" />
                  Manage Documents
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/settings/email">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Connections
                </a>
              </Button>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                Export My Data (GDPR)
              </Button>
              <Button variant="outline" asChild>
                <a href="/settings#privacy">
                  <Settings className="w-4 h-4 mr-2" />
                  Privacy Settings
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="experience" className="space-y-6">
          <TabsList className={`grid w-full ${isAdminViewing ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <TabsTrigger value="experience" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Experience</span>
            </TabsTrigger>
            <TabsTrigger value="education" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Education</span>
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Skills</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <Folder className="w-4 h-4" />
              <span className="hidden sm:inline">Portfolio</span>
            </TabsTrigger>
            <TabsTrigger value="music" className="flex items-center gap-2">
              <Music2 className="w-4 h-4" />
              <span className="hidden sm:inline">Music</span>
            </TabsTrigger>
            {isAdminViewing && (
              <TabsTrigger value="admin-settings" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Settings</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="experience" className="space-y-6">
            <ExperienceSection userId={profileUserId} isReadOnly={!isOwnProfile} />
          </TabsContent>

          <TabsContent value="education" className="space-y-6">
            <EducationSection userId={profileUserId} isReadOnly={!isOwnProfile} />
          </TabsContent>

          <TabsContent value="skills" className="space-y-6">
            <SkillsSection userId={profileUserId} isReadOnly={!isOwnProfile} />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            <PortfolioSection userId={profileUserId} isReadOnly={!isOwnProfile} />
          </TabsContent>

          <TabsContent value="music" className="space-y-6">
            <MusicSection
              spotifyConnected={(profile as any)?.spotify_connected}
              appleMusicConnected={(profile as any)?.apple_music_connected}
              spotifyPlaylists={(profile as any)?.spotify_playlists || []}
              appleMusicPlaylists={(profile as any)?.apple_music_playlists || []}
            />
          </TabsContent>

          {isAdminViewing && (
            <TabsContent value="admin-settings" className="space-y-6">
              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                <Shield className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-900 dark:text-orange-200">
                  🔒 Admin View: You are viewing {profile?.full_name || 'this user'}'s complete settings and private data.
                  This information is GDPR protected and must be handled accordingly.
                </AlertDescription>
              </Alert>

              <UserSettingsViewer
                userId={profileUserId!}
                userName={profile?.full_name || profile?.email || 'User'}
                source="admin_user_profile"
              />
            </TabsContent>
          )}
        </Tabs>

        {/* Activity Timeline */}
        {profileUserId && (
          <ActivityTimeline userId={profileUserId} viewMode="grid" />
        )}

        {/* Social Activity Feed */}
        <SocialActivityFeed userId={profileUserId} isReadOnly={!isOwnProfile} />

        {/* Profile Completion Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Strength</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Profile Completeness</span>
                <span className="font-semibold">75%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Add more experience, skills, and portfolio items to reach 100%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Avatar Dialog - Only for own profile */}
      {isOwnProfile && user && (
        <>
          <ChangeAvatarDialog
            open={avatarDialogOpen}
            onClose={() => setAvatarDialogOpen(false)}
            currentAvatarUrl={profile?.avatar_url}
            userId={user.id}
            onSuccess={loadProfile}
          />
          <ShareProfileDialog
            open={shareDialogOpen}
            onClose={() => setShareDialogOpen(false)}
            userId={user.id}
          />
          <EditProfileSlugDialog
            open={slugDialogOpen}
            onClose={() => setSlugDialogOpen(false)}
            currentSlug={profile?.profile_slug || ''}
            userId={user.id}
            onSuccess={(newSlug) => {
              setProfile({ ...profile, profile_slug: newSlug });
              navigate(`/profile/${newSlug}`);
            }}
          />
        </>
      )}
    </AppLayout>
  );
}