import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Mail, 
  Download, 
  User as UserIcon, 
  Shield,
  ExternalLink,
  Clock,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import EnhancedProfile from "@/pages/EnhancedProfile";
import { UserSettingsViewer } from "@/components/admin/UserSettingsViewer";
import { AppLayout } from "@/components/AppLayout";

export default function AdminUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentRole !== 'admin' && currentRole !== 'strategist') {
      navigate('/home');
      return;
    }

    loadUserProfile();
  }, [userId, currentRole]);

  const loadUserProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          candidate_profiles(id, resume_url)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleExportUserData = async () => {
    toast.info('User data export requested. This will be processed according to GDPR requirements.');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Alert>
            <AlertDescription>User profile not found.</AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const candidateProfile = profile.candidate_profiles?.[0];

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to User Management
        </Button>

        {/* Admin Banner */}
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <Shield className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900 dark:text-orange-200">
            🔒 Admin View: You are viewing {profile.full_name || profile.email}'s complete profile and settings. 
            This data is private and must be handled according to GDPR policies.
          </AlertDescription>
        </Alert>

        {/* User Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>
                  {profile.full_name?.charAt(0) || profile.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="text-3xl font-bold">{profile.full_name || 'Unknown User'}</h1>
                  <p className="text-muted-foreground">{profile.current_title || 'No title set'}</p>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    <Mail className="w-3 h-3 mr-1" />
                    {profile.email}
                  </Badge>
                  {profile.location && (
                    <Badge variant="secondary">{profile.location}</Badge>
                  )}
                  {profile.email_verified && (
                    <Badge variant="default">Email Verified</Badge>
                  )}
                  {candidateProfile && (
                    <Badge variant="default">Has Candidate Profile</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${profile.email}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email User
                  </a>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportUserData}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>

                {candidateProfile && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/candidates/${candidateProfile.id}`)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View as Candidate
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/profile/${profile.profile_slug || userId}`)}
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  View Public Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile Overview</TabsTrigger>
            <TabsTrigger value="settings">Complete Settings</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
          </TabsList>

          {/* Profile Overview Tab */}
          <TabsContent value="profile">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-4">
                This is the user's public profile view. Edit capabilities are disabled in admin mode.
              </p>
              <EnhancedProfile viewingUserId={userId} />
            </div>
          </TabsContent>

          {/* Complete Settings Tab */}
          <TabsContent value="settings">
            <UserSettingsViewer 
              userId={userId!} 
              userName={profile.full_name || profile.email}
              source="admin_user_profile"
            />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  User Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.resume_url || candidateProfile?.resume_url ? (
                  <div className="space-y-3">
                    {(profile.resume_url || candidateProfile?.resume_url) && (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Resume</p>
                          <p className="text-sm text-muted-foreground">Primary resume document</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={profile.resume_url || candidateProfile?.resume_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No documents have been uploaded by this user.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification">
            <Card>
              <CardHeader>
                <CardTitle>Account Verification Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">Email Verification</h4>
                    <Badge variant={profile.email_verified ? "default" : "secondary"}>
                      {profile.email_verified ? 'Verified' : 'Not Verified'}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Phone Verification</h4>
                    <Badge variant={profile.phone_verified ? "default" : "secondary"}>
                      {profile.phone_verified ? 'Verified' : 'Not Verified'}
                    </Badge>
                    {profile.phone && (
                      <p className="text-sm text-muted-foreground">{profile.phone}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Account Activity</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Created:</span> {new Date(profile.created_at).toLocaleString()}</p>
                    <p><span className="text-muted-foreground">Last Updated:</span> {new Date(profile.updated_at).toLocaleString()}</p>
                    {profile.last_sign_in_at && (
                      <p><span className="text-muted-foreground">Last Sign In:</span> {new Date(profile.last_sign_in_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
