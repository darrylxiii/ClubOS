import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstantlyCSVImporter } from "@/components/crm/InstantlyCSVImporter";
import { CompanyEnrichment } from "@/components/crm/CompanyEnrichment";
import { EmailContactLookup } from "@/components/crm/EmailContactLookup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Sparkles, Mail, Plug, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";

const integrations = [
  {
    name: "Instantly.ai",
    description: "Import prospects from email campaigns",
    icon: FileSpreadsheet,
    status: "connected",
    tab: "instantly",
  },
  {
    name: "Company Enrichment",
    description: "Auto-fill company data from domains",
    icon: Sparkles,
    status: "available",
    tab: "enrichment",
  },
  {
    name: "Email Lookup",
    description: "Link inbox emails to prospects",
    icon: Mail,
    status: "available",
    tab: "email",
  },
];

export default function CRMIntegrations() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Plug className="h-6 w-6 text-primary" />
          CRM Integrations
        </h1>
        <p className="text-muted-foreground">
          Connect external tools and enrich your prospect data
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.name} className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <integration.icon className="h-8 w-8 text-primary" />
                <Badge 
                  variant="outline" 
                  className={integration.status === "connected" 
                    ? "bg-green-500/10 text-green-500" 
                    : "bg-muted"
                  }
                >
                  {integration.status === "connected" && (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  )}
                  {integration.status}
                </Badge>
              </div>
              <CardTitle className="text-lg">{integration.name}</CardTitle>
              <CardDescription>{integration.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="instantly" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="instantly" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            CSV Import
          </TabsTrigger>
          <TabsTrigger value="enrichment" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Enrichment
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Lookup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instantly" className="mt-6">
          <InstantlyCSVImporter />
        </TabsContent>

        <TabsContent value="enrichment" className="mt-6">
          <CompanyEnrichment />
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <EmailContactLookup />
        </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  </AppLayout>
  );
}
