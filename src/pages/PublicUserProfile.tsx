import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  MapPin, 
  Briefcase,
  Calendar,
  Linkedin, 
  Mail,
  MessageCircle,
  ArrowLeft,
  Trophy,
  Target,
  TrendingUp,
  Users,
  CheckCircle2,
  Shield,
  Edit2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CreateConversationDialog } from "@/components/messages/CreateConversationDialog";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { ProfileActionDialogs } from "@/components/profile/ProfileActionDialogs";
import { InlineEdit } from "@/components/profile/InlineEdit";
import { ProfileAuditTrail } from "@/components/profile/ProfileAuditTrail";
import { ProfilePreview } from "@/components/profile/ProfilePreview";

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  current_title: string | null;
  location: string | null;
  linkedin_url: string | null;
  career_preferences: string | null;
  created_at: string;
  email_verified: boolean;
  phone_verified: boolean;
}

export default function PublicUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [dialogs, setDialogs] = useState({
    resume: false,
    meeting: false,
    verification: false,
    export: false,
    endorse: false,
    invite: false,
    report: false,
  });
  const [meetingType, setMeetingType] = useState<string>();
  const [exportType, setExportType] = useState<string>();
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  // Track profile visit
  useEffect(() => {
    if (userId && user?.id && userId !== user.id) {
      trackProfileVisit();
    }
  }, [userId, user]);

  const trackProfileVisit = async () => {
    try {
      await supabase.from('activity_feed').insert({
        user_id: user?.id,
        event_type: 'profile_visit',
        event_data: {
          visited_profile_id: userId,
          source: location.state?.from || 'direct'
        },
        visibility: 'private'
      });
    } catch (error) {
      console.error('Error tracking profile visit:', error);
    }
  };

  useEffect(() => {
    loadProfile();
    loadAchievements();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const loadAchievements = async () => {
    if (!userId) return;

    try {
      const { data } = await supabase
        .from("user_achievements")
        .select(`
          *,
          achievements(*)
        `)
        .eq("user_id", userId)
        .order("unlocked_at", { ascending: false })
        .limit(6);

      if (data) {
        setAchievements(data);
      }
    } catch (error) {
      console.error("Error loading achievements:", error);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1 && location.state?.from) {
      navigate(-1);
    } else {
      navigate('/feed');
    }
  };

  const handleDialogClose = (dialog: keyof typeof dialogs) => {
    setDialogs(prev => ({ ...prev, [dialog]: false }));
  };

  const handleDialogSubmit = (dialog: keyof typeof dialogs, data?: any) => {
    // Handle submission based on dialog type
    console.log(`${dialog} submitted:`, data);
    
    switch(dialog) {
      case 'resume':
        toast.success("Resume request sent!");
        break;
      case 'meeting':
        toast.success("Meeting request sent!");
        break;
      case 'verification':
        toast.success("Verification request sent!");
        break;
      case 'export':
        toast.success("Export started!");
        break;
      case 'endorse':
        toast.success("Endorsement submitted!");
        break;
      case 'invite':
        toast.success("Invitation sent!");
        break;
      case 'report':
        toast.success("Report submitted. Our team will review it.");
        break;
    }
    
    handleDialogClose(dialog);
  };

  const handleProfileUpdate = async (field: string, value: string, visibility?: string) => {
    try {
      const updates: any = { [field]: value };
      
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;

      // Log edit to history
      const newEdit = {
        id: Date.now().toString(),
        timestamp: new Date(),
        user: user?.email || "You",
        field,
        oldValue: (profile as any)?.[field] || "",
        newValue: value,
        visibility,
      };
      
      setEditHistory(prev => [newEdit, ...prev]);

      // Update local profile state directly instead of reloading
      setProfile(prev => prev ? { ...prev, [field]: value } : null);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const handleRestoreEdit = async (editId: string) => {
    const edit = editHistory.find(e => e.id === editId);
    if (!edit) return;

    try {
      await handleProfileUpdate(edit.field, edit.oldValue);
      toast.success("Restored previous version");
    } catch (error) {
      toast.error("Failed to restore");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading profile...</p>
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This member profile is not available.
              </p>
              <Button onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const isOwnProfile = user?.id === userId;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-subtle">
        {/* Back Navigation & Edit Mode Toggle */}
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              {location.state?.from === 'messages' ? 'Back to Conversation' : 
               location.state?.from === 'feed' ? 'Back to Feed' : 'Back'}
            </Button>

            {isOwnProfile && (
              <div className="flex items-center gap-2">
                <ProfilePreview profile={profile!} achievements={achievements} />
                <Button
                  variant={isEditMode ? "default" : "outline"}
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  {isEditMode ? "Done Editing" : "Edit Profile"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* Profile Header */}
          <Card className="border-2 border-foreground glass backdrop-blur-lg">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <Avatar className="w-32 h-32 border-4 border-accent shadow-glass-lg ring-4 ring-accent/20">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                  <AvatarFallback className="text-4xl font-black bg-gradient-accent text-white">
                    {profile.full_name?.substring(0, 2).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {isOwnProfile && isEditMode ? (
                        <InlineEdit
                          value={profile.full_name}
                          onSave={(value) => handleProfileUpdate("full_name", value)}
                          placeholder="Your name"
                          className="text-4xl font-black uppercase"
                          label="Full Name"
                        />
                      ) : (
                        <h1 className="text-4xl font-black uppercase">{profile.full_name}</h1>
                      )}
                      {profile.email_verified && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    {isOwnProfile && isEditMode ? (
                      <InlineEdit
                        value={profile.current_title || ""}
                        onSave={(value) => handleProfileUpdate("current_title", value)}
                        placeholder="Your professional title"
                        className="text-lg text-muted-foreground"
                        label="Professional Title"
                        showPrivacy
                        currentVisibility="public"
                      />
                    ) : profile.current_title ? (
                      <p className="text-lg text-muted-foreground flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        {profile.current_title}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {isOwnProfile && isEditMode ? (
                      <InlineEdit
                        value={profile.location || ""}
                        onSave={(value) => handleProfileUpdate("location", value)}
                        placeholder="Your location"
                        label="Location"
                      />
                    ) : profile.location ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {profile.location}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Member since {new Date(profile.created_at).getFullYear()}
                    </div>
                  </div>

                  {isOwnProfile && (
                    <Button
                      variant="outline"
                      onClick={() => navigate('/settings#account')}
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {!isOwnProfile && user && (
            <Card className="border-2 border-foreground glass backdrop-blur-lg">
              <CardContent className="p-6">
                <ProfileActionButtons
                  userId={userId!}
                  isOwnProfile={isOwnProfile}
                  onMessage={() => setMessageDialogOpen(true)}
                  onRequestResume={() => setDialogs(prev => ({ ...prev, resume: true }))}
                  onBookMeeting={(type) => {
                    setMeetingType(type);
                    setDialogs(prev => ({ ...prev, meeting: true }));
                  }}
                  onConnect={() => toast.success("Connection request sent!")}
                  onFollow={() => toast.success("Now following this member!")}
                  onRequestVerification={() => setDialogs(prev => ({ ...prev, verification: true }))}
                  onExport={(type) => {
                    setExportType(type);
                    setDialogs(prev => ({ ...prev, export: true }));
                  }}
                  onEndorse={() => setDialogs(prev => ({ ...prev, endorse: true }))}
                  onInviteToProject={() => setDialogs(prev => ({ ...prev, invite: true }))}
                  onReport={() => setDialogs(prev => ({ ...prev, report: true }))}
                />
              </CardContent>
            </Card>
          )}

          {/* Career Preferences */}
          {(profile.career_preferences || (isOwnProfile && isEditMode)) && (
            <Card className="border-2 border-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Career Interests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isOwnProfile && isEditMode ? (
                  <InlineEdit
                    value={profile.career_preferences || ""}
                    onSave={(value) => handleProfileUpdate("career_preferences", value)}
                    placeholder="Describe your career interests, goals, and what you're looking for..."
                    type="textarea"
                    label="Career Preferences"
                    showPrivacy
                    currentVisibility="public"
                    aiSuggestion="I'm passionate about building innovative products that solve real problems. Looking for opportunities in tech leadership where I can mentor teams and drive strategic growth."
                  />
                ) : (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {profile.career_preferences}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Edit History - Only for own profile */}
          {isOwnProfile && editHistory.length > 0 && (
            <ProfileAuditTrail
              edits={editHistory}
              onRestore={handleRestoreEdit}
            />
          )}

          {/* Achievements */}
          {achievements.length > 0 && (
            <Card className="border-2 border-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="p-4 glass rounded-lg border border-accent/30 text-center group hover:border-accent transition-all hover:shadow-glass-lg"
                    >
                      <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                        {achievement.achievements?.badge_emoji || "🏆"}
                      </div>
                      <p className="text-sm font-semibold">
                        {achievement.achievements?.badge_name}
                      </p>
                    </div>
                  ))}
                </div>
                {isOwnProfile && (
                  <Button
                    variant="link"
                    onClick={() => navigate('/achievements')}
                    className="mt-4"
                  >
                    View All Achievements →
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Club Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-2 border-foreground text-center">
              <CardContent className="pt-6">
                <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
                <p className="text-2xl font-black">{achievements.length}</p>
                <p className="text-sm text-muted-foreground">Achievements</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-foreground text-center">
              <CardContent className="pt-6">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-accent" />
                <p className="text-2xl font-black">Active</p>
                <p className="text-sm text-muted-foreground">Club Status</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-foreground text-center">
              <CardContent className="pt-6">
                <Shield className="w-8 h-8 mx-auto mb-2 text-accent" />
                <p className="text-2xl font-black">
                  {profile.email_verified && profile.phone_verified ? 'Full' : 'Partial'}
                </p>
                <p className="text-sm text-muted-foreground">Verification</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CreateConversationDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        preselectedUserId={userId}
        onConversationCreated={(conversationId) => {
          navigate('/messages', { state: { conversationId } });
        }}
      />

      <ProfileActionDialogs
        dialogs={dialogs}
        meetingType={meetingType}
        exportType={exportType}
        onClose={handleDialogClose}
        onSubmit={handleDialogSubmit}
      />
    </AppLayout>
  );
}
