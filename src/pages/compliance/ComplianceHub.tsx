import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, Users, Database, ClipboardList, ExternalLink } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * ComplianceHub - Unified compliance management page
 * Provides navigation to all compliance features in one place
 * 
 * Future: Will embed content directly instead of linking
 */
export default function ComplianceHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "dashboard";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const sections = [
    {
      id: "dashboard",
      title: "Compliance Dashboard",
      description: "Overview of your compliance posture, agreements, and audit status",
      icon: Shield,
      color: "text-primary"
    },
    {
      id: "legal",
      title: "Legal Agreements",
      description: "Manage NDAs, DPAs, and other legal contracts with partners",
      icon: FileText,
      color: "text-blue-500"
    },
    {
      id: "subprocessors",
      title: "Subprocessors",
      description: "Track third-party data processors and their compliance status",
      icon: Users,
      color: "text-orange-500"
    },
    {
      id: "classification",
      title: "Data Classification",
      description: "Configure data sensitivity rules and access controls",
      icon: Database,
      color: "text-purple-500"
    },
    {
      id: "audits",
      title: "Audit Requests",
      description: "Manage compliance audits and documentation requests",
      icon: ClipboardList,
      color: "text-green-500"
    }
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Compliance Center
          </h1>
          <p className="text-muted-foreground mt-2">
            Unified compliance management - legal agreements, data processing, and audits
          </p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => (
            <Card 
              key={section.id} 
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => handleTabChange(section.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <section.icon className={`h-5 w-5 ${section.color}`} />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Information */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Compliance Hub</strong> consolidates all compliance-related features. 
              Click any card above to access the specific section. Previously separate pages 
              (Dashboard, Legal Agreements, Subprocessors, Data Classification, Audit Requests) 
              are now accessible from this unified interface.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
