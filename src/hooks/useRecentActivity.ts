import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { UserPlus, Building2, Briefcase, FileText } from "lucide-react";

export interface ActivityItem {
  id: string;
  type: 'user_signup' | 'company_signup' | 'job_posted' | 'application';
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
  icon: any;
  iconBgColor: string;
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Fetch all activities in parallel
      const [
        { data: users },
        { data: companies },
        { data: jobs },
        { data: applications }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, created_at')
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('companies')
          .select('id, name, created_at')
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('jobs')
          .select('id, title, company:companies(name), created_at')
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('applications')
          .select('id, candidate:profiles(full_name), job:jobs(title), created_at')
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false })
          .limit(8)
      ]);

      const activities: ActivityItem[] = [];

      // Process user signups
      users?.forEach(user => {
        if (!user.created_at) return;
        activities.push({
          id: `user-${user.id}`,
          type: 'user_signup',
          title: 'New user joined',
          description: user.full_name || 'Unknown user',
          timestamp: user.created_at,
          timeAgo: formatDistanceToNow(new Date(user.created_at), { addSuffix: true }),
          icon: UserPlus,
          iconBgColor: 'bg-green-500/10 text-green-500'
        });
      });

      // Process company signups
      companies?.forEach(company => {
        activities.push({
          id: `company-${company.id}`,
          type: 'company_signup',
          title: 'New company registered',
          description: company.name,
          timestamp: company.created_at,
          timeAgo: formatDistanceToNow(new Date(company.created_at), { addSuffix: true }),
          icon: Building2,
          iconBgColor: 'bg-blue-500/10 text-blue-500'
        });
      });

      // Process job postings
      jobs?.forEach(job => {
        if (!job.created_at) return;
        activities.push({
          id: `job-${job.id}`,
          type: 'job_posted',
          title: 'New job posted',
          description: `${job.title} at ${(job.company as any)?.name || 'Unknown company'}`,
          timestamp: job.created_at,
          timeAgo: formatDistanceToNow(new Date(job.created_at), { addSuffix: true }),
          icon: Briefcase,
          iconBgColor: 'bg-purple-500/10 text-purple-500'
        });
      });

      // Process applications
      applications?.forEach(app => {
        activities.push({
          id: `app-${app.id}`,
          type: 'application',
          title: 'New application submitted',
          description: `${(app.candidate as any)?.full_name || 'Unknown'} applied to ${(app.job as any)?.title || 'a position'}`,
          timestamp: app.created_at,
          timeAgo: formatDistanceToNow(new Date(app.created_at), { addSuffix: true }),
          icon: FileText,
          iconBgColor: 'bg-indigo-500/10 text-indigo-500'
        });
      });


      // Sort all activities by timestamp and take top 15
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 15);
    },
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 30000
  });
}
