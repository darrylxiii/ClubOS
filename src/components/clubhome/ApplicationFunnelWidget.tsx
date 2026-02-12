import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ArrowRight, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface StatusCounts {
  pending: number;
  under_review: number;
  approved: number;
  rejected: number;
  total: number;
}

export const ApplicationFunnelWidget = () => {
  const { data: counts, isLoading } = useQuery({
    queryKey: ['application-funnel-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('application_status');
      
      if (error) throw error;
      
      const statusCounts: StatusCounts = {
        pending: 0,
        under_review: 0,
        approved: 0,
        rejected: 0,
        total: data?.length || 0
      };
      
      data?.forEach(profile => {
        const status = profile.application_status?.toLowerCase() || 'pending';
        if (status === 'pending') statusCounts.pending++;
        else if (status === 'under_review' || status === 'reviewing') statusCounts.under_review++;
        else if (status === 'approved') statusCounts.approved++;
        else if (status === 'rejected') statusCounts.rejected++;
      });
      
      return statusCounts;
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });

  const stages = [
    { 
      key: 'pending', 
      label: 'Pending', 
      count: counts?.pending || 0, 
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    { 
      key: 'under_review', 
      label: 'Under Review', 
      count: counts?.under_review || 0, 
      icon: Eye,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      key: 'approved', 
      label: 'Approved', 
      count: counts?.approved || 0, 
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    { 
      key: 'rejected', 
      label: 'Rejected', 
      count: counts?.rejected || 0, 
      icon: XCircle,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10'
    },
  ];

  const conversionRate = counts && counts.total > 0 
    ? Math.round((counts.approved / counts.total) * 100) 
    : 0;

  if (isLoading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Application Funnel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Application Funnel
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {conversionRate}% conversion
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Funnel Stages */}
          <div className="space-y-2">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const widthPercent = counts && counts.total > 0 
                ? Math.max(20, (stage.count / counts.total) * 100)
                : 20;
              
              return (
                <div key={stage.key} className="relative">
                  <div 
                    className={`flex items-center justify-between p-2 rounded-lg ${stage.bgColor} transition-all`}
                    style={{ width: `${widthPercent}%`, minWidth: '100%' }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${stage.color}`} />
                      <span className="text-sm font-medium">{stage.label}</span>
                    </div>
                    <span className={`text-sm font-bold ${stage.color}`}>
                      {stage.count}
                    </span>
                  </div>
                  {index < stages.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50 rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Action */}
          {(counts?.pending || 0) > 0 && (
            <Button variant="glass" size="sm" className="w-full mt-2" asChild>
              <Link to="/admin?tab=applications">
                Review {counts?.pending} Pending
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
