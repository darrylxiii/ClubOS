import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerContracts } from "@/hooks/usePartnerContracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ContractCard } from "@/components/contracts/ContractCard";
import { ContractBudgetDashboard } from "@/components/partner/ContractBudgetDashboard";
import { ChangeOrdersPanel } from "@/components/partner/ChangeOrdersPanel";
import { ContractDeadlineAlerts } from "@/components/partner/ContractDeadlineAlerts";
import { 
  FileText, 
  Search, 
  Plus,
  Loader2,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import { PartnerPageHeader } from "@/components/partner/PartnerPageHeader";
import { PartnerInlineStats } from "@/components/partner/PartnerInlineStats";
import { PartnerGlassCard } from "@/components/partner/PartnerGlassCard";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PartnerContractsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("contracts");

  const { data: profile } = useQuery({
    queryKey: ['profile-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id
  });

  const { 
    contracts, invoices, changeOrders, alerts, budgetStats, isLoading 
  } = usePartnerContracts(profile?.company_id);

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = searchQuery === "" || 
      contract.project_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      contract.contract_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PartnerPageHeader
        title="Contract Management"
        subtitle="Manage freelance contracts, payments, and change orders"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search contracts..."
        actions={
          <Button onClick={() => navigate('/partner/contracts/new')} size="sm" className="gap-1.5 h-9">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Contract</span>
          </Button>
        }
      />

      {alerts.length > 0 && (
        <ContractDeadlineAlerts alerts={alerts} className="mb-0" />
      )}

      <PartnerInlineStats
        stats={[
          { value: budgetStats.totalBudget, label: 'Total Budget', icon: DollarSign, format: (v) => formatCurrency(v), highlight: true },
          { value: budgetStats.totalPaid, label: 'Total Paid', icon: TrendingUp, format: (v) => formatCurrency(v) },
          { value: budgetStats.pendingPayments, label: 'Pending', icon: Clock, format: (v) => formatCurrency(v) },
          { value: budgetStats.activeContracts, label: 'Active', icon: FileText },
          { value: budgetStats.pendingApprovals, label: 'Approvals', icon: AlertTriangle },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-card/30 backdrop-blur-sm border border-border/20">
          <TabsTrigger value="contracts">
            Contracts
            <Badge variant="secondary" className="ml-2">{contracts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="budget">Budget & Spend</TabsTrigger>
          <TabsTrigger value="change-orders">
            Change Orders
            {changeOrders.filter(co => co.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {changeOrders.filter(co => co.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices
            <Badge variant="secondary" className="ml-2">{invoices.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contracts">
          <div className="flex items-center gap-4 mb-6">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="bg-card/30 backdrop-blur-sm border border-border/20">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending_signature">Pending</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContracts.length === 0 ? (
            <PartnerGlassCard className="border-dashed">
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {contracts.length === 0 ? 'No contracts yet' : 'No contracts match your filters'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  Create your first contract to start hiring freelancers
                </p>
                <Button onClick={() => navigate('/partner/contracts/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Contract
                </Button>
              </div>
            </PartnerGlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredContracts.map((contract) => (
                <ContractCard key={contract.id} contract={contract} view="client" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="budget">
          <ContractBudgetDashboard contracts={contracts} invoices={invoices} />
        </TabsContent>

        <TabsContent value="change-orders">
          <ChangeOrdersPanel changeOrders={changeOrders} contracts={contracts} />
        </TabsContent>

        <TabsContent value="invoices">
          <PartnerGlassCard title="Contract Invoices">
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invoices generated yet
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div 
                    key={invoice.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-card/20 border border-border/10"
                  >
                    <div>
                      <div className="font-medium">{invoice.invoice_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold tabular-nums">{formatCurrency(invoice.total_amount)}</div>
                        <Badge variant={
                          invoice.status === 'paid' ? 'default' :
                          invoice.status === 'overdue' ? 'destructive' :
                          'secondary'
                        }>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PartnerGlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
