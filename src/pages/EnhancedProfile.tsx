import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Briefcase, GraduationCap, Award, Folder, Settings, Download, Share2, Eye, Music2 } from "lucide-react";
import { ExperienceSection } from "@/components/profile/ExperienceSection";
import { EducationSection } from "@/components/profile/EducationSection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { PortfolioSection } from "@/components/profile/PortfolioSection";
import { LinkedInImport } from "@/components/profile/LinkedInImport";
import { MusicSection } from "@/components/profile/MusicSection";
import { ProfileHeaderUpload } from "@/components/profile/ProfileHeaderUpload";
import { SocialActivityFeed } from "@/components/profile/SocialActivityFeed";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function EnhancedProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }
    setProfile(data);
    setLoading(false);
  };

  const handleExportData = async () => {
    if (!user) return;
    
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

            {/* Upload button in bottom right */}
            <div className="absolute bottom-4 right-4">
              <ProfileHeaderUpload 
                currentMediaUrl={profile?.header_media_url}
                currentMediaType={profile?.header_media_type}
                onUploadComplete={loadProfile}
              />
            </div>
          </div>

          {/* Avatar positioned to overlap header and content */}
          <Avatar className="absolute top-64 left-6 transform -translate-y-1/2 w-32 h-32 border-4 border-background z-10">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback>
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>

          <CardContent className="pt-20">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold">{profile?.full_name || 'Your Name'}</h1>
                  <p className="text-muted-foreground">{profile?.current_title || 'Your Title'}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
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

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Import data and manage your profile</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <LinkedInImport />
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

        {/* Main Tabs */}
        <Tabs defaultValue="experience" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
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
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="experience" className="space-y-6">
            <ExperienceSection />
          </TabsContent>

          <TabsContent value="education" className="space-y-6">
            <EducationSection />
          </TabsContent>

          <TabsContent value="skills" className="space-y-6">
            <SkillsSection />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            <PortfolioSection />
          </TabsContent>

          <TabsContent value="music" className="space-y-6">
            <MusicSection
              spotifyConnected={(profile as any)?.spotify_connected}
              appleMusicConnected={(profile as any)?.apple_music_connected}
              spotifyPlaylists={(profile as any)?.spotify_playlists || []}
              appleMusicPlaylists={(profile as any)?.apple_music_playlists || []}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your profile visibility and privacy</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/settings#account">
                      <Settings className="w-4 h-4 mr-2" />
                      Go to Full Settings
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    Download My Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Social Activity Feed */}
        <SocialActivityFeed />

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
    </AppLayout>
  );
}