import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileView {
  id: string;
  viewer_company_id: string | null;
  is_anonymous: boolean;
  viewed_at: string;
  companies: {
    name: string;
    logo_url: string | null;
  } | null;
}

export const ProfileViewers = () => {
  const [views, setViews] = useState<ProfileView[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchViews = async () => {
      const { data } = await supabase
        .from('profile_views')
        .select(`
          *,
          companies:viewer_company_id (
            name,
            logo_url
          )
        `)
        .eq('viewed_user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(20);

      if (data) setViews(data);
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
        (payload) => {
          fetchViews(); // Refresh to get company data
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

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Who's Viewing You
        </h3>
        <span className="text-sm text-muted-foreground">
          {views.length} views
        </span>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {views.map((view) => (
            <div
              key={view.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {view.is_anonymous ? (
                <div className="p-2 bg-muted rounded-lg">
                  <EyeOff className="w-8 h-8 text-muted-foreground" />
                </div>
              ) : view.companies ? (
                <Avatar>
                  <AvatarImage src={view.companies.logo_url || undefined} />
                  <AvatarFallback>{view.companies.name[0]}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="p-2 bg-muted rounded-lg">
                  <Eye className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {view.is_anonymous ? 'Anonymous Viewer' : view.companies?.name || 'Unknown Company'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(view.viewed_at)}
                </p>
              </div>
            </div>
          ))}
          
          {views.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No profile views yet</p>
              <p className="text-xs mt-1">Share your profile to get noticed!</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
