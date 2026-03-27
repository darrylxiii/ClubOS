import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download, FileText, Users, Scale, PieChart, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface EEOData {
  gender: Record<string, number>;
  race_ethnicity: Record<string, number>;
  veteran_status: Record<string, number>;
  disability_status: Record<string, number>;
  total_responses: number;
}

interface EEOReport {
  id: string;
  report_type: string;
  report_period_start: string;
  report_period_end: string;
  status: string;
  generated_at: string;
}

const GENDER_LABELS: Record<string, string> = {
  male: "Male", female: "Female", non_binary: "Non-Binary",
  prefer_not_to_say: "Prefer Not to Say", other: "Other",
};

const RACE_LABELS: Record<string, string> = {
  american_indian_alaska_native: "American Indian/Alaska Native",
  asian: "Asian", black_african_american: "Black/African American",
  hispanic_latino: "Hispanic/Latino",
  native_hawaiian_pacific_islander: "Native Hawaiian/Pacific Islander",
  white: "White", two_or_more: "Two or More Races",
  prefer_not_to_say: "Prefer Not to Say",
};

export default function EEOCompliancePage() {
  const { t } = useTranslation('admin');
  const [eeoData, setEeoData] = useState<EEOData>({ gender: {}, race_ethnicity: {}, veteran_status: {}, disability_status: {}, total_responses: 0 });
  const [reports, setReports] = useState<EEOReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [idRes, repRes] = await Promise.all([
      supabase.from("eeo_self_identifications").select("*"),
      supabase.from("eeo_reports").select("*").order("generated_at", { ascending: false }),
    ]);

    if (idRes.data) {
      const data: EEOData = { gender: {}, race_ethnicity: {}, veteran_status: {}, disability_status: {}, total_responses: idRes.data.length };
      idRes.data.forEach(r => {
        if (r.gender) data.gender[r.gender] = (data.gender[r.gender] || 0) + 1;
        if (r.race_ethnicity) data.race_ethnicity[r.race_ethnicity] = (data.race_ethnicity[r.race_ethnicity] || 0) + 1;
        if (r.veteran_status) data.veteran_status[r.veteran_status] = (data.veteran_status[r.veteran_status] || 0) + 1;
        if (r.disability_status) data.disability_status[r.disability_status] = (data.disability_status[r.disability_status] || 0) + 1;
      });
      setEeoData(data);
    }
    if (repRes.data) setReports(repRes.data);
    setLoading(false);
  };

  const generateReport = async (type: string) => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    const { error } = await supabase.from("eeo_reports").insert({
      report_type: type,
      report_period_start: yearStart,
      report_period_end: now.toISOString().split("T")[0],
      report_data: eeoData,
      status: "draft",
    });
    if (!error) {
      toast.success(`${type.toUpperCase()} report generated`);
      fetchData();
    }
  };

  const renderDistribution = (data: Record<string, number>, labels: Record<string, string>, total: number) => (
    <div className="space-y-2">
      {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([key, count]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="text-sm w-48 truncate">{labels[key] || key}</span>
          <Progress value={total > 0 ? (count / total) * 100 : 0} className="h-3 flex-1" />
          <span className="text-sm font-medium w-16 text-right">{count} ({total > 0 ? Math.round((count / total) * 100) : 0}%)</span>
        </div>
      ))}
    </div>
  );

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Scale className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{"EEO / OFCCP COMPLIANCE"}</h1>
            </div>
            <p className="text-muted-foreground">{'Equal Employment Opportunity reporting and diversity analytics'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => generateReport("eeo1")}><FileText className="h-4 w-4 mr-2" />{"Generate EEO-1"}</Button>
            <Button variant="outline" onClick={() => generateReport("adverse_impact")}><AlertTriangle className="h-4 w-4 mr-2" />{'Adverse Impact'}</Button>
            <Button variant="outline" onClick={() => generateReport("diversity_pipeline")}><PieChart className="h-4 w-4 mr-2" />{'Diversity Report'}</Button>
          </div>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>{'Total Self-ID Responses'}</CardDescription><CardTitle className="text-2xl">{eeoData.total_responses}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{'Gender Responses'}</CardDescription><CardTitle className="text-2xl">{Object.values(eeoData.gender).reduce((a, b) => a + b, 0)}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{"Race/Ethnicity Responses"}</CardDescription><CardTitle className="text-2xl">{Object.values(eeoData.race_ethnicity).reduce((a, b) => a + b, 0)}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{'Reports Generated'}</CardDescription><CardTitle className="text-2xl">{reports.length}</CardTitle></CardHeader></Card>
        </div>

        <Tabs defaultValue="demographics">
          <TabsList>
            <TabsTrigger value="demographics">{"Demographics"}</TabsTrigger>
            <TabsTrigger value="pipeline">{'Pipeline Diversity'}</TabsTrigger>
            <TabsTrigger value="reports">{"Reports"}</TabsTrigger>
          </TabsList>

          <TabsContent value="demographics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>{'Gender Distribution'}</CardTitle></CardHeader>
                <CardContent>{renderDistribution(eeoData.gender, GENDER_LABELS, eeoData.total_responses)}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>{"Race / Ethnicity"}</CardTitle></CardHeader>
                <CardContent>{renderDistribution(eeoData.race_ethnicity, RACE_LABELS, eeoData.total_responses)}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>{'Veteran Status'}</CardTitle></CardHeader>
                <CardContent>{renderDistribution(eeoData.veteran_status, { veteran: "Veteran", not_veteran: "Not a Veteran", prefer_not_to_say: "Prefer Not to Say" }, eeoData.total_responses)}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>{'Disability Status'}</CardTitle></CardHeader>
                <CardContent>{renderDistribution(eeoData.disability_status, { yes: "Yes", no: "No", prefer_not_to_say: "Prefer Not to Say" }, eeoData.total_responses)}</CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{'Diversity Pipeline Analysis'}</CardTitle>
                <CardDescription>{'Track diversity representation across hiring stages'}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">{'Pipeline diversity data will populate as candidates move through hiring stages with self-identification data'}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>{'Generated Reports'}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{"Type"}</TableHead>
                      <TableHead>{"Period"}</TableHead>
                      <TableHead>{"Status"}</TableHead>
                      <TableHead>{"Generated"}</TableHead>
                      <TableHead>{"Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map(r => (
                      <TableRow key={r.id}>
                        <TableCell><Badge variant="outline">{r.report_type.toUpperCase()}</Badge></TableCell>
                        <TableCell className="text-sm">{r.report_period_start} - {r.report_period_end}</TableCell>
                        <TableCell><Badge variant={r.status === 'submitted' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                        <TableCell className="text-sm">{new Date(r.generated_at).toLocaleDateString()}</TableCell>
                        <TableCell><Button size="sm" variant="ghost"><Download className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {reports.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{'No reports generated yet'}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
