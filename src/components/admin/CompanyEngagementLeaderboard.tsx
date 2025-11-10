import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Users, Activity } from "lucide-react";
import { toast } from "sonner";

interface CompanyEngagement {
  company_id: string;
  company_name: string;
  total_users: number;
  online_users: number;
  active_users_24h: number;
  total_actions: number;
  average_activity_score: number;
  engagement_rate: number;
}

export function CompanyEngagementLeaderboard() {
  const [companies, setCompanies] = useState<CompanyEngagement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngagementData();

    // Set up realtime subscription
    const channel = supabase
      .channel('company-engagement')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_activity_tracking',
        },
        () => {
          fetchEngagementData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate online status dynamically
  const calculateStatus = (lastActivity: string | null): 'online' | 'away' | 'offline' => {
    if (!lastActivity) return 'offline';
    
    const lastActivityTime = new Date(lastActivity).getTime();
    const now = Date.now();
    const minutesAgo = (now - lastActivityTime) / (1000 * 60);
    
    if (minutesAgo < 2) return 'online';
    if (minutesAgo < 30) return 'away';
    return 'offline';
  };

  const fetchEngagementData = async () => {
    try {
      // Fetch all activity data with user profiles
      const { data: activityData, error: activityError } = await supabase
        .from('user_activity_tracking')
        .select('user_id, online_status, total_actions, activity_score, last_activity_at');

      if (activityError) throw activityError;

      // Fetch user profiles with company info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, company_id');

      if (profilesError) throw profilesError;

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name');

      if (companiesError) throw companiesError;

      // Calculate engagement per company
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const companyEngagement: Map<string, CompanyEngagement> = new Map();

      profiles?.forEach((profile) => {
        if (!profile.company_id) return;

        const company = companiesData?.find(c => c.id === profile.company_id);
        if (!company) return;

        const activity = activityData?.find(a => a.user_id === profile.id);

        if (!companyEngagement.has(profile.company_id)) {
          companyEngagement.set(profile.company_id, {
            company_id: profile.company_id,
            company_name: company.name,
            total_users: 0,
            online_users: 0,
            active_users_24h: 0,
            total_actions: 0,
            average_activity_score: 0,
            engagement_rate: 0,
          });
        }

        const data = companyEngagement.get(profile.company_id)!;
        data.total_users++;

        if (activity) {
          const dynamicStatus = calculateStatus(activity.last_activity_at);
          if (dynamicStatus === 'online') {
            data.online_users++;
          }
          if (new Date(activity.last_activity_at) > oneDayAgo) {
            data.active_users_24h++;
          }
          data.total_actions += activity.total_actions || 0;
          data.average_activity_score += activity.activity_score || 0;
        }
      });

      // Calculate averages and engagement rates
      const engagementArray = Array.from(companyEngagement.values()).map(company => ({
        ...company,
        average_activity_score: company.total_users > 0 
          ? Math.round(company.average_activity_score / company.total_users)
          : 0,
        engagement_rate: company.total_users > 0
          ? Math.round((company.active_users_24h / company.total_users) * 100)
          : 0,
      }));

      // Sort by engagement rate
      engagementArray.sort((a, b) => b.engagement_rate - a.engagement_rate);

      setCompanies(engagementArray);
    } catch (error) {
      console.error('Error fetching engagement data:', error);
      toast.error("Failed to load engagement data");
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500 text-white">🥇 1st</Badge>;
    if (index === 1) return <Badge className="bg-gray-400 text-white">🥈 2nd</Badge>;
    if (index === 2) return <Badge className="bg-orange-600 text-white">🥉 3rd</Badge>;
    return <Badge variant="outline">{index + 1}</Badge>;
  };

  const getEngagementColor = (rate: number) => {
    if (rate >= 80) return 'text-emerald-600 font-semibold';
    if (rate >= 60) return 'text-green-600';
    if (rate >= 40) return 'text-yellow-600';
    if (rate >= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading engagement data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <div>
            <CardTitle>Company Engagement Leaderboard</CardTitle>
            <CardDescription>Real-time company activity rankings</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Rank</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Users className="w-3 h-3" />
                    Total
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Activity className="w-3 h-3 text-green-500" />
                    Online
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Active 24h
                  </div>
                </TableHead>
                <TableHead className="text-right">Total Actions</TableHead>
                <TableHead className="text-right">Engagement %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No company data available
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company, index) => (
                  <TableRow key={company.company_id}>
                    <TableCell>{getRankBadge(index)}</TableCell>
                    <TableCell className="font-medium">{company.company_name}</TableCell>
                    <TableCell className="text-right">{company.total_users}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        {company.online_users}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{company.active_users_24h}</TableCell>
                    <TableCell className="text-right">{company.total_actions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className={getEngagementColor(company.engagement_rate)}>
                        {company.engagement_rate}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
