import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { TrendingUp, Users, MousePointerClick, CheckCircle, Download, Eye, EyeOff } from "lucide-react";
import { notify } from "@/lib/notify";
import { format } from "date-fns";

export default function FunnelAnalytics() {
  const { t } = useTranslation('partner');
  const [isActive, setIsActive] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalViews: 0,
    uniqueSessions: 0,
    submissions: 0,
    conversionRate: 0,
    avgCompletionTime: 0,
  });
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadAnalytics();
    loadRequests();
    loadFunnelConfig();
  }, []);

  const loadFunnelConfig = async () => {
    const { data } = await supabase
      .from("funnel_config")
      .select("is_active")
      .maybeSingle();
    if (data) setIsActive(data.is_active);
  };

  const toggleFunnel = async () => {
    const { error } = await supabase
      .from("funnel_config")
      .update({ is_active: !isActive })
      .eq("id", (await supabase.from("funnel_config").select("id").maybeSingle()).data?.id);

    if (!error) {
      setIsActive(!isActive);
      notify.success(
        `Funnel ${!isActive ? "Activated" : "Paused"}`,
        { description: !isActive ? "Partner requests are now being accepted" : "Partner requests are temporarily paused" }
      );
    }
  };

  const loadAnalytics = async () => {
    const { data } = await supabase
      .from("funnel_analytics")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setAnalytics(data);
      
      const uniqueSessions = new Set(data.map(d => d.session_id)).size;
      const views = data.filter(d => d.action === "view").length;
      const completions = data.filter(d => d.action === "complete" && d.step_name === "compliance").length;
      
      setStats({
        totalViews: views,
        uniqueSessions,
        submissions: completions,
        conversionRate: uniqueSessions > 0 ? (completions / uniqueSessions) * 100 : 0,
        avgCompletionTime: 0,
      });
    }
  };

  const loadRequests = async () => {
    let query = supabase
      .from("partner_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }

    const { data } = await query;
    if (data) setRequests(data);
  };

  const exportData = () => {
    const csv = [
      ["Date", "Company", "Contact", "Email", "Status", "Industry", "Partnership Type"],
      ...requests.map(r => [
        format(new Date(r.created_at), "yyyy-MM-dd"),
        r.company_name,
        r.contact_name,
        r.contact_email,
        r.status,
        r.industry,
        r.partnership_type,
      ]),
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `partner-requests-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const stepData = [
    { step: "Contact", views: analytics.filter(a => a.step_name === "contact" && a.action === "view").length },
    { step: "Company", views: analytics.filter(a => a.step_name === "company" && a.action === "view").length },
    { step: "Partnership", views: analytics.filter(a => a.step_name === "partnership" && a.action === "view").length },
    { step: "Compliance", views: analytics.filter(a => a.step_name === "compliance" && a.action === "view").length },
  ];

  const statusData = [
    { name: "Pending", value: requests.filter(r => r.status === "pending").length },
    { name: "In Review", value: requests.filter(r => r.status === "in_review").length },
    { name: "Approved", value: requests.filter(r => r.status === "approved").length },
    { name: "Rejected", value: requests.filter(r => r.status === "rejected").length },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('funnelAnalytics.text1')}</h2>
          <p className="text-muted-foreground">{t('funnelAnalytics.text2')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant={isActive ? "secondary" : "default"}
            onClick={toggleFunnel}
          >
            {isActive ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {isActive ? "Pause Funnel" : "Activate Funnel"}
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className="font-medium">
            Funnel Status: {isActive ? "Active - Accepting Requests" : "Paused"}
          </span>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-6">
          <Eye className="w-8 h-8 text-primary mb-3" />
          <div className="text-3xl font-bold mb-1">{stats.totalViews}</div>
          <div className="text-sm text-muted-foreground">{t('funnelAnalytics.text3')}</div>
        </Card>
        <Card className="p-6">
          <Users className="w-8 h-8 text-primary mb-3" />
          <div className="text-3xl font-bold mb-1">{stats.uniqueSessions}</div>
          <div className="text-sm text-muted-foreground">{t('funnelAnalytics.text4')}</div>
        </Card>
        <Card className="p-6">
          <CheckCircle className="w-8 h-8 text-primary mb-3" />
          <div className="text-3xl font-bold mb-1">{stats.submissions}</div>
          <div className="text-sm text-muted-foreground">{t('funnelAnalytics.text5')}</div>
        </Card>
        <Card className="p-6">
          <TrendingUp className="w-8 h-8 text-primary mb-3" />
          <div className="text-3xl font-bold mb-1">{stats.conversionRate.toFixed(1)}%</div>
          <div className="text-sm text-muted-foreground">{t('funnelAnalytics.text6')}</div>
        </Card>
        <Card className="p-6">
          <MousePointerClick className="w-8 h-8 text-primary mb-3" />
          <div className="text-3xl font-bold mb-1">{((stats.uniqueSessions - stats.submissions) / stats.uniqueSessions * 100 || 0).toFixed(1)}%</div>
          <div className="text-sm text-muted-foreground">{t('funnelAnalytics.text7')}</div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('funnelAnalytics.text8')}</h3>
          <DynamicChart
            type="bar"
            data={stepData}
            height={300}
            config={{
              xAxisKey: 'step',
              bars: [{ dataKey: 'views', fill: 'hsl(var(--primary))', radius: [8, 8, 0, 0] }],
              showGrid: true,
              showTooltip: true,
            }}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('funnelAnalytics.text9')}</h3>
          <DynamicChart
            type="pie"
            data={statusData}
            height={300}
            config={{
              pie: {
                dataKey: 'value',
                nameKey: 'name',
                label: true,
              },
              showTooltip: true,
            }}
          />
        </Card>
      </div>

      {/* Requests Table */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-lg font-semibold">{t('funnelAnalytics.text10')}</h3>
          <div className="flex gap-3 w-full md:w-auto">
            <Select value={filterStatus} onValueChange={(value) => {
              setFilterStatus(value);
              loadRequests();
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('funnelAnalytics.text11')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('funnelAnalytics.text12')}</SelectItem>
                <SelectItem value="pending">{t('funnelAnalytics.text13')}</SelectItem>
                <SelectItem value="in_review">{t('funnelAnalytics.text14')}</SelectItem>
                <SelectItem value="approved">{t('funnelAnalytics.text15')}</SelectItem>
                <SelectItem value="rejected">{t('funnelAnalytics.text16')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4">{t('funnelAnalytics.text17')}</th>
                <th className="text-left py-3 px-4">{t('funnelAnalytics.text18')}</th>
                <th className="text-left py-3 px-4">{t('funnelAnalytics.text19')}</th>
                <th className="text-left py-3 px-4">{t('funnelAnalytics.text20')}</th>
                <th className="text-left py-3 px-4">{t('funnelAnalytics.text21')}</th>
                <th className="text-left py-3 px-4">{t('funnelAnalytics.text22')}</th>
                <th className="text-left py-3 px-4">{t('funnelAnalytics.text23')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4">{format(new Date(request.created_at), "MMM dd, yyyy")}</td>
                  <td className="py-3 px-4 font-medium">{request.company_name}</td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div>{request.contact_name}</div>
                      <div className="text-muted-foreground">{request.contact_email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">{request.industry}</td>
                  <td className="py-3 px-4">{request.partnership_type}</td>
                  <td className="py-3 px-4">
                    <Badge variant={
                      request.status === "approved" ? "default" :
                      request.status === "rejected" ? "destructive" :
                      request.status === "in_review" ? "secondary" :
                      "outline"
                    }>
                      {request.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {request.source_channel || "Direct"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
