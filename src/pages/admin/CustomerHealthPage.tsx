import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HeartPulse, TrendingUp, TrendingDown, AlertTriangle, Users, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface HealthScore {
  id: string;
  company_id: string;
  overall_score: number;
  usage_score: number;
  adoption_score: number;
  support_score: number;
  risk_level: string;
  monthly_recurring_revenue: number;
  active_users_count: number;
  contract_renewal_date: string;
  features_adopted: string[];
  support_tickets_open: number;
}

const RISK_COLORS: Record<string, string> = {
  healthy: "bg-green-600",
  monitor: "bg-amber-500",
  at_risk: "bg-orange-500",
  critical: "bg-red-600",
};

export default function CustomerHealthPage() {
  const { t } = useTranslation('admin');
  const [scores, setScores] = useState<HealthScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchScores(); }, []);

  const fetchScores = async () => {
    const { data } = await supabase.from("customer_health_scores").select("*").order("overall_score");
    if (data) setScores(data);
    setLoading(false);
  };

  const healthy = scores.filter(s => s.risk_level === 'healthy').length;
  const atRisk = scores.filter(s => s.risk_level === 'at_risk' || s.risk_level === 'critical').length;
  const totalMRR = scores.reduce((a, s) => a + (s.monthly_recurring_revenue || 0), 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, s) => a + (s.overall_score || 0), 0) / scores.length) : 0;

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <HeartPulse className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{'CUSTOMER HEALTH'}</h1>
          </div>
          <p className="text-muted-foreground">{'Account-level health scores, churn risk, and expansion opportunities'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>{'Avg Health Score'}</CardDescription><CardTitle className="text-2xl">{avgScore}/100</CardTitle></CardHeader><CardContent><Progress value={avgScore} className="h-2" /></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{'Healthy Accounts'}</CardDescription><CardTitle className="text-2xl text-green-600">{healthy}</CardTitle></CardHeader></Card>
          <Card className="border-red-500/50"><CardHeader className="pb-2"><CardDescription>{'At Risk'}</CardDescription><CardTitle className="text-2xl text-red-600">{atRisk}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{'Total MRR'}</CardDescription><CardTitle className="text-2xl">${totalMRR.toLocaleString()}</CardTitle></CardHeader></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{'Account Health Dashboard'}</CardTitle>
            <CardDescription>{'Combined health score from usage, adoption, support, and NPS signals'}</CardDescription>
          </CardHeader>
          <CardContent>
            {scores.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">
                Customer health scores will populate as account data is aggregated. Scores combine: usage metrics (DAU/MAU), feature adoption, support ticket volume, NPS responses, and contract renewal proximity.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('customerHealthPage.text1')}</TableHead>
                    <TableHead>{'Health Score'}</TableHead>
                    <TableHead>{t('customerHealthPage.text2')}</TableHead>
                    <TableHead>{t('customerHealthPage.text3')}</TableHead>
                    <TableHead>{t('customerHealthPage.text4')}</TableHead>
                    <TableHead>{'Risk Level'}</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>{'Active Users'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.company_id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={s.overall_score} className="h-2 w-16" />
                          <span className="text-sm font-medium">{s.overall_score}</span>
                        </div>
                      </TableCell>
                      <TableCell>{s.usage_score}</TableCell>
                      <TableCell>{s.adoption_score}</TableCell>
                      <TableCell>{s.support_score}</TableCell>
                      <TableCell><Badge className={RISK_COLORS[s.risk_level]}>{s.risk_level}</Badge></TableCell>
                      <TableCell>${(s.monthly_recurring_revenue || 0).toLocaleString()}</TableCell>
                      <TableCell>{s.active_users_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
