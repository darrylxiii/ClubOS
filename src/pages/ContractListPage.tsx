import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContractCard } from "@/components/contracts/ContractCard";
import { ProjectContract } from "@/types/projects";
import { 
  FileText, 
  Search, 
  Plus,
  Loader2
} from "lucide-react";

export default function ContractListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Determine user view
  const [userView, setUserView] = useState<'freelancer' | 'client'>('freelancer');

  // Fetch contracts
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', user?.id, userView],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('project_contracts')
        .select('*');

      if (userView === 'freelancer') {
        query = query.eq('freelancer_id', user.id);
      } else {
        // Client view - get contracts for user's company
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (profile?.company_id) {
          query = query.eq('company_id', profile.company_id);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectContract[];
    },
    enabled: !!user?.id
  });

  // Filter contracts
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = searchQuery === "" || 
      contract.project_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      contract.contract_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeContracts = filteredContracts.filter(c => c.contract_status === 'active');
  const pendingContracts = filteredContracts.filter(c => c.contract_status === 'pending_signature');
  const completedContracts = filteredContracts.filter(c => c.contract_status === 'completed');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-8 w-8" />
              My Contracts
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your freelance project contracts and payments
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Tabs value={userView} onValueChange={(v) => setUserView(v as any)}>
              <TabsList>
                <TabsTrigger value="freelancer">As Freelancer</TabsTrigger>
                <TabsTrigger value="client">As Client</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{contracts.length}</div>
            <div className="text-sm text-muted-foreground">Total Contracts</div>
          </div>
          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{activeContracts.length}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{pendingContracts.length}</div>
            <div className="text-sm text-muted-foreground">Pending Signature</div>
          </div>
          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{completedContracts.length}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
        </div>

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
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {contracts.length === 0 ? 'No contracts yet' : 'No contracts match your filters'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {userView === 'freelancer' 
                ? 'Start applying to projects to create your first contract'
                : 'Post your first project to hire freelancers'
              }
            </p>
            <Button onClick={() => navigate('/projects')}>
              Browse Projects
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredContracts.map((contract) => (
              <ContractCard 
                key={contract.id} 
                contract={contract}
                view={userView}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
