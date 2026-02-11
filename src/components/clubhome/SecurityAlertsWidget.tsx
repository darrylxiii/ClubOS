import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, AlertTriangle, ArrowRight, ShieldAlert, ShieldCheck, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface SecurityStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  blockedIps: number;
}

export const SecurityAlertsWidget = () => {
  const [stats, setStats] = useState<SecurityStats>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    blockedIps: 0
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSecurityStats = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Use RPC or raw query to avoid type recursion
      const { data, error } = await (supabase as any)
        .from('threat_events')
        .select('severity')
        .gte('created_at', oneDayAgo)
        .eq('is_resolved', false);

      const threats = (data || []) as Array<{ severity: string | null }>;

      // Count blocked IPs
      const { count: blockedCount } = await supabase
        .from('blocked_ips')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      const severityCounts: Record<string, number> = {};
      threats.forEach(t => {
        const severity = (t.severity || 'low').toLowerCase();
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      });

      setStats({
        total: threats.length,
        critical: severityCounts['critical'] || 0,
        high: severityCounts['high'] || 0,
        medium: severityCounts['medium'] || 0,
        low: severityCounts['low'] || 0,
        blockedIps: blockedCount || 0
      });
    } catch (error) {
      console.error('Error fetching security stats:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurityStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('security-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threat_events' }, () => {
        fetchSecurityStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_ips' }, () => {
        fetchSecurityStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSecurityStats]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getOverallStatus = () => {
    if (stats.critical > 0) return { label: 'Critical', color: 'text-red-400', icon: ShieldAlert };
    if (stats.high > 0) return { label: 'Warning', color: 'text-orange-400', icon: AlertTriangle };
    if (stats.medium > 0) return { label: 'Moderate', color: 'text-yellow-400', icon: Shield };
    return { label: 'Secure', color: 'text-green-400', icon: ShieldCheck };
  };

  if (loading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-52" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const overallStatus = getOverallStatus();
  const StatusIcon = overallStatus.icon;

  return (
    <Card className="glass-subtle rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security Status
          </CardTitle>
          <CardDescription className="hidden sm:block">Threat detection (last 24h)</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fetchSecurityStats(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
            <Link to="/admin/anti-hacking" className="flex items-center gap-1">
              Details <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overall Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 mb-4 p-2 sm:p-3 rounded-lg bg-muted/30"
        >
          <StatusIcon className={`h-6 w-6 sm:h-8 sm:w-8 ${overallStatus.color}`} />
          <div>
            <p className={`font-semibold text-sm sm:text-base ${overallStatus.color}`}>{overallStatus.label}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {stats.total === 0 
                ? 'No threats detected' 
                : `${stats.total} threat${stats.total > 1 ? 's' : ''} detected`}
            </p>
          </div>
        </motion.div>

        {/* Severity Breakdown */}
        {stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-1.5 sm:gap-2 mb-4"
          >
            {stats.critical > 0 && (
              <Badge className={`${getSeverityColor('critical')} text-xs`}>
                {stats.critical} Critical
              </Badge>
            )}
            {stats.high > 0 && (
              <Badge className={`${getSeverityColor('high')} text-xs`}>
                {stats.high} High
              </Badge>
            )}
            {stats.medium > 0 && (
              <Badge className={`${getSeverityColor('medium')} text-xs`}>
                {stats.medium} Medium
              </Badge>
            )}
            {stats.low > 0 && (
              <Badge className={`${getSeverityColor('low')} text-xs`}>
                {stats.low} Low
              </Badge>
            )}
          </motion.div>
        )}

        {/* Blocked IPs */}
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-muted-foreground">Blocked IPs</span>
          <Badge variant="outline" className="text-xs">{stats.blockedIps}</Badge>
        </div>
        
        {/* Mobile-only Details button */}
        <Button variant="outline" size="sm" asChild className="w-full mt-4 sm:hidden">
          <Link to="/admin/anti-hacking" className="flex items-center justify-center gap-1">
            View Details <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
