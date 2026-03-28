import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileText, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import { motion } from '@/lib/motion';
import { differenceInDays, parseISO } from 'date-fns';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface Offer {
  id: string;
  candidate_name: string;
  candidate_avatar?: string;
  job_title: string;
  offer_date: string;
  expiry_date?: string;
  status: string;
  salary_offered?: number;
  currency?: string;
}

export default function PartnerOffersDashboard() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();

  const { data: offers, isLoading, isError } = useQuery({
    queryKey: ['partner-offers-dashboard', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await (supabase as any)
        .from('applications')
        .select(`
          id,
          stage,
          status,
          created_at,
          updated_at,
          candidate_id,
          profiles!applications_candidate_id_fkey (full_name, avatar_url),
          jobs!inner (title, company_id, salary_min, salary_max, salary_currency)
        `)
        .eq('jobs.company_id', companyId)
        .in('stage', ['offer', 'offer_sent', 'offer_accepted', 'offer_declined', 'negotiation']);

      if (error) return []; // Graceful fallback for missing FK or table

      return (data || []).map((app: any) => ({
        id: app.id,
        candidate_name: app.profiles?.full_name || t('offersDashboard.unknownCandidate', 'Unknown Candidate'),
        candidate_avatar: app.profiles?.avatar_url,
        job_title: app.jobs?.title || t('offersDashboard.unknownRole', 'Unknown Role'),
        offer_date: app.updated_at || app.created_at,
        status: app.stage,
        salary_offered: app.jobs?.salary_max,
        currency: app.jobs?.salary_currency || 'USD',
      })) as Offer[];
    },
    enabled: !!companyId,
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'offer':
      case 'offer_sent':
        return { label: t('offersDashboard.pending', 'Pending'), color: 'bg-amber-500/10 text-amber-500 border-amber-500/30', icon: Clock };
      case 'offer_accepted':
        return { label: t('offersDashboard.accepted', 'Accepted'), color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', icon: CheckCircle2 };
      case 'offer_declined':
        return { label: t('offersDashboard.declined', 'Declined'), color: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle };
      case 'negotiation':
        return { label: t('offersDashboard.negotiating', 'Negotiating'), color: 'bg-primary/10 text-primary border-primary/30', icon: Send };
      default:
        return { label: status, color: 'bg-muted text-muted-foreground', icon: FileText };
    }
  };

  const pendingCount = offers?.filter(o => ['offer', 'offer_sent', 'negotiation'].includes(o.status)).length ?? 0;
  const acceptedCount = offers?.filter(o => o.status === 'offer_accepted').length ?? 0;
  const declinedCount = offers?.filter(o => o.status === 'offer_declined').length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-amber-500">{pendingCount}</div>
            <p className="text-sm text-muted-foreground mt-1">{t('offersDashboard.pendingOffers', 'Pending Offers')}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-emerald-500">{acceptedCount}</div>
            <p className="text-sm text-muted-foreground mt-1">{t('offersDashboard.acceptedOffers', 'Accepted')}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-destructive">{declinedCount}</div>
            <p className="text-sm text-muted-foreground mt-1">{t('offersDashboard.declinedOffers', 'Declined')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Offers list */}
      {isError ? (
        <EmptyState
          title={t('offersDashboard.errorTitle', 'Unable to load offers')}
          description={t('offersDashboard.errorDesc', 'There was an issue loading your offers. Please try again later.')}
          icon={FileText}
          iconColor="text-destructive"
        />
      ) : (!offers || offers.length === 0) ? (
        <EmptyState
          title={t('offersDashboard.noOffers', 'No offers yet')}
          description={t('offersDashboard.noOffersDesc', 'When candidates reach the offer stage, they will appear here.')}
          icon={FileText}
        />
      ) : (
        <div className="space-y-3">
          {offers.map((offer, index) => {
            const config = getStatusConfig(offer.status);
            const StatusIcon = config.icon;
            const daysSince = differenceInDays(new Date(), parseISO(offer.offer_date));

            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass-card hover:border-primary/30 transition-all duration-200">
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={offer.candidate_avatar} alt={offer.candidate_name} />
                      <AvatarFallback>{offer.candidate_name.charAt(0)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{offer.candidate_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{offer.job_title}</p>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {daysSince === 0
                        ? t('offersDashboard.today', 'Today')
                        : t('offersDashboard.daysAgo', '{{count}}d ago', { count: daysSince })}
                    </div>

                    {offer.salary_offered && (
                      <div className="hidden md:block text-sm font-medium tabular-nums">
                        {new Intl.NumberFormat('en', { style: 'currency', currency: offer.currency || 'USD', maximumFractionDigits: 0 }).format(offer.salary_offered)}
                      </div>
                    )}

                    <Badge variant="outline" className={`shrink-0 ${config.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
