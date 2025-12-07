import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Shield, 
  Database, 
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export default function ComplianceDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    agreements: { total: 0, active: 0, pending: 0 },
    subprocessors: { total: 0, active: 0, high_risk: 0 },
    audit_requests: { total: 0, pending: 0, in_progress: 0 },
    data_rules: { total: 0, tables_covered: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Load agreements stats
      const { data: agreements } = await supabase
        .from("legal_agreements")
        .select("status");

      // Load subprocessors stats
      const { data: subprocessors } = await supabase
        .from("subprocessors")
        .select("is_active, risk_level");

      // Load audit requests stats
      const { data: auditRequests } = await supabase
        .from("audit_requests")
        .select("status");

      // Load data classification stats
      const { data: dataRules } = await supabase
        .from("data_classification_rules")
        .select("table_name");

      const uniqueTables = new Set(dataRules?.map(r => r.table_name) || []);

      setStats({
        agreements: {
          total: agreements?.length || 0,
          active: agreements?.filter(a => a.status === "active").length || 0,
          pending: agreements?.filter(a => a.status === "pending_signature").length || 0,
        },
        subprocessors: {
          total: subprocessors?.length || 0,
          active: subprocessors?.filter(s => s.is_active).length || 0,
          high_risk: subprocessors?.filter(s => s.risk_level === "high").length || 0,
        },
        audit_requests: {
          total: auditRequests?.length || 0,
          pending: auditRequests?.filter(r => r.status === "pending").length || 0,
          in_progress: auditRequests?.filter(r => r.status === "in_progress").length || 0,
        },
        data_rules: {
          total: dataRules?.length || 0,
          tables_covered: uniqueTables.size,
        },
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      title: "Legal Agreements",
      description: "Manage DPAs, BAAs, and other legal documents with e-signature workflow",
      icon: FileText,
      stats: [
        { label: "Total Agreements", value: stats.agreements.total },
        { label: "Active", value: stats.agreements.active, color: "text-green-500" },
        { label: "Pending Signature", value: stats.agreements.pending, color: "text-yellow-500" },
      ],
      path: "/compliance/legal-agreements",
      color: "bg-blue-500/10 border-blue-500/20",
      iconColor: "text-blue-500",
    },
    {
      title: "Subprocessors",
      description: "Public vendor registry with certifications and data location transparency",
      icon: Shield,
      stats: [
        { label: "Total Vendors", value: stats.subprocessors.total },
        { label: "Active", value: stats.subprocessors.active, color: "text-green-500" },
        { label: "High Risk", value: stats.subprocessors.high_risk, color: "text-red-500" },
      ],
      path: "/compliance/subprocessors",
      color: "bg-purple-500/10 border-purple-500/20",
      iconColor: "text-purple-500",
    },
    {
      title: "Data Classification",
      description: "Field-level sensitivity tagging and data governance rules",
      icon: Database,
      stats: [
        { label: "Total Rules", value: stats.data_rules.total },
        { label: "Tables Covered", value: stats.data_rules.tables_covered },
      ],
      path: "/compliance/data-classification",
      color: "bg-green-500/10 border-green-500/20",
      iconColor: "text-green-500",
    },
    {
      title: "Audit Requests",
      description: "Customer audit request management with document portal",
      icon: Search,
      stats: [
        { label: "Total Requests", value: stats.audit_requests.total },
        { label: "Pending", value: stats.audit_requests.pending, color: "text-yellow-500" },
        { label: "In Progress", value: stats.audit_requests.in_progress, color: "text-blue-500" },
      ],
      path: "/compliance/audit-requests",
      color: "bg-orange-500/10 border-orange-500/20",
      iconColor: "text-orange-500",
    },
  ];

  const complianceScore = Math.round(
    ((stats.agreements.active / Math.max(stats.agreements.total, 1)) * 25) +
    ((stats.subprocessors.active / Math.max(stats.subprocessors.total, 1)) * 25) +
    ((stats.data_rules.tables_covered / Math.max(stats.data_rules.tables_covered, 1)) * 25) +
    (((stats.audit_requests.total - stats.audit_requests.pending) / Math.max(stats.audit_requests.total, 1)) * 25)
  );

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Compliance & Legal</h1>
            <p className="text-muted-foreground mt-1">
              Enterprise-grade compliance infrastructure and legal document management
            </p>
          </div>
        </div>

        {/* Overall Compliance Score */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Overall Compliance Score</CardTitle>
                <CardDescription>Based on agreement status, vendor risk, data governance, and audit responsiveness</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold text-foreground">{complianceScore}%</div>
                {complianceScore >= 75 ? (
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                ) : complianceScore >= 50 ? (
                  <Clock className="h-12 w-12 text-yellow-500" />
                ) : (
                  <AlertCircle className="h-12 w-12 text-red-500" />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-secondary rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-500"
                style={{ width: `${complianceScore}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Compliance Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.title} className={`border-2 ${module.color} hover:shadow-lg transition-all`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-6 w-6 ${module.iconColor}`} />
                        <CardTitle className="text-xl">{module.title}</CardTitle>
                      </div>
                      <CardDescription className="text-sm">{module.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {module.stats.map((stat, idx) => (
                      <div key={idx} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color || "text-foreground"}`}>
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => navigate(module.path)}
                  >
                    Manage {module.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" onClick={() => navigate("/compliance/legal-agreements")}>
                Create DPA
              </Button>
              <Button variant="outline" onClick={() => navigate("/compliance/subprocessors")}>
                Add Subprocessor
              </Button>
              <Button variant="outline" onClick={() => navigate("/compliance/data-classification")}>
                Classify Data
              </Button>
              <Button variant="outline" onClick={() => navigate("/compliance/audit-requests")}>
                New Audit Request
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
