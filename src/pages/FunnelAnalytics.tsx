import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, MousePointerClick, CheckCircle, Download, Settings, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AppLayout } from "@/components/AppLayout";

export default function FunnelAnalytics() {
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
  const [filterDate, setFilterDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
    loadRequests();
    loadFunnelConfig();
  }, []);

  const loadFunnelConfig = async () => {
    const { data } = await supabase
      .from("funnel_config")
      .select("is_active")
      .single();
    if (data) setIsActive(data.is_active);
  };

  const toggleFunnel = async () => {
    const { error } = await supabase
      .from("funnel_config")
      .update({ is_active: !isActive })
      .eq("id", (await supabase.from("funnel_config").select("id").single()).data?.id);

    if (!error) {
      setIsActive(!isActive);
      toast({
        title: `Funnel ${!isActive ? "Activated" : "Paused"}`,
        description: !isActive ? "Partner requests are now being accepted" : "Partner requests are temporarily paused",
      });
    }
  };

  const loadAnalytics = async () => {
    const { data } = await supabase
      .from("funnel_analytics")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setAnalytics(data);
      
      // Calculate stats
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

  // Prepare chart data
  const stepData = [
    { step: "Contact", views: analytics.filter(a => a.step_name === "contact" && a.action === "view").length },
    { step: "Company", views: analytics.filter(a => a.step_name === "company" && a.action === "view").length },
    { step: "Partnership", views: analytics.filter(a => a.step_name === "partnership" && a.action === "view").length },
    { step: "Compliance", views: analytics.filter(a => a.step_name === "compliance" && a.action === "view").length },
  ];

  const statusData = [
    { name: "Pending", value: requests.filter(r => r.status === "pending").length, color: "#fbbf24" },
    { name: "In Review", value: requests.filter(r => r.status === "in_review").length, color: "#60a5fa" },
    { name: "Approved", value: requests.filter(r => r.status === "approved").length, color: "#34d399" },
    { name: "Rejected", value: requests.filter(r => r.status === "rejected").length, color: "#f87171" },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Funnel Analytics</h1>
            <p className="text-muted-foreground">Real-time partner request tracking and insights</p>
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
        <Card className="p-4 mb-8 glass-effect">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className="font-medium">
              Funnel Status: {isActive ? "Active - Accepting Requests" : "Paused"}
            </span>
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="p-6 glass-effect hover-scale">
            <Eye className="w-8 h-8 text-primary mb-3" />
            <div className="text-3xl font-bold mb-1">{stats.totalViews}</div>
            <div className="text-sm text-muted-foreground">Total Views</div>
          </Card>
          <Card className="p-6 glass-effect hover-scale">
            <Users className="w-8 h-8 text-primary mb-3" />
            <div className="text-3xl font-bold mb-1">{stats.uniqueSessions}</div>
            <div className="text-sm text-muted-foreground">Unique Sessions</div>
          </Card>
          <Card className="p-6 glass-effect hover-scale">
            <CheckCircle className="w-8 h-8 text-primary mb-3" />
            <div className="text-3xl font-bold mb-1">{stats.submissions}</div>
            <div className="text-sm text-muted-foreground">Submissions</div>
          </Card>
          <Card className="p-6 glass-effect hover-scale">
            <TrendingUp className="w-8 h-8 text-primary mb-3" />
            <div className="text-3xl font-bold mb-1">{stats.conversionRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Conversion Rate</div>
          </Card>
          <Card className="p-6 glass-effect hover-scale">
            <MousePointerClick className="w-8 h-8 text-primary mb-3" />
            <div className="text-3xl font-bold mb-1">{((stats.uniqueSessions - stats.submissions) / stats.uniqueSessions * 100 || 0).toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Drop-off Rate</div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 glass-effect">
            <h3 className="text-lg font-semibold mb-4">Funnel Step Progression</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stepData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="step" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 glass-effect">
            <h3 className="text-lg font-semibold mb-4">Request Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Requests Table */}
        <Card className="p-6 glass-effect">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="text-lg font-semibold">Partner Requests</h3>
            <div className="flex gap-3 w-full md:w-auto">
              <Select value={filterStatus} onValueChange={(value) => {
                setFilterStatus(value);
                loadRequests();
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Company</th>
                  <th className="text-left py-3 px-4">Contact</th>
                  <th className="text-left py-3 px-4">Industry</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Source</th>
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
    </AppLayout>
  );
}
