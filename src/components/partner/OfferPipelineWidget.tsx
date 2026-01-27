import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface OfferPipelineWidgetProps {
  companyId: string;
}

interface PendingOffer {
  id: string;
  candidate_name: string;
  candidate_avatar?: string;
  job_title: string;
  offer_date: string;
  expiry_date?: string;
  status: string;
  salary_offered?: number;
}

export function OfferPipelineWidget({ companyId }: OfferPipelineWidgetProps) {
  const { data: offers, isLoading } = useQuery({
    queryKey: ['pending-offers', companyId],
    queryFn: async () => {
      // Get applications in offer stage - using 'as any' to avoid TypeScript depth error
      const { data, error } = await (supabase as any)
        .from('applications')
        .select(`
          id,
          stage,
          created_at,
          updated_at,
          candidate:candidate_profiles!applications_candidate_id_fkey(
            id,
            full_name,
            avatar_url
          ),
          job:jobs!applications_job_id_fkey(
            id,
            title,
            company_id
          )
        `)
        .eq('stage', 'offer')
        .not('job', 'is', null);

      if (error) throw error;

      // Filter for this company's jobs
      const companyOffers = (data || []).filter((app: any) => 
        app.job?.company_id === companyId
      );

      return companyOffers.map((app: any) => ({
        id: app.id,
        candidate_name: app.candidate?.full_name || 'Unknown Candidate',
        candidate_avatar: app.candidate?.avatar_url,
        job_title: app.job?.title || 'Unknown Position',
        offer_date: app.updated_at || app.created_at,
        status: 'pending',
        // Calculate days since offer
        days_pending: Math.floor((Date.now() - new Date(app.updated_at || app.created_at).getTime()) / (1000 * 60 * 60 * 24))
      })) as PendingOffer[];
    },
    enabled: !!companyId
  });

  const urgentOffers = (offers || []).filter((o: any) => o.days_pending >= 5);

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="border-2 border-primary/20 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-semibold">Pending Offers</span>
            </span>
            {urgentOffers.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {urgentOffers.length} Urgent
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {(!offers || offers.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No pending offers</p>
              <p className="text-sm">Offers extended to candidates will appear here</p>
            </div>
          )}

          {offers && offers.slice(0, 5).map((offer: any, index: number) => {
            const isUrgent = offer.days_pending >= 5;
            const initials = offer.candidate_name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                  isUrgent 
                    ? 'border-destructive/40 bg-destructive/5' 
                    : 'border-border/40'
                }`}
              >
                <Avatar className="h-10 w-10 border border-border/50">
                  <AvatarImage src={offer.candidate_avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{offer.candidate_name}</p>
                    {isUrgent && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0">
                        Urgent
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {offer.job_title}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  <span>{offer.days_pending}d</span>
                </div>
              </motion.div>
            );
          })}

          {offers && offers.length > 5 && (
            <Button variant="ghost" className="w-full" asChild>
              <Link to="/company-applications?stage=offer">
                View all {offers.length} offers
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}