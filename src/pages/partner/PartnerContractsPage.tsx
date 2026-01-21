import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerContracts } from "@/hooks/usePartnerContracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function PartnerContractsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("contracts");

  // Fetch user's company
  const { data: profile } = useQuery({
    queryKey: ['profile-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  const { 
    contracts, 
    invoices, 
    changeOrders, 
    alerts,
    budgetStats,
    isLoading 
  } = usePartnerContracts(profile?.company_id);

  // Filter contracts
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Contract Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage freelance contracts, payments, and change orders
            </p>
          </div>

          <Button onClick={() => navigate('/partner/contracts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Contract
          </Button>
        </div>

        {/* Deadline Alerts */}
        {alerts.length > 0 && (
          <ContractDeadlineAlerts alerts={alerts} className="mb-6" />
        )}

        {/* Budget Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Budget</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(budgetStats.totalBudget)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Total Paid</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(budgetStats.totalPaid)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(budgetStats.pendingPayments)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {budgetStats.activeContracts}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Pending Approvals</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {budgetStats.pendingApprovals}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="contracts">
              Contracts
              <Badge variant="secondary" className="ml-2">
                {contracts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="budget">
              Budget & Spend
            </TabsTrigger>
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
              <Badge variant="secondary" className="ml-2">
                {invoices.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contracts">
            {/* Search and filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contracts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending_signature">Pending</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Contract list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredContracts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
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
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredContracts.map((contract) => (
                  <ContractCard 
                    key={contract.id} 
                    contract={contract}
                    view="client"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="budget">
            <ContractBudgetDashboard 
              contracts={contracts}
              invoices={invoices}
            />
          </TabsContent>

          <TabsContent value="change-orders">
            <ChangeOrdersPanel 
              changeOrders={changeOrders}
              contracts={contracts}
            />
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Contract Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No invoices generated yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div 
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{invoice.invoice_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(invoice.total_amount)}</div>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
