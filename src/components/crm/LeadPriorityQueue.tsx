import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { 
  Target, 
  Clock, 
  TrendingUp, 
  Phone, 
  Mail, 
  Calendar,
  Sparkles,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/lib/notify';
import { Link } from 'react-router-dom';

interface LeadPrediction {
  id: string;
  prospect_id: string;
  conversion_probability: number;
  confidence_interval: number;
  recommended_action: string;
  optimal_contact_time: string | null;
  feature_importance: Record<string, number>;
  created_at: string;
  prospect?: {
    id: string;
    full_name: string;
    company_name: string;
    email: string;
    stage: string;
  };
}

export function LeadPriorityQueue() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: predictions, isLoading } = useQuery({
    queryKey: ['lead-predictions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_lead_predictions')
        .select(`
          *,
          prospect:crm_prospects(id, full_name, company_name, email, stage)
        `)
        .order('conversion_probability', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as LeadPrediction[];
    }
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      setRefreshing(true);
      const { data, error } = await supabase.functions.invoke('calculate-lead-conversion-score', {
        body: { recalculateAll: true }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-predictions'] });
      notify.success('Scores Recalculated', { description: 'Lead conversion scores have been updated.' });
      setRefreshing(false);
    },
    onError: (error) => {
      notify.error('Failed to recalculate scores');
      setRefreshing(false);
    }
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/30';
    if (score >= 40) return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getActionIcon = (action: string) => {
    if (action?.includes('call')) return Phone;
    if (action?.includes('email')) return Mail;
    if (action?.includes('meeting')) return Calendar;
    return Target;
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Lead Priority Queue
            <Badge variant="secondary" className="ml-2">
              <Sparkles className="w-3 h-3 mr-1" />
              ML Powered
            </Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => recalculateMutation.mutate()}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Top 10 leads to contact today based on conversion probability
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : predictions && predictions.length > 0 ? (
          <div className="space-y-2">
            {predictions.map((prediction, index) => {
              const ActionIcon = getActionIcon(prediction.recommended_action);
              const prospect = prediction.prospect;
              
              return (
                <motion.div
                  key={prediction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/crm/prospects/${prediction.prospect_id}`}>
                    <div className={`flex items-center gap-4 p-3 rounded-lg border ${getScoreBg(prediction.conversion_probability)} hover:bg-muted/20 transition-colors cursor-pointer group`}>
                      {/* Rank */}
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {index + 1}
                      </div>

                      {/* Avatar */}
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {prospect?.full_name?.slice(0, 2).toUpperCase() || '??'}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{prospect?.full_name || 'Unknown'}</p>
                          <Badge variant="outline" className="text-xs">
                            {prospect?.stage?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {prospect?.company_name}
                        </p>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <div className={`text-xl font-bold ${getScoreColor(prediction.conversion_probability)}`}>
                          {prediction.conversion_probability}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ±{prediction.confidence_interval}%
                        </p>
                      </div>

                      {/* Recommended Action */}
                      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30">
                        <ActionIcon className="w-4 h-4 text-primary" />
                        <span className="text-sm">{prediction.recommended_action || 'Follow up'}</span>
                      </div>

                      {/* Optimal Time */}
                      {prediction.optimal_contact_time && (
                        <div className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(prediction.optimal_contact_time).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}

                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No lead predictions available</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => recalculateMutation.mutate()}
            >
              Calculate Scores
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
