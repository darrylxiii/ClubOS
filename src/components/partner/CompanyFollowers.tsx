import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users } from "lucide-react";

interface CompanyFollowersProps {
  companyId: string;
}

export const CompanyFollowers = ({ companyId }: CompanyFollowersProps) => {
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0 });

  useEffect(() => {
    fetchFollowers();
  }, [companyId]);

  const fetchFollowers = async () => {
    try {
      const { data, error } = await supabase
        .from('company_followers')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('company_id', companyId)
        .order('followed_at', { ascending: false });

      if (error) throw error;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const thisWeekFollowers = data?.filter(
        f => new Date(f.followed_at) > oneWeekAgo
      ).length || 0;

      setFollowers(data || []);
      setStats({
        total: data?.length || 0,
        thisWeek: thisWeekFollowers
      });
    } catch (error) {
      console.error('Error fetching followers:', error);
      toast.error("Failed to load followers");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-64 bg-muted rounded"></div>
    </div>;
  }

  return (
    <Card className="border-2 border-foreground">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black uppercase flex items-center gap-2">
              <Users className="w-6 h-6" />
              Followers
            </CardTitle>
            <CardDescription>
              {stats.total} total followers • {stats.thisWeek} new this week
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {followers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No followers yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {followers.slice(0, 10).map((follower) => (
              <div key={follower.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={follower.profiles?.avatar_url} />
                    <AvatarFallback>
                      {follower.profiles?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{follower.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{follower.profiles?.email}</p>
                  </div>
                </div>
                {follower.notification_enabled && (
                  <Badge variant="secondary">Notifications On</Badge>
                )}
              </div>
            ))}
            {followers.length > 10 && (
              <p className="text-center text-sm text-muted-foreground pt-2">
                And {followers.length - 10} more...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
