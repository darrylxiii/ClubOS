import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, Search, Download, Users, TrendingUp, TrendingDown, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: string;
  purpose: string;
  legal_basis: string;
  granted: boolean;
  granted_at: string | null;
  withdrawn_at: string | null;
  expires_at: string | null;
  source: string;
  created_at: string;
}

interface ProcessingActivity {
  id: string;
  activity_name: string;
  description: string;
  data_categories: string[];
  processing_purposes: string[];
  legal_basis: string;
  retention_period: string;
  recipients: string[];
  third_country_transfers: string[];
  dpia_required: boolean;
  dpia_completed_at: string | null;
  status: string;
  last_reviewed_at: string | null;
  next_review_at: string | null;
}

export default function ConsentManagementPage() {
  const { t } = useTranslation('admin');
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [activities, setActivities] = useState<ProcessingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [conRes, actRes] = await Promise.all([
      supabase.from("consent_records").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("processing_activities").select("*").order("activity_name"),
    ]);
    if (conRes.data) setConsents(conRes.data);
    if (actRes.data) setActivities(actRes.data);
    setLoading(false);
  };

  const totalConsents = consents.length;
  const granted = consents.filter(c => c.granted).length;
  const withdrawn = consents.filter(c => c.withdrawn_at).length;
  const expired = consents.filter(c => c.expires_at && new Date(c.expires_at) < new Date()).length;
  const consentRate = totalConsents > 0 ? Math.round((granted / totalConsents) * 100) : 0;

  const consentTypes = [...new Set(consents.map(c => c.consent_type))];
  const filtered = consents.filter(c => {
    if (typeFilter !== "all" && c.consent_type !== typeFilter) return false;
    return true;
  });

  const exportConsents = () => {
    const csv = ["ID,User ID,Type,Purpose,Legal Basis,Granted,Granted At,Withdrawn At"];
    consents.forEach(c => csv.push(`${c.id},${c.user_id},${c.consent_type},${c.purpose},${c.legal_basis},${c.granted},${c.granted_at || ''},${c.withdrawn_at || ''}`));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'consent_register.csv'; a.click();
    toast.success('Consent register exported');
  };

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <FileCheck className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{'GDPR COMPLIANCE HUB'}</h1>
            </div>
            <p className="text-muted-foreground">{'Consent management, ROPA, and data processing oversight'}</p>
          </div>
          <Button variant="outline" onClick={exportConsents}><Download className="h-4 w-4 mr-2" />{'Export Register'}</Button>
        </div>

        <Tabs defaultValue="consent">
          <TabsList>
            <TabsTrigger value="consent">{'Consent Register'}</TabsTrigger>
            <TabsTrigger value="ropa">{t('consentManagementPage.text1')}</TabsTrigger>
            <TabsTrigger value="gaps">{'Gap Analysis'}</TabsTrigger>
          </TabsList>

          <TabsContent value="consent" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card><CardHeader className="pb-2"><CardDescription>{'Total Records'}</CardDescription><CardTitle className="text-2xl">{totalConsents}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{'Active Consent'}</CardDescription><CardTitle className="text-2xl text-green-600">{granted}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('consentManagementPage.text2')}</CardDescription><CardTitle className="text-2xl text-red-600">{withdrawn}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('consentManagementPage.text3')}</CardDescription><CardTitle className="text-2xl text-amber-600">{expired}</CardTitle></CardHeader></Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription>{'Consent Rate'}</CardDescription><CardTitle className="text-2xl">{consentRate}%</CardTitle></CardHeader>
                <CardContent><Progress value={consentRate} className="h-2" /></CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder={'All types'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{'All Types'}</SelectItem>
                  {consentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('consentManagementPage.text4')}</TableHead>
                      <TableHead>{t('consentManagementPage.text5')}</TableHead>
                      <TableHead>{'Legal Basis'}</TableHead>
                      <TableHead>{t('consentManagementPage.text6')}</TableHead>
                      <TableHead>{t('consentManagementPage.text7')}</TableHead>
                      <TableHead>{t('consentManagementPage.text8')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 50).map(c => (
                      <TableRow key={c.id}>
                        <TableCell><Badge variant="outline">{c.consent_type}</Badge></TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{c.purpose}</TableCell>
                        <TableCell className="text-sm">{c.legal_basis}</TableCell>
                        <TableCell>
                          {c.withdrawn_at ? <Badge variant="destructive">{t('consentManagementPage.text9')}</Badge> :
                           c.granted ? <Badge className="bg-green-600">{t('consentManagementPage.text10')}</Badge> :
                           <Badge variant="secondary">{t('consentManagementPage.text11')}</Badge>}
                        </TableCell>
                        <TableCell className="text-sm">{c.granted_at ? format(new Date(c.granted_at), "MMM d, yyyy") : "-"}</TableCell>
                        <TableCell className="text-sm">{c.expires_at ? format(new Date(c.expires_at), "MMM d, yyyy") : "Never"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ropa" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{t('consentManagementPage.text12')}</CardTitle>
                <CardDescription>{'Living register of all data processing activities'}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('consentManagementPage.text13')}</TableHead>
                      <TableHead>{'Legal Basis'}</TableHead>
                      <TableHead>{'Data Categories'}</TableHead>
                      <TableHead>{t('consentManagementPage.text14')}</TableHead>
                      <TableHead>DPIA</TableHead>
                      <TableHead>{t('consentManagementPage.text15')}</TableHead>
                      <TableHead>{'Next Review'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div><span className="font-medium">{a.activity_name}</span><br /><span className="text-xs text-muted-foreground">{a.description}</span></div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{a.legal_basis}</Badge></TableCell>
                        <TableCell><div className="flex gap-1 flex-wrap">{(a.data_categories || []).slice(0, 3).map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}</div></TableCell>
                        <TableCell className="text-sm">{a.retention_period || "Not set"}</TableCell>
                        <TableCell>{a.dpia_required ? (a.dpia_completed_at ? <Badge className="bg-green-600">{t('consentManagementPage.text16')}</Badge> : <Badge variant="destructive">{t('consentManagementPage.text17')}</Badge>) : <Badge variant="secondary">{t('consentManagementPage.text18')}</Badge>}</TableCell>
                        <TableCell><Badge variant={a.status === 'active' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                        <TableCell className="text-sm">{a.next_review_at ? format(new Date(a.next_review_at), "MMM d, yyyy") : "Not scheduled"}</TableCell>
                      </TableRow>
                    ))}
                    {activities.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{'No processing activities recorded. Add your first entry to start your ROPA.'}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gaps" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />{'Consent Gap Analysis'}</CardTitle>
                <CardDescription>{'Identify users and data subjects missing required consent'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-amber-500/50">
                    <CardHeader className="pb-2">
                      <CardDescription>{'Users Without Processing Consent'}</CardDescription>
                      <CardTitle className="text-xl text-amber-600">{expired} users</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">{'These users have expired or missing consent records and need re-consent'}</p></CardContent>
                  </Card>
                  <Card className="border-red-500/50">
                    <CardHeader className="pb-2">
                      <CardDescription>{'Activities Without DPIA'}</CardDescription>
                      <CardTitle className="text-xl text-red-600">{activities.filter(a => a.dpia_required && !a.dpia_completed_at).length}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">{'Processing activities that require a Data Protection Impact Assessment'}</p></CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-amber-500/50">
                    <CardHeader className="pb-2">
                      <CardDescription>{'Activities Due for Review'}</CardDescription>
                      <CardTitle className="text-xl text-amber-600">
                        {activities.filter(a => a.next_review_at && new Date(a.next_review_at) < new Date()).length}
                      </CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">{'Processing activities past their review date'}</p></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{'Third-Country Transfers'}</CardDescription>
                      <CardTitle className="text-xl">{activities.filter(a => (a.third_country_transfers || []).length > 0).length}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">{t('consentManagementPage.text19')}</p></CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
