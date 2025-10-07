import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, MessageCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface UserProfilePreviewProps {
  userId: string;
  onMessageClick?: () => void;
}

export function UserProfilePreview({ userId, onMessageClick }: UserProfilePreviewProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [achievements, setAchievements] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreviewData();
  }, [userId]);

  const loadPreviewData = async () => {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, current_title, location, email_verified")
        .eq("id", userId)
        .single();

      // Load achievement count
      const { count } = await supabase
        .from("user_achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      setProfile(profileData);
      setAchievements(count || 0);
    } catch (error) {
      console.error("Error loading preview data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = () => {
    navigate(`/profile/${userId}`, { state: { from: 'feed' } });
  };

  if (loading) {
    return (
      <Card className="w-80 glass backdrop-blur-xl border-accent/30 shadow-glass-xl">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) return null;

  return (
    <Card className="w-80 glass backdrop-blur-xl border-accent/30 shadow-glass-xl animate-scale-in">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className="w-16 h-16 border-2 border-accent ring-4 ring-accent/20">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-lg font-black bg-gradient-accent text-white">
              {profile.full_name?.substring(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-black text-lg truncate">{profile.full_name}</h3>
              {profile.email_verified && (
                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
              )}
            </div>
            {profile.current_title && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                <Briefcase className="w-3 h-3 flex-shrink-0" />
                {profile.current_title}
              </p>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm text-muted-foreground">
          {profile.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{profile.location}</span>
            </div>
          )}
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-xs">
              {achievements} Achievement{achievements !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleViewProfile}
            variant="default"
            size="sm"
            className="flex-1"
          >
            View Profile
          </Button>
          {onMessageClick && (
            <Button
              onClick={onMessageClick}
              variant="outline"
              size="sm"
              className="gap-1"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
