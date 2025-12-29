import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Info, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TopClient {
  id: string;
  name: string;
  logo_url: string | null;
  job_count: number;
}

export const TopClientsWidget = () => {
  const { data: topClients, isLoading } = useQuery({
    queryKey: ['top-clients-by-jobs'],
    queryFn: async (): Promise<TopClient[]> => {
      // Get companies with job counts
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('company_id, companies!inner(id, name, logo_url)')
        .eq('status', 'published');
      
      if (error) {
        console.error('Error fetching top clients:', error);
        return [];
      }
      
      // Count jobs per company
      const companyCounts: Record<string, { company: any; count: number }> = {};
      (jobs || []).forEach(job => {
        const company = job.companies as any;
        if (company?.id) {
          if (!companyCounts[company.id]) {
            companyCounts[company.id] = { company, count: 0 };
          }
          companyCounts[company.id].count++;
        }
      });
      
      // Sort by count and take top 5
      return Object.values(companyCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(({ company, count }) => ({
          id: company.id,
          name: company.name,
          logo_url: company.logo_url,
          job_count: count,
        }));
    },
    staleTime: 60000, // 1 minute
  });

  if (isLoading) {
    return (
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="flex-1">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = topClients && topClients.length > 0;

  if (!hasData) {
    return (
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Top Clients
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Info className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No active clients yet</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin?tab=companies">
                Manage Companies
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Top Clients
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/admin?tab=companies">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-2">
          {topClients.map((client, index) => (
            <div key={client.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={client.logo_url || undefined} alt={client.name} />
                <AvatarFallback className="text-xs">
                  {client.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{client.name}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                <span>{client.job_count}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
};
