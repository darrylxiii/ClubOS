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
  Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CreateConversationDialog } from "@/components/messages/CreateConversationDialog";

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
        {/* Back Navigation */}
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {location.state?.from === 'messages' ? 'Back to Conversation' : 
             location.state?.from === 'feed' ? 'Back to Feed' : 'Back'}
          </Button>
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
                      <h1 className="text-4xl font-black uppercase">{profile.full_name}</h1>
                      {profile.email_verified && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    {profile.current_title && (
                      <p className="text-lg text-muted-foreground flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        {profile.current_title}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {profile.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {profile.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Member since {new Date(profile.created_at).getFullYear()}
                    </div>
                  </div>

                  {!isOwnProfile && user && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => setMessageDialogOpen(true)}
                        className="gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Send Message
                      </Button>
                      {profile.linkedin_url && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(profile.linkedin_url!, '_blank')}
                          className="gap-2"
                        >
                          <Linkedin className="w-4 h-4" />
                          LinkedIn
                        </Button>
                      )}
                    </div>
                  )}

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

          {/* Career Preferences */}
          {profile.career_preferences && (
            <Card className="border-2 border-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Career Interests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {profile.career_preferences}
                </p>
              </CardContent>
            </Card>
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
    </AppLayout>
  );
}
