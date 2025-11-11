import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileView {
  id: string;
  viewer_company_id: string | null;
  viewer_user_id: string | null;
  is_anonymous: boolean;
  viewed_at: string;
  viewer?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    current_title: string | null;
    company_id: string | null;
  } | null;
  company?: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
}

export const ProfileViewers = () => {
  const [views, setViews] = useState<ProfileView[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchViews = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profile_views')
        .select(`
          *,
          viewer:profiles!viewer_user_id(
            id,
            full_name,
            avatar_url,
            current_title,
            company_id
          ),
          company:companies!viewer_company_id(
            id,
            name,
            logo_url
          )
        `)
        .eq('viewed_user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(20);

      if (data) setViews(data as any);
      setLoading(false);
    };

    fetchViews();

    // Subscribe to new views
    const channel = supabase
      .channel('profile_views_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_views',
          filter: `viewed_user_id=eq.${user.id}`
        },
        () => {
          fetchViews(); // Refresh to get company and viewer data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / 3600000);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <Card className="p-4 border-border/50 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/2"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-border/50 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Who's Viewing You
        </h3>
        <Badge variant="secondary">
          {views.length} {views.length === 1 ? 'view' : 'views'}
        </Badge>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {views.map((view) => (
            <div
              key={view.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/30"
            >
              {view.is_anonymous ? (
                <div className="p-2 bg-muted rounded-lg">
                  <EyeOff className="w-8 h-8 text-muted-foreground" />
                </div>
              ) : view.viewer ? (
                <Avatar className="ring-2 ring-border/50">
                  <AvatarImage src={view.viewer.avatar_url || undefined} />
                  <AvatarFallback>
                    {view.viewer.full_name?.[0] || view.company?.name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              ) : view.company ? (
                <Avatar className="ring-2 ring-border/50">
                  <AvatarImage src={view.company.logo_url || undefined} />
                  <AvatarFallback>{view.company.name[0]}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="p-2 bg-muted rounded-lg">
                  <Eye className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {view.is_anonymous 
                    ? 'Anonymous Viewer' 
                    : view.viewer?.full_name || view.company?.name || 'Unknown Viewer'
                  }
                </p>
                {view.viewer?.current_title && (
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {view.viewer.current_title}
                  </p>
                )}
                {view.company && !view.is_anonymous && (
                  <p className="text-xs text-muted-foreground truncate">
                    {view.company.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(view.viewed_at)}
                </p>
              </div>
            </div>
          ))}
          
          {views.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No profile views yet</p>
              <p className="text-xs mt-2">
                Companies are checking out profiles daily.
                <br />
                Keep your profile updated to get noticed!
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
