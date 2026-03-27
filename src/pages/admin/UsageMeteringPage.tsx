import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gauge, BarChart3, TrendingUp, AlertTriangle, Settings, Building } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface UsageMeter {
  id: string;
  meter_name: string;
  display_name: string;
  unit: string;
}

interface UsageAggregate {
  company_id: string;
  meter_name: string;
  total_usage: number;
  monthly_limit: number;
}

export default function UsageMeteringPage() {
  const { t } = useTranslation('admin');
  const [meters, setMeters] = useState<UsageMeter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMeters(); }, []);

  const fetchMeters = async () => {
    const { data } = await supabase.from("usage_meters").select("*").order("meter_name");
    if (data) setMeters(data);
    setLoading(false);
  };

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Gauge className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{t('usageMetering.title')}</h1>
          </div>
          <p className="text-muted-foreground">{t('usageMetering.subtitle')}</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t('usageMetering.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="by-company">{t('usageMetering.tabs.byCompany')}</TabsTrigger>
            <TabsTrigger value="limits">{t('usageMetering.tabs.planLimits')}</TabsTrigger>
            <TabsTrigger value="alerts">{t('usageMetering.tabs.alerts')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meters.map(meter => (
                <Card key={meter.id}>
                  <CardHeader className="pb-2">
                    <CardDescription>{meter.display_name}</CardDescription>
                    <CardTitle className="text-2xl">0 <span className="text-sm font-normal text-muted-foreground">{meter.unit}</span></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t('usageMetering.thisMonth')}</span>
                      <span>{t('usageMetering.noLimitSet')}</span>
                    </div>
                    <Progress value={0} className="h-2 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="by-company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />{t('usageMetering.companyUsage')}</CardTitle>
                <CardDescription>{t('usageMetering.companyUsageDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">{t('usageMetering.noUsageData')}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />{t('usageMetering.configuredMeters')}</CardTitle>
                <CardDescription>{t('usageMetering.configuredMetersDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('usageMetering.meter')}</TableHead>
                      <TableHead>{t('usageMetering.systemName')}</TableHead>
                      <TableHead>{t('usageMetering.unit')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meters.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.display_name}</TableCell>
                        <TableCell className="font-mono text-sm">{m.meter_name}</TableCell>
                        <TableCell><Badge variant="outline">{m.unit}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />{t('usageMetering.usageAlerts')}</CardTitle>
                <CardDescription>{t('usageMetering.usageAlertsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">{t('usageMetering.noAlerts')}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
