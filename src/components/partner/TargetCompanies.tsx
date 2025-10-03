import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Building2, TrendingUp, CheckCircle2, Pause, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TargetCompanyDialog } from "./TargetCompanyDialog";
import { TargetCompanyTable } from "./TargetCompanyTable";

interface TargetCompany {
  id: string;
  name: string;
  status: string;
  industry: string | null;
  priority: number | null;
  job_id: string | null;
  votes: number;
  company_insider: string | null;
  location: string | null;
  logo_url: string | null;
  website_url: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  profiles?: { full_name: string | null };
  jobs?: { title: string; status: string };
  target_company_votes?: Array<{ user_id: string; profiles?: { full_name: string | null } }>;
  target_company_comments?: Array<{ 
    id: string;
    comment: string;
    created_at: string;
    user_id: string;
    profiles?: { full_name: string | null };
  }>;
}

interface TargetCompaniesProps {
  companyId: string;
}

export function TargetCompanies({ companyId }: TargetCompaniesProps) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<TargetCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<TargetCompany | null>(null);
  const [activeView, setActiveView] = useState("all");

  useEffect(() => {
    loadTargetCompanies();
  }, [companyId]);

  const loadTargetCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("target_companies")
        .select(`
          *,
          jobs(title, status),
          target_company_votes(
            user_id
          ),
          target_company_comments(
            id,
            comment,
            created_at,
            user_id
          )
        `)
        .eq("company_id", companyId)
        .order("priority", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch creator profiles separately
      const creatorIds = [...new Set(data?.map(c => c.created_by) || [])];
      const voterIds = [...new Set(
        data?.flatMap(c => c.target_company_votes?.map((v: any) => v.user_id) || []) || []
      )];
      const commenterIds = [...new Set(
        data?.flatMap(c => c.target_company_comments?.map((cm: any) => cm.user_id) || []) || []
      )];
      const allUserIds = [...new Set([...creatorIds, ...voterIds, ...commenterIds])];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allUserIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Enrich data with profiles
      const enrichedData = data?.map(company => ({
        ...company,
        profiles: profilesMap.get(company.created_by),
        target_company_votes: company.target_company_votes?.map((vote: any) => ({
          ...vote,
          profiles: profilesMap.get(vote.user_id)
        })),
        target_company_comments: company.target_company_comments?.map((comment: any) => ({
          ...comment,
          profiles: profilesMap.get(comment.user_id)
        }))
      }));

      setCompanies(enrichedData || []);
    } catch (error) {
      console.error("Error loading target companies:", error);
      toast.error("Fout bij laden van target bedrijven");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = () => {
    setSelectedCompany(null);
    setDialogOpen(true);
  };

  const handleEditCompany = (company: TargetCompany) => {
    setSelectedCompany(company);
    setDialogOpen(true);
  };

  const handleDeleteCompany = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from("target_companies")
        .delete()
        .eq("id", companyId);

      if (error) throw error;
      
      toast.success("Bedrijf verwijderd");
      loadTargetCompanies();
    } catch (error) {
      console.error("Error deleting company:", error);
      toast.error("Fout bij verwijderen van bedrijf");
    }
  };

  const handleVote = async (targetCompanyId: string, hasVoted: boolean) => {
    if (!user) return;

    try {
      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from("target_company_votes")
          .delete()
          .eq("target_company_id", targetCompanyId)
          .eq("user_id", user.id);

        if (error) throw error;

        // Update vote count
        const company = companies.find(c => c.id === targetCompanyId);
        if (company) {
          await supabase
            .from("target_companies")
            .update({ votes: Math.max(0, company.votes - 1) })
            .eq("id", targetCompanyId);
        }
      } else {
        // Add vote
        const { error } = await supabase
          .from("target_company_votes")
          .insert({ target_company_id: targetCompanyId, user_id: user.id });

        if (error) throw error;

        // Update vote count
        const company = companies.find(c => c.id === targetCompanyId);
        if (company) {
          await supabase
            .from("target_companies")
            .update({ votes: company.votes + 1 })
            .eq("id", targetCompanyId);
        }
      }

      loadTargetCompanies();
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Fout bij stemmen");
    }
  };

  const getFilteredCompanies = () => {
    switch (activeView) {
      case "status":
        return companies.slice().sort((a, b) => a.status.localeCompare(b.status));
      case "industry":
        return companies.slice().sort((a, b) => 
          (a.industry || "").localeCompare(b.industry || "")
        );
      case "done":
        return companies.filter(c => c.status === "done");
      case "own":
        return companies.filter(c => c.created_by === user?.id);
      default:
        return companies;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "new": return <Building2 className="h-4 w-4" />;
      case "targetting": return <Target className="h-4 w-4" />;
      case "paused": return <Pause className="h-4 w-4" />;
      case "done": return <CheckCircle2 className="h-4 w-4" />;
      case "hunting": return <TrendingUp className="h-4 w-4" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  const stats = {
    total: companies.length,
    new: companies.filter(c => c.status === "new").length,
    targetting: companies.filter(c => c.status === "targetting").length,
    done: companies.filter(c => c.status === "done").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Target Bedrijven</h2>
          <p className="text-muted-foreground">
            Beheer bedrijven voor headhunting kandidaten
          </p>
        </div>
        <Button onClick={handleCreateCompany}>
          <Plus className="mr-2 h-4 w-4" />
          Nieuw Bedrijf
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            Totaal
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            Nieuw
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.new}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Targetting
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.targetting}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Voltooid
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.done}</div>
        </div>
      </div>

      {/* Views Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Alle Bedrijven</TabsTrigger>
          <TabsTrigger value="status">Per Status</TabsTrigger>
          <TabsTrigger value="industry">Per Industrie</TabsTrigger>
          <TabsTrigger value="done">Voltooid</TabsTrigger>
          <TabsTrigger value="own">Mijn Bedrijven</TabsTrigger>
        </TabsList>

        <TabsContent value={activeView} className="mt-6">
          <TargetCompanyTable
            companies={getFilteredCompanies()}
            loading={loading}
            currentUserId={user?.id || ""}
            onEdit={handleEditCompany}
            onDelete={handleDeleteCompany}
            onVote={handleVote}
            onRefresh={loadTargetCompanies}
            getStatusIcon={getStatusIcon}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <TargetCompanyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={companyId}
        targetCompany={selectedCompany}
        onSuccess={() => {
          loadTargetCompanies();
          setDialogOpen(false);
        }}
      />
    </div>
  );
}