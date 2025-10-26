import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Users, Briefcase, Search, ExternalLink, Ban, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

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
}

const CompanyManagement = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      // Fetch companies with job and member counts
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      // Fetch job counts per company
      const { data: jobCounts } = await supabase
        .from('jobs')
        .select('company_id')
        .eq('status', 'published');

      // Fetch member counts per company
      const { data: memberCounts } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('is_active', true);

      // Aggregate counts
      const jobCountMap = (jobCounts || []).reduce((acc, job) => {
        acc[job.company_id] = (acc[job.company_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const memberCountMap = (memberCounts || []).reduce((acc, member) => {
        acc[member.company_id] = (acc[member.company_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const enrichedCompanies = (companiesData || []).map(company => ({
        ...company,
        active_jobs_count: jobCountMap[company.id] || 0,
        total_members: memberCountMap[company.id] || 0,
        is_active: true, // Companies don't have an active status in current schema
      }));

      setCompanies(enrichedCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (companyId: string, currentStatus: boolean) => {
    // Note: This is a placeholder since companies don't have an is_active field yet
    // You'd need to add this field via migration
    toast.info('Company status management coming soon');
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
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

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{companies.length}</p>
                <p className="text-sm text-muted-foreground">Total Companies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {companies.reduce((sum, c) => sum + c.active_jobs_count, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {companies.reduce((sum, c) => sum + c.total_members, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companies List */}
      <div className="space-y-4">
        {filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No companies found
            </CardContent>
          </Card>
        ) : (
          filteredCompanies.map((company) => (
            <Card key={company.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={company.logo_url || undefined} />
                      <AvatarFallback>
                        {company.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {company.name}
                        {company.is_active && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle className="h-3 w-3" /> Active
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Member since {new Date(company.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/company/${company.slug}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(company.id, company.is_active)}
                    >
                      {company.is_active ? (
                        <>
                          <Ban className="h-4 w-4 mr-2" />
                          Suspend
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span>{company.active_jobs_count} active jobs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{company.total_members} members</span>
                  </div>
                  {company.website_url && (
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Website
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CompanyManagement;
