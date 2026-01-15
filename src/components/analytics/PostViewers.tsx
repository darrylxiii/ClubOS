import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Clock, MapPin, Monitor, Smartphone, Tablet, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface PostViewersProps {
  postId: string;
}

interface Viewer {
  user_id: string;
  viewed_at: string;
  last_viewed_at: string;
  view_count: number;
  view_duration_seconds: number;
  device_type: string;
  country: string;
  city: string;
  liked: boolean;
  commented: boolean;
  shared: boolean;
  saved: boolean;
  profiles?: {
    full_name: string;
    avatar_url: string;
    current_title: string;
  };
}

export const PostViewers = ({ postId }: PostViewersProps) => {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "engaged" | "repeat">("all");

  useEffect(() => {
    fetchViewers();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`post-viewers-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_engagement_signals',
          filter: `post_id=eq.${postId}`
        },
        () => fetchViewers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const fetchViewers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('post_engagement_signals')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            current_title
          )
        `)
        .eq('post_id', postId)
        .not('viewed_at', 'is', null)
        .order('last_viewed_at', { ascending: false });

      if (error) throw error;
      setViewers(data || []);
    } catch (error) {
      console.error('Error fetching viewers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredViewers = viewers.filter(viewer => {
    // Search filter
    const matchesSearch = viewer.profiles?.full_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    
    if (searchQuery && !matchesSearch) return false;

    // Type filter
    if (filter === "engaged") {
      return viewer.liked || viewer.commented || viewer.shared || viewer.saved;
    }
    if (filter === "repeat") {
      return viewer.view_count > 1;
    }
    return true;
  });

  const totalViews = viewers.reduce((sum, v) => sum + v.view_count, 0);
  const uniqueViewers = viewers.length;
  const avgViewDuration = viewers.reduce((sum, v) => sum + v.view_duration_seconds, 0) / uniqueViewers || 0;
  const engagedViewers = viewers.filter(v => v.liked || v.commented || v.shared || v.saved).length;

  if (loading) {
    return <div className="text-center py-8">Loading viewers...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalViews}</p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{uniqueViewers}</p>
                <p className="text-xs text-muted-foreground">Unique Viewers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{Math.round(avgViewDuration)}s</p>
                <p className="text-xs text-muted-foreground">Avg. Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{engagedViewers}</p>
                <p className="text-xs text-muted-foreground">Engaged</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search viewers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="engaged">Engaged</TabsTrigger>
            <TabsTrigger value="repeat">Repeat</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Viewer List */}
      <Card>
        <CardHeader>
          <CardTitle>Viewers ({filteredViewers.length})</CardTitle>
          <CardDescription>People who viewed this post</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredViewers.map((viewer) => (
                <div
                  key={viewer.user_id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={viewer.profiles?.avatar_url} />
                    <AvatarFallback>
                      {viewer.profiles?.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">
                        {viewer.profiles?.full_name || "Anonymous"}
                      </p>
                      {viewer.view_count > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          {viewer.view_count}x
                        </Badge>
                      )}
                    </div>

                    {viewer.profiles?.current_title && (
                      <p className="text-sm text-muted-foreground truncate">
                        {viewer.profiles.current_title}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(viewer.last_viewed_at), {
                          addSuffix: true,
                        })}
                      </div>

                      {viewer.view_duration_seconds > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {viewer.view_duration_seconds}s
                        </div>
                      )}

                      {viewer.device_type && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {viewer.device_type === 'mobile' && <Smartphone className="h-3 w-3" />}
                          {viewer.device_type === 'tablet' && <Tablet className="h-3 w-3" />}
                          {viewer.device_type === 'desktop' && <Monitor className="h-3 w-3" />}
                          {viewer.device_type}
                        </div>
                      )}

                      {viewer.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {viewer.city}, {viewer.country}
                        </div>
                      )}
                    </div>

                    {/* Engagement Badges */}
                    <div className="flex gap-1 mt-2">
                      {viewer.liked && (
                        <Badge variant="outline" className="text-xs">
                          ❤️ Liked
                        </Badge>
                      )}
                      {viewer.commented && (
                        <Badge variant="outline" className="text-xs">
                          💬 Commented
                        </Badge>
                      )}
                      {viewer.shared && (
                        <Badge variant="outline" className="text-xs">
                          🔗 Shared
                        </Badge>
                      )}
                      {viewer.saved && (
                        <Badge variant="outline" className="text-xs">
                          🔖 Saved
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredViewers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No viewers found
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};