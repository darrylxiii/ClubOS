import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertTriangle, TrendingUp, Download, Target, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

interface SLACommitment {
  id: string;
  metric_name: string;
  target_value: number;
  current_value: number;
  unit: string;
  category: string;
  priority: number;
  is_active: boolean;
}

interface SLAViolation {
  id: string;
  sla_commitment_id: string;
  violation_date: string;
  actual_value: number;
  target_value: number;
  variance: number;
  root_cause: string | null;
  remediation: string | null;
}

export const SLADashboard = () => {
  const { data: commitments } = useQuery({
    queryKey: ['sla-commitments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('sla_commitments')
        .select('*')
        .eq('is_active', true)
        .order('priority');
      if (error) throw error;
      return data as SLACommitment[];
    }
  });

  const { data: violations } = useQuery({
    queryKey: ['sla-violations'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await (supabase as any)
        .from('sla_violations')
        .select('*')
        .gte('violation_date', thirtyDaysAgo)
        .order('violation_date', { ascending: false });
      if (error) throw error;
      return data as SLAViolation[];
    }
  });

  const getCompliancePercentage = (commitment: SLACommitment): number => {
    if (commitment.unit === '%') {
      return Math.min(100, (commitment.current_value / commitment.target_value) * 100);
    }
    // For time-based SLAs (lower is better)
    if (commitment.unit.includes('hour') || commitment.unit.includes('min')) {
      return commitment.current_value <= commitment.target_value ? 100 : Math.max(0, 100 - ((commitment.current_value - commitment.target_value) / commitment.target_value) * 100);
    }
    return Math.min(100, (commitment.current_value / commitment.target_value) * 100);
  };

  const isCompliant = (commitment: SLACommitment): boolean => {
    if (commitment.unit.includes('hour') || commitment.unit.includes('min')) {
      return commitment.current_value <= commitment.target_value;
    }
    return commitment.current_value >= commitment.target_value;
  };

  const overallCompliance = commitments?.length 
    ? Math.round(commitments.filter(c => isCompliant(c)).length / commitments.length * 100)
    : 0;

  const downloadSLAReport = () => {
    const report = {
      generated_at: new Date().toISOString(),
      overall_compliance: `${overallCompliance}%`,
      commitments: commitments?.map(c => ({
        metric: c.metric_name,
        target: `${c.target_value}${c.unit}`,
        current: `${c.current_value}${c.unit}`,
        status: isCompliant(c) ? 'Compliant' : 'Violation'
      })),
      recent_violations: violations?.slice(0, 10).map(v => ({
        date: v.violation_date,
        variance: v.variance,
        root_cause: v.root_cause
      }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sla-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SLA report downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SLA Performance</h2>
          <p className="text-muted-foreground">Service Level Agreement monitoring and compliance</p>
        </div>
        <Button onClick={downloadSLAReport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Compliance</p>
                <p className="text-3xl font-bold">{overallCompliance}%</p>
              </div>
              <Target className={`h-8 w-8 ${overallCompliance >= 95 ? 'text-green-500' : overallCompliance >= 80 ? 'text-amber-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active SLAs</p>
                <p className="text-3xl font-bold">{commitments?.length || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Violations (30d)</p>
                <p className="text-3xl font-bold text-amber-600">{violations?.length || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-3xl font-bold text-red-600">{commitments?.filter(c => !isCompliant(c)).length || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Commitments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            SLA Commitments
          </CardTitle>
          <CardDescription>Current performance against service level targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commitments?.map((commitment) => {
              const compliance = getCompliancePercentage(commitment);
              const compliant = isCompliant(commitment);
              
              return (
                <div key={commitment.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{commitment.category}</Badge>
                      <span className="font-medium">{commitment.metric_name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        <span className={compliant ? 'text-green-600' : 'text-red-600'}>
                          {commitment.current_value}{commitment.unit}
                        </span>
                        <span className="text-muted-foreground"> / {commitment.target_value}{commitment.unit}</span>
                      </span>
                      {compliant ? (
                        <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Violation</Badge>
                      )}
                    </div>
                  </div>
                  <Progress 
                    value={compliance} 
                    className={`h-2 ${compliant ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                  />
                </div>
              );
            })}
            {(!commitments || commitments.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No SLA commitments configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Violations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Violations
          </CardTitle>
          <CardDescription>SLA breaches in the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {violations && violations.length > 0 ? (
            <div className="space-y-3">
              {violations.slice(0, 10).map((violation) => (
                <div key={violation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{format(new Date(violation.violation_date), 'MMM d, yyyy')}</p>
                      {violation.root_cause && (
                        <p className="text-sm text-muted-foreground">{violation.root_cause}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">
                      {violation.variance > 0 ? '+' : ''}{violation.variance?.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <p className="font-medium">No violations in the last 30 days</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
