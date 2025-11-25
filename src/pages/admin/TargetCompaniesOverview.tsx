import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TargetCompanyDialog } from "@/components/partner/TargetCompanyDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Search, Target, TrendingUp, Users, Award } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

const TargetCompaniesOverview = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Record<string, any>[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [partnerCompanies, setPartnerCompanies] = useState<Record<string, any>[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Record<string, any> | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const loadTargetCompanies = () => {
    loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [companies, searchQuery, statusFilter, companyFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load target companies with enriched data
      const { data: targetData, error: targetError } = await supabase
        .from('target_companies')
        .select(`
          *,
          companies (id, name, logo_url),
          profiles (full_name, avatar_url),
          jobs (id, title)
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (targetError) throw targetError;

      // Get vote and comment counts
      const enrichedData = await Promise.all(
        (targetData || []).map(async (tc) => {
          const { count: voteCount } = await supabase
            .from('target_company_votes')
            .select('*', { count: 'exact', head: true })
            .eq('target_company_id', tc.id);

          const { count: commentCount } = await supabase
            .from('target_company_comments')
            .select('*', { count: 'exact', head: true })
            .eq('target_company_id', tc.id);

          const { count: contactCount } = await supabase
            .from('target_company_contacts')
            .select('*', { count: 'exact', head: true })
            .eq('target_company_id', tc.id);

          return {
            ...tc,
            vote_count: voteCount || 0,
            comment_count: commentCount || 0,
            contact_count: contactCount || 0,
          };
        })
      );

      setCompanies(enrichedData);

      // Load partner companies for filter
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name, logo_url')
        .order('name');

      setPartnerCompanies(companiesData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load target companies');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...companies];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (tc) =>
          tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tc.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (tc.companies as any)?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((tc) => tc.status === statusFilter);
    }

    // Company filter
    if (companyFilter !== "all") {
      filtered = filtered.filter((tc) => tc.company_id === companyFilter);
    }

    setFilteredCompanies(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      targeting: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      hunting: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      paused: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      done: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return colors[status] || colors.new;
  };

  const handleExportCSV = () => {
    const csv = [
      ["Company", "Target Name", "Industry", "Status", "Priority", "Votes", "Contacts", "Created By", "Created At"],
      ...filteredCompanies.map((tc) => [
        (tc.companies as any)?.name || '',
        tc.name,
        tc.industry || '',
        tc.status,
        tc.priority,
        tc.vote_count,
        tc.contact_count,
        (tc.profiles as any)?.full_name || '',
        new Date(tc.created_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `target-companies-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("CSV exported successfully");
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCompanies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCompanies.map((tc) => tc.id));
    }
  };

  const stats = [
    {
      label: "Total Targets",
      value: companies.length,
      icon: Target,
      color: "text-primary",
    },
    {
      label: "Active Companies",
      value: new Set(companies.map((tc) => tc.company_id)).size,
      icon: Users,
      color: "text-blue-500",
    },
    {
      label: "In Progress",
      value: companies.filter((tc) => ["targeting", "hunting"].includes(tc.status)).length,
      icon: TrendingUp,
      color: "text-amber-500",
    },
    {
      label: "Top Voted",
      value: Math.max(...companies.map((tc) => tc.vote_count || 0), 0),
      icon: Award,
      color: "text-green-500",
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Target Companies Overview</h1>
        <p className="text-muted-foreground mt-1">
          All target companies across all partners
        </p>
      </div>

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

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search target companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {partnerCompanies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="targeting">Targeting</SelectItem>
              <SelectItem value="hunting">Hunting</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === filteredCompanies.length && filteredCompanies.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Target Name</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Votes</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Created By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No target companies found
                </TableCell>
              </TableRow>
            ) : (
              filteredCompanies.map((tc) => (
                <TableRow key={tc.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(tc.id)}
                      onCheckedChange={() => toggleSelection(tc.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(tc.companies as any)?.logo_url && (
                        <img
                          src={(tc.companies as any).logo_url}
                          alt=""
                          className="h-6 w-6 rounded"
                        />
                      )}
                      <span className="font-medium">{(tc.companies as any)?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tc.logo_url && (
                        <img src={tc.logo_url} alt="" className="h-6 w-6 rounded" />
                      )}
                      {tc.name}
                    </div>
                  </TableCell>
                  <TableCell>{tc.industry || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(tc.status)}>
                      {tc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(tc.priority / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm">{tc.priority}</span>
                    </div>
                  </TableCell>
                  <TableCell>{tc.vote_count}</TableCell>
                  <TableCell>{tc.contact_count}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(tc.profiles as any)?.avatar_url && (
                        <img
                          src={(tc.profiles as any).avatar_url}
                          alt=""
                          className="h-6 w-6 rounded-full"
                        />
                      )}
                      <span className="text-sm">{(tc.profiles as any)?.full_name}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      
      {/* Dialog */}
      <TargetCompanyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        targetCompany={selectedCompany}
        companyId={selectedCompanyId || ''}
        onSuccess={loadTargetCompanies}
      />
      </div>
    </AppLayout>
  );
};

export default TargetCompaniesOverview;
