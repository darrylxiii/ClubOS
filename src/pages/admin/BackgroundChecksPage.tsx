import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Plus, Search, Settings, Activity, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BackgroundCheck {
  id: string;
  candidate_id: string;
  provider_id: string;
  external_check_id: string;
  package_name: string;
  status: string;
  result: string | null;
  initiated_by: string;
  completed_at: string | null;
  created_at: string;
}

interface Provider {
  id: string;
  provider_name: string;
  is_active: boolean;
  default_package: string;
}

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  initiated: Activity,
  in_progress: Activity,
  complete: CheckCircle,
  failed: XCircle,
  canceled: XCircle,
};

const RESULT_COLORS: Record<string, string> = {
  clear: "bg-green-600",
  consider: "bg-amber-600",
  adverse_action: "bg-red-600",
};

export default function BackgroundChecksPage() {
  const { t } = useTranslation('admin');
  const [checks, setChecks] = useState<BackgroundCheck[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [checkRes, provRes] = await Promise.all([
      supabase.from("background_checks").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("background_check_providers").select("*"),
    ]);
    if (checkRes.data) setChecks(checkRes.data);
    if (provRes.data) setProviders(provRes.data);
    setLoading(false);
  };

  const filtered = statusFilter === "all" ? checks : checks.filter(c => c.status === statusFilter);
  const pending = checks.filter(c => c.status === 'pending' || c.status === 'initiated' || c.status === 'in_progress').length;
  const completed = checks.filter(c => c.status === 'complete').length;
  const clear = checks.filter(c => c.result === 'clear').length;
  const consider = checks.filter(c => c.result === 'consider' || c.result === 'adverse_action').length;

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('backgroundChecks.title')}</h1>
            </div>
            <p className="text-muted-foreground">{t('backgroundChecks.subtitle')}</p>
          </div>
          <Button><Plus className="h-4 w-4 mr-2" />{t('backgroundChecks.initiateCheck')}</Button>
        </div>

        <Tabs defaultValue="checks">
          <TabsList>
            <TabsTrigger value="checks">{t('backgroundChecks.allChecks')}</TabsTrigger>
            <TabsTrigger value="providers">{t('backgroundChecks.providers')}</TabsTrigger>
          </TabsList>

          <TabsContent value="checks" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardHeader className="pb-2"><CardDescription>{t('backgroundChecks.totalChecks')}</CardDescription><CardTitle className="text-2xl">{checks.length}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('backgroundChecks.inProgress')}</CardDescription><CardTitle className="text-2xl text-blue-600">{pending}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('backgroundChecks.clearResults')}</CardDescription><CardTitle className="text-2xl text-green-600">{clear}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('backgroundChecks.needsReview')}</CardDescription><CardTitle className="text-2xl text-amber-600">{consider}</CardTitle></CardHeader></Card>
            </div>

            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('backgroundChecks.allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('backgroundChecks.pending')}</SelectItem>
                  <SelectItem value="in_progress">{t('backgroundChecks.inProgress')}</SelectItem>
                  <SelectItem value="complete">{t('backgroundChecks.complete')}</SelectItem>
                  <SelectItem value="failed">{t('backgroundChecks.failed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('backgroundChecks.candidate')}</TableHead>
                      <TableHead>{t('backgroundChecks.package')}</TableHead>
                      <TableHead>{t('backgroundChecks.status')}</TableHead>
                      <TableHead>{t('backgroundChecks.result')}</TableHead>
                      <TableHead>{t('backgroundChecks.initiated')}</TableHead>
                      <TableHead>{t('backgroundChecks.completed')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(check => {
                      const StatusIcon = STATUS_ICONS[check.status] || Clock;
                      return (
                        <TableRow key={check.id}>
                          <TableCell className="font-mono text-xs">{check.candidate_id.slice(0, 8)}...</TableCell>
                          <TableCell><Badge variant="outline">{check.package_name}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={check.status === 'complete' ? 'default' : check.status === 'failed' ? 'destructive' : 'secondary'}>
                              <StatusIcon className="h-3 w-3 mr-1" />{check.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {check.result ? (
                              <Badge className={RESULT_COLORS[check.result]}>{check.result}</Badge>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-sm">{format(new Date(check.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-sm">{check.completed_at ? format(new Date(check.completed_at), "MMM d, yyyy") : "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('backgroundChecks.noChecks')}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />{t('backgroundChecks.connectedProviders')}</CardTitle>
                <CardDescription>{t('backgroundChecks.configureProviders')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {["Checkr", "Sterling", "HireRight", "GoodHire", "Certn"].map(name => {
                    const connected = providers.find(p => p.provider_name === name.toLowerCase());
                    return (
                      <Card key={name} className={connected?.is_active ? "border-green-500/50" : ""}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{name}</CardTitle>
                            <Badge variant={connected?.is_active ? "default" : "secondary"}>
                              {connected?.is_active ? t('backgroundChecks.connected') : t('backgroundChecks.notConnected')}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {connected ? (
                            <p className="text-sm text-muted-foreground">Default package: {connected.default_package || "Standard"}</p>
                          ) : (
                            <Button variant="outline" size="sm" className="w-full">{t('backgroundChecks.connect')}</Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
