import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/lib/notify';

interface AccountHealth {
  id: string;
  email: string;
  health_score: number;
  warmup_status: string;
  inbox_placement_rate: number | null;
  spam_rate: number | null;
  bounce_rate: number | null;
  daily_limit: number | null;
  emails_sent_today: number | null;
  last_checked_at: string;
}

export function AccountHealthDashboard() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['account-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instantly_account_health')
        .select('*')
        .order('health_score', { ascending: true });

      if (error) throw error;
      return data as AccountHealth[];
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncing(true);
      const { data, error } = await supabase.functions.invoke('sync-instantly-account-health');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-health'] });
      notify.success('Accounts Synced', { description: 'Email account health data has been updated.' });
      setSyncing(false);
    },
    onError: () => {
      notify.error('Sync Failed', { description: 'Could not sync account health data.' });
      setSyncing(false);
    }
  });

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (score: number) => {
    if (score >= 80) return CheckCircle2;
    if (score >= 60) return TrendingUp;
    if (score >= 40) return AlertTriangle;
    return XCircle;
  };

  const getWarmupBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Warmed Up</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Warming</Badge>;
      case 'paused':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30">Paused</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const overallHealth = accounts?.length 
    ? Math.round(accounts.reduce((sum, a) => sum + (a.health_score || 0), 0) / accounts.length)
    : 0;

  const criticalAccounts = accounts?.filter(a => a.health_score < 40).length || 0;
  const warningAccounts = accounts?.filter(a => a.health_score >= 40 && a.health_score < 70).length || 0;
  const healthyAccounts = accounts?.filter(a => a.health_score >= 70).length || 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className={`w-5 h-5 ${getHealthColor(overallHealth)}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${getHealthColor(overallHealth)}`}>{overallHealth}%</p>
                <p className="text-xs text-muted-foreground">Overall Health</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{healthyAccounts}</p>
                <p className="text-xs text-muted-foreground">Healthy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-500">{warningAccounts}</p>
                <p className="text-xs text-muted-foreground">Warning</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{criticalAccounts}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Grid */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Email Account Health
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : accounts && accounts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account, index) => {
                const StatusIcon = getStatusIcon(account.health_score);
                
                return (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`border-2 ${account.health_score < 40 ? 'border-red-500/30 bg-red-500/5' : account.health_score < 70 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <StatusIcon className={`w-5 h-5 shrink-0 ${getHealthColor(account.health_score)}`} />
                            <p className="font-medium truncate text-sm">{account.email}</p>
                          </div>
                          {getWarmupBadge(account.warmup_status)}
                        </div>

                        {/* Health Score */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Health Score</span>
                            <span className={`text-lg font-bold ${getHealthColor(account.health_score)}`}>
                              {account.health_score}%
                            </span>
                          </div>
                          <Progress 
                            value={account.health_score} 
                            className="h-2"
                          />
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center justify-between p-2 rounded bg-muted/20">
                            <span className="text-muted-foreground">Inbox</span>
                            <span className={account.inbox_placement_rate && account.inbox_placement_rate >= 90 ? 'text-green-500' : 'text-yellow-500'}>
                              {account.inbox_placement_rate?.toFixed(1) || 0}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/20">
                            <span className="text-muted-foreground">Spam</span>
                            <span className={account.spam_rate && account.spam_rate > 2 ? 'text-red-500' : 'text-green-500'}>
                              {account.spam_rate?.toFixed(1) || 0}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/20">
                            <span className="text-muted-foreground">Bounce</span>
                            <span className={account.bounce_rate && account.bounce_rate > 5 ? 'text-red-500' : 'text-green-500'}>
                              {account.bounce_rate?.toFixed(1) || 0}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-muted/20">
                            <span className="text-muted-foreground">Sent</span>
                            <span>
                              {account.emails_sent_today || 0}/{account.daily_limit || 50}
                            </span>
                          </div>
                        </div>

                        {/* Last Checked */}
                        <p className="text-xs text-muted-foreground mt-3 text-center">
                          Last checked: {new Date(account.last_checked_at).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No email accounts found</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => syncMutation.mutate()}
              >
                Sync Accounts
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
