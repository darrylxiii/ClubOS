import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Users, Briefcase, Search, ExternalLink, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanyStatusBadge } from "@/components/admin/companies/CompanyStatusBadge";
import { CompanyRowActions } from "@/components/admin/companies/CompanyRowActions";
import { ArchiveCompanyDialog } from "@/components/admin/companies/ArchiveCompanyDialog";
import { DeleteCompanyDialog } from "@/components/admin/companies/DeleteCompanyDialog";
import { CompanyMembersManager } from "@/components/admin/companies/CompanyMembersManager";
import { CompanyFeeConfigDialog } from "@/components/financial/CompanyFeeConfigDialog";
import { EditCompanyDialog } from "@/components/companies/EditCompanyDialog";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  website_url: string | null;
  active_jobs_count: number;
  total_members: number;
  is_active: boolean;
  archived_at: string | null;
  fee_type: string | null;
  placement_fee_percentage: number | null;
  placement_fee_fixed: number | null;
  default_fee_notes: string | null;
}

type StatusFilter = "all" | "active" | "suspended" | "archived";

const CompanyManagement = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  // Dialog states
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (companiesError) throw companiesError;

      const { data: jobCounts } = await supabase
        .from("jobs")
        .select("company_id")
        .eq("status", "published");

      const { data: memberCounts } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("is_active", true);

      const jobCountMap = (jobCounts || []).reduce((acc, job) => {
        acc[job.company_id] = (acc[job.company_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const memberCountMap = (memberCounts || []).reduce((acc, member) => {
        acc[member.company_id] = (acc[member.company_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const enrichedCompanies = (companiesData || []).map((company) => ({
        ...company,
        active_jobs_count: jobCountMap[company.id] || 0,
        total_members: memberCountMap[company.id] || 0,
      }));

      setCompanies(enrichedCompanies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "archived") return matchesSearch && !!company.archived_at;
    if (statusFilter === "suspended") return matchesSearch && !company.archived_at && !company.is_active;
    if (statusFilter === "active") return matchesSearch && !company.archived_at && company.is_active;
    
    return matchesSearch;
  });

  const stats = {
    total: companies.length,
    active: companies.filter((c) => c.is_active && !c.archived_at).length,
    suspended: companies.filter((c) => !c.is_active && !c.archived_at).length,
    archived: companies.filter((c) => !!c.archived_at).length,
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Company Management</h1>
        <p className="text-muted-foreground">
          View and manage all partner companies on the platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Building2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.suspended}</p>
                <p className="text-xs text-muted-foreground">Suspended</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.archived}</p>
                <p className="text-xs text-muted-foreground">Archived</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Companies List */}
      <div className="space-y-3">
        {filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No companies found
            </CardContent>
          </Card>
        ) : (
          filteredCompanies.map((company) => (
            <Card
              key={company.id}
              className={company.archived_at ? "opacity-60" : ""}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={company.logo_url || undefined} />
                      <AvatarFallback>
                        {company.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{company.name}</span>
                        <CompanyStatusBadge
                          isActive={company.is_active}
                          isArchived={!!company.archived_at}
                        />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {company.active_jobs_count} jobs
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {company.total_members} members
                        </span>
                        {company.website_url && (
                          <a
                            href={company.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <CompanyRowActions
                    company={company}
                    onEdit={() => {
                      setSelectedCompany(company);
                      setEditDialogOpen(true);
                    }}
                    onConfigureFees={() => {
                      setSelectedCompany(company);
                      setFeeDialogOpen(true);
                    }}
                    onManageMembers={() => {
                      setSelectedCompany(company);
                      setMembersDialogOpen(true);
                    }}
                    onArchive={() => {
                      setSelectedCompany(company);
                      setArchiveDialogOpen(true);
                    }}
                    onDelete={() => {
                      setSelectedCompany(company);
                      setDeleteDialogOpen(true);
                    }}
                    onRefresh={fetchCompanies}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      {selectedCompany && (
        <>
          <EditCompanyDialog
            companyId={selectedCompany.id}
            open={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
            onSuccess={() => {
              fetchCompanies();
              setEditDialogOpen(false);
            }}
          />
          <CompanyFeeConfigDialog
            open={feeDialogOpen}
            onOpenChange={setFeeDialogOpen}
            company={selectedCompany}
          />
          <CompanyMembersManager
            open={membersDialogOpen}
            onOpenChange={setMembersDialogOpen}
            companyId={selectedCompany.id}
            companyName={selectedCompany.name}
          />
          <ArchiveCompanyDialog
            open={archiveDialogOpen}
            onOpenChange={setArchiveDialogOpen}
            companyId={selectedCompany.id}
            companyName={selectedCompany.name}
            onSuccess={fetchCompanies}
          />
          <DeleteCompanyDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            companyId={selectedCompany.id}
            companyName={selectedCompany.name}
            onSuccess={fetchCompanies}
          />
        </>
      )}
    </div>
  );
};

export default CompanyManagement;
