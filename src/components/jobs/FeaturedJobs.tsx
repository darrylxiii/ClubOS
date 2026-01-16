import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { JobCard } from "./JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const FeaturedJobs = () => {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['featured-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, companies(name, logo_url)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Featured Opportunities</h2>
        <Button variant="ghost" asChild>
          <Link to="/jobs">
            View All <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs?.slice(0, 3).map((job) => (
            <JobCard key={job.id} job={{
              id: job.id,
              title: job.title,
              created_at: job.created_at || new Date().toISOString(),
              description: job.description ?? undefined,
              location: job.location ?? undefined,
              employment_type: job.employment_type ?? undefined,
              is_stealth: job.is_stealth ?? undefined,
              companies: job.companies ? {
                name: job.companies.name,
                logo_url: job.companies.logo_url ?? undefined
              } : undefined
            }} />
          ))}
        </div>
      )}
    </div>
  );
};
