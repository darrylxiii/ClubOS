import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target, TrendingUp, Clock, CheckCircle, Building } from "lucide-react";
import { TargetCompanyTable } from "@/components/partner/TargetCompanyTable";
import { TargetCompanyDialog } from "@/components/partner/TargetCompanyDialog";
import { useTargetCompanies } from "@/hooks/useTargetCompanies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const PartnerTargetCompanies = () => {
  const { currentRole: role, companyId } = useRole();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Record<string, any> | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(companyId);
  const [assignedCompanies, setAssignedCompanies] = useState<Record<string, any>[]>([]);
  
  const { companies, loading, loadTargetCompanies, handleDeleteCompany, handleVote } = useTargetCompanies(selectedCompanyId);

  // Load assigned companies for strategists
  useEffect(() => {
    const loadAssignedCompanies = async () => {
      if (role === 'strategist') {
        const authUser = await supabase.auth.getUser();
        if (!authUser.data.user?.id) return;
        const { data } = await supabase
          .from('company_members')
          .select('company_id, companies (id, name, logo_url)')
          .eq('user_id', authUser.data.user.id);
        
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

  const stats = [
    {
      label: "Total Targets",
      value: companies.length,
      icon: Target,
      color: "text-primary",
    },
    {
      label: "New",
      value: getFilteredCompanies("new").length,
      icon: Clock,
      color: "text-blue-500",
    },
    {
      label: "Targeting",
      value: getFilteredCompanies("targeting").length + getFilteredCompanies("hunting").length,
      icon: TrendingUp,
      color: "text-amber-500",
    },
    {
      label: "Completed",
      value: getFilteredCompanies("done").length,
      icon: CheckCircle,
      color: "text-green-500",
    },
  ];

  const currentCompanyName = role === 'strategist' && assignedCompanies.length > 0
    ? assignedCompanies.find(c => c.id === selectedCompanyId)?.name
    : null;

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
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Target Companies</h1>
          <p className="text-muted-foreground mt-1">
            {currentCompanyName ? `Managing targets for ${currentCompanyName}` : 'Manage your target companies for sourcing'}
          </p>
        </div>
        <Button onClick={handleCreateCompany} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Target Company
        </Button>
      </div>

      {/* Company Selector for Strategists */}
      {role === 'strategist' && assignedCompanies.length > 1 && (
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Select Company:</label>
            <Select value={selectedCompanyId || undefined} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-64">
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
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="p-6">
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
      </Card>

      {/* Dialog */}
      <TargetCompanyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        targetCompany={selectedCompany}
        companyId={selectedCompanyId || companyId || ''}
        onSuccess={loadTargetCompanies}
      />
      </div>
    </AppLayout>
  );
};

export default PartnerTargetCompanies;
