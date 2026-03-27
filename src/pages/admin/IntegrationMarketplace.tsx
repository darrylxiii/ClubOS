import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Puzzle, Search, CheckCircle, ExternalLink, Settings, Zap } from "lucide-react";
import { toast } from "sonner";

interface Integration {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  auth_type: string;
  is_featured: boolean;
  is_available: boolean;
  documentation_url: string;
}

interface Installation {
  id: string;
  catalog_id: string;
  is_active: boolean;
  status: string;
  last_sync_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ats: "Applicant Tracking", hris: "HRIS", job_boards: "Job Boards",
  background_checks: "Background Checks", communication: "Communication",
  calendar: "Calendar", assessment: "Assessment", analytics: "Analytics",
  accounting: "Accounting", productivity: "Productivity", custom: "Custom",
};

export default function IntegrationMarketplace() {
  const { t } = useTranslation('admin');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [catRes, instRes] = await Promise.all([
      supabase.from("integration_catalog").select("*").order("is_featured", { ascending: false }),
      supabase.from("integration_installations").select("*"),
    ]);
    if (catRes.data) setIntegrations(catRes.data);
    if (instRes.data) setInstallations(instRes.data);
    setLoading(false);
  };

  const isInstalled = (id: string) => installations.some(i => i.catalog_id === id && i.is_active);
  const categories = [...new Set(integrations.map(i => i.category))];

  const filtered = integrations.filter(i => {
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const installIntegration = async (id: string) => {
    const { error } = await supabase.from("integration_installations").insert({
      catalog_id: id, is_active: true, status: "configured",
    });
    if (!error) { toast.success('Integration installed'); fetchData(); }
  };

  const installed = installations.filter(i => i.is_active).length;

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Puzzle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{'INTEGRATION MARKETPLACE'}</h1>
          </div>
          <p className="text-muted-foreground">{'Browse, install, and configure integrations for your tech stack'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>{t('integrationMarketplace.text1')}</CardDescription><CardTitle className="text-2xl">{integrations.length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t('integrationMarketplace.text2')}</CardDescription><CardTitle className="text-2xl text-green-600">{installed}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t('integrationMarketplace.text3')}</CardDescription><CardTitle className="text-2xl">{categories.length}</CardTitle></CardHeader></Card>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={'Search integrations...'} className="pl-10" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder={'All Categories'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{'All Categories'}</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(integration => {
            const connected = isInstalled(integration.id);
            return (
              <Card key={integration.id} className={connected ? "border-green-500/50" : integration.is_featured ? "border-primary/30" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Puzzle className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">{CATEGORY_LABELS[integration.category] || integration.category}</Badge>
                      </div>
                    </div>
                    {integration.is_featured && <Badge className="bg-amber-500">{t('integrationMarketplace.text4')}</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">{integration.auth_type || "API Key"}</Badge>
                    {connected ? (
                      <Button size="sm" variant="outline"><Settings className="h-3 w-3 mr-1" />{t('integrationMarketplace.text5')}</Button>
                    ) : integration.is_available ? (
                      <Button size="sm" onClick={() => installIntegration(integration.id)}>
                        <Zap className="h-3 w-3 mr-1" />Install
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" disabled>{'Coming Soon'}</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </RoleGate>
  );
}
