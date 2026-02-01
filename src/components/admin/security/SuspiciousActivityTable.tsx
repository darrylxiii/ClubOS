import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Shield, ExternalLink, Ban } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface SuspiciousPattern {
  id: string;
  type: 'multiple_failed' | 'unusual_hours' | 'geo_anomaly' | 'rate_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ip_address: string;
  user_id?: string;
  details: Record<string, any>;
  detected_at: string;
}

export function SuspiciousActivityTable() {
  const { data: patterns, isLoading } = useQuery({
    queryKey: ['security-suspicious-patterns'],
    queryFn: async () => {
      // Fetch from adversarial query log and aggregate patterns
      const { data: adversarialData, error: adversarialError } = await supabase
        .from('adversarial_query_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (adversarialError) {
        console.error('Error fetching adversarial logs:', adversarialError);
      }

      // Fetch rate limit violations
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .from('ai_rate_limits')
        .select('*')
        .gte('window_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('window_start', { ascending: false })
        .limit(20);

      if (rateLimitError) {
        console.error('Error fetching rate limits:', rateLimitError);
      }

      const patterns: SuspiciousPattern[] = [];

      // Convert adversarial queries to patterns
      adversarialData?.forEach((item) => {
        patterns.push({
          id: item.id,
          type: 'multiple_failed',
          severity: item.threat_level === 'high' ? 'critical' : item.threat_level === 'medium' ? 'high' : 'medium',
          description: `Adversarial query detected: ${item.detected_patterns?.join(', ') || 'Unknown pattern'}`,
          ip_address: String(item.ip_address || 'Unknown'),
          user_id: item.user_id || undefined,
          details: { query_text: item.query_text?.substring(0, 100), blocked: item.blocked },
          detected_at: item.created_at,
        });
      });

      // Aggregate rate limit violations by IP
      const ipCounts: Record<string, number> = {};
      rateLimitData?.forEach((item) => {
        const ip = item.ip_address || 'unknown';
        ipCounts[ip] = (ipCounts[ip] || 0) + 1;
      });

      Object.entries(ipCounts)
        .filter(([_, count]) => count > 5)
        .forEach(([ip, count]) => {
          patterns.push({
            id: `rate-${ip}`,
            type: 'rate_limit',
            severity: count > 20 ? 'high' : 'medium',
            description: `Rate limit exceeded ${count} times in 24 hours`,
            ip_address: ip,
            details: { violation_count: count },
            detected_at: new Date().toISOString(),
          });
        });

      return patterns.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
    },
    refetchInterval: 30000,
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const handleBlockIP = async (ip: string) => {
    // In production, this would call an edge function to update IP blocklist
    toast.success(`IP ${ip} has been flagged for review`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Suspicious Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Suspicious Activity
          {patterns && patterns.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {patterns.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!patterns || patterns.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">No suspicious activity detected</p>
          </div>
        ) : (
          <div className="space-y-3">
            {patterns.slice(0, 10).map((pattern) => (
              <div
                key={pattern.id} 
                className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                    pattern.severity === 'critical' || pattern.severity === 'high' 
                      ? 'text-destructive' 
                      : 'text-amber-500'
                  }`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(pattern.severity)} className="text-xs uppercase">
                        {pattern.severity}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {pattern.ip_address}
                      </span>
                    </div>
                    <p className="text-sm">{pattern.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(pattern.detected_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleBlockIP(pattern.ip_address)}
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
