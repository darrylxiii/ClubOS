import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Target, TrendingUp, Clock, CheckCircle, Building } from "lucide-react";
import { TargetCompanyTable } from "@/components/partner/TargetCompanyTable";
import { TargetCompanyDialog } from "@/components/partner/TargetCompanyDialog";
import { useTargetCompanies } from "@/hooks/useTargetCompanies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { PartnerInlineStats } from "@/components/partner/PartnerInlineStats";
import { PartnerGlassCard } from "@/components/partner/PartnerGlassCard";

const PartnerTargetCompanies = () => {
  const { currentRole: role, companyId } = useRole();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Record<string, any> | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(companyId);
  const [assignedCompanies, setAssignedCompanies] = useState<Record<string, any>[]>([]);
  
  const { companies, loading, loadTargetCompanies, handleDeleteCompany, handleVote } = useTargetCompanies(selectedCompanyId);

  useEffect(() => {
    const loadAssignedCompanies = async () => {
      if (role === 'strategist') {
        const { data } = await supabase
          .from('company_members')
          .select('company_id, companies (id, name, logo_url)')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        if (data) {
          const companies = data.map(cm => (cm as any).companies).filter(Boolean);
          setAssignedCompanies(companies);
          if (companies.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(companies[0].id);
          }
        }
      }
    };
    loadAssignedCompanies();
  }, [role, selectedCompanyId, setAssignedCompanies, setSelectedCompanyId]);

  const handleCreateCompany = () => {
    setSelectedCompany(null);
    setDialogOpen(true);
  };

  const handleEditCompany = (company: any) => {
    setSelectedCompany(company);
    setDialogOpen(true);
  };

  const getFilteredCompanies = (status?: string) => {
    if (!status) return companies;
    return companies.filter((c) => c.status === status);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="h-4 w-4" />;
      case 'targeting': return <Target className="h-4 w-4" />;
      case 'hunting': return <TrendingUp className="h-4 w-4" />;
      case 'done': return <CheckCircle className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={handleCreateCompany} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Target Company
        </Button>
      </div>

      {/* Company Selector for Strategists */}
      {role === 'strategist' && assignedCompanies.length > 1 && (
        <PartnerGlassCard>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Select Company:</label>
            <Select value={selectedCompanyId || undefined} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-64 bg-card/50 border-border/30">
                <SelectValue placeholder="Choose a company" />
              </SelectTrigger>
              <SelectContent>
                {assignedCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <div className="flex items-center gap-2">
                      {company.logo_url && (
                        <img src={company.logo_url} alt="" className="h-4 w-4 rounded" />
                      )}
                      {company.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PartnerGlassCard>
      )}

      <PartnerInlineStats
        stats={[
          { value: companies.length, label: 'Total Targets', icon: Target, highlight: true },
          { value: getFilteredCompanies("new").length, label: 'New', icon: Clock },
          { value: getFilteredCompanies("targeting").length + getFilteredCompanies("hunting").length, label: 'Targeting', icon: TrendingUp },
          { value: getFilteredCompanies("done").length, label: 'Completed', icon: CheckCircle },
        ]}
      />

      <PartnerGlassCard>
        <TargetCompanyTable
          companies={companies as any}
          loading={loading}
          currentUserId={user?.id || ''}
          onEdit={handleEditCompany}
          onDelete={handleDeleteCompany}
          onVote={handleVote}
          onRefresh={loadTargetCompanies}
          getStatusIcon={getStatusIcon}
        />
      </PartnerGlassCard>

      <TargetCompanyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        targetCompany={selectedCompany}
        companyId={selectedCompanyId || companyId || ''}
        onSuccess={loadTargetCompanies}
      />
    </div>
  );
};

export default PartnerTargetCompanies;
