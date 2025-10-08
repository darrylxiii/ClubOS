import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Pencil, Trash2, Building2, TrendingUp, Users, Eye, ChevronDown, ExternalLink, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Company {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tagline: string | null;
  logo_url: string | null;
  website_url: string | null;
  industry: string | null;
  company_size: string | null;
  headquarters_location: string | null;
  membership_tier: string | null;
  is_active: boolean;
  created_at: string;
}

interface CompanyStats {
  company_id: string;
  total_jobs: number;
  total_applications: number;
  total_followers: number;
  profile_views: number;
  post_views: number;
}

interface OverallStats {
  total_companies: number;
  active_companies: number;
  total_jobs: number;
  total_applications: number;
  total_followers: number;
}

export function CompanyManagement() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyStats, setCompanyStats] = useState<Record<string, CompanyStats>>({});
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tagline: "",
    website_url: "",
    industry: "",
    company_size: "",
    headquarters_location: "",
    slug: "",
  });

  useEffect(() => {
    fetchCompanies();
    fetchOverallStats();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('is_active', { ascending: false })
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
      
      // Fetch stats for each company
      if (data) {
        fetchCompanyStats(data.map(c => c.id));
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyStats = async (companyIds: string[]) => {
    try {
      // Fetch jobs count
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('company_id')
        .in('company_id', companyIds);

      // Fetch applications count
      const { data: appsData } = await supabase
        .from('applications')
        .select('job_id, jobs!inner(company_id)')
        .in('jobs.company_id', companyIds);

      // Fetch followers count
      const { data: followersData } = await supabase
        .from('company_followers')
        .select('company_id')
        .in('company_id', companyIds);

      // Fetch analytics
      const { data: analyticsData } = await supabase
        .from('company_analytics')
        .select('company_id, profile_views, post_views')
        .in('company_id', companyIds);

      // Aggregate stats per company
      const stats: Record<string, CompanyStats> = {};
      
      companyIds.forEach(id => {
        const jobs = jobsData?.filter(j => j.company_id === id).length || 0;
        const apps = appsData?.filter((a: any) => a.jobs?.company_id === id).length || 0;
        const followers = followersData?.filter(f => f.company_id === id).length || 0;
        const analytics = analyticsData?.filter(a => a.company_id === id) || [];
        const profileViews = analytics.reduce((sum, a) => sum + (a.profile_views || 0), 0);
        const postViews = analytics.reduce((sum, a) => sum + (a.post_views || 0), 0);

        stats[id] = {
          company_id: id,
          total_jobs: jobs,
          total_applications: apps,
          total_followers: followers,
          profile_views: profileViews,
          post_views: postViews,
        };
      });

      setCompanyStats(stats);
    } catch (error) {
      console.error('Error fetching company stats:', error);
    }
  };

  const fetchOverallStats = async () => {
    try {
      const { count: totalCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      const { count: activeCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: totalJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });

      const { count: totalApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      const { count: totalFollowers } = await supabase
        .from('company_followers')
        .select('*', { count: 'exact', head: true });

      setOverallStats({
        total_companies: totalCompanies || 0,
        active_companies: activeCompanies || 0,
        total_jobs: totalJobs || 0,
        total_applications: totalApplications || 0,
        total_followers: totalFollowers || 0,
      });
    } catch (error) {
      console.error('Error fetching overall stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update({
            name: formData.name,
            tagline: formData.tagline || null,
            description: formData.description || null,
            website_url: formData.website_url || null,
            industry: formData.industry || null,
            company_size: formData.company_size || null,
            headquarters_location: formData.headquarters_location || null,
            slug,
          })
          .eq('id', editingCompany.id);

        if (error) throw error;
        toast.success("Company updated successfully");
      } else {
        const { error } = await supabase
          .from('companies')
          .insert({
            name: formData.name,
            tagline: formData.tagline || null,
            description: formData.description || null,
            website_url: formData.website_url || null,
            industry: formData.industry || null,
            company_size: formData.company_size || null,
            headquarters_location: formData.headquarters_location || null,
            slug,
          });

        if (error) throw error;
        toast.success("Company created successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchCompanies();
      fetchOverallStats();
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error("Failed to save company");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this company? This will also delete all associated jobs, applications, and posts.")) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Company deleted successfully");
      fetchCompanies();
      fetchOverallStats();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error("Failed to delete company");
    }
  };

  const toggleCompanyExpanded = (companyId: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      tagline: company.tagline || "",
      description: company.description || "",
      website_url: company.website_url || "",
      industry: company.industry || "",
      company_size: company.company_size || "",
      headquarters_location: company.headquarters_location || "",
      slug: company.slug,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCompany(null);
    setFormData({
      name: "",
      tagline: "",
      description: "",
      website_url: "",
      industry: "",
      company_size: "",
      headquarters_location: "",
      slug: "",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Companies</CardDescription>
              <CardTitle className="text-3xl">{overallStats.total_companies}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {overallStats.active_companies} active
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Jobs</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-primary" />
                {overallStats.total_jobs}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Applications</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                {overallStats.total_applications}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Followers</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                {overallStats.total_followers}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg per Company</CardDescription>
              <CardTitle className="text-3xl">
                {overallStats.total_companies > 0 
                  ? Math.round(overallStats.total_jobs / overallStats.total_companies)
                  : 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">jobs/company</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Company Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Partner Companies</CardTitle>
              <CardDescription>Manage your portfolio of member companies</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Company
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCompany ? 'Edit' : 'Create'} Company</DialogTitle>
                  <DialogDescription>
                    {editingCompany ? 'Update' : 'Add'} company information and details
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Company Name *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tagline">Tagline</Label>
                      <Input
                        id="tagline"
                        placeholder="One-line description"
                        value={formData.tagline}
                        onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Full Description</Label>
                      <Textarea
                        id="description"
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Input
                          id="industry"
                          placeholder="e.g., Technology"
                          value={formData.industry}
                          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company_size">Company Size</Label>
                        <Input
                          id="company_size"
                          placeholder="e.g., 50-200"
                          value={formData.company_size}
                          onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="headquarters_location">Headquarters</Label>
                      <Input
                        id="headquarters_location"
                        placeholder="e.g., Amsterdam, Netherlands"
                        value={formData.headquarters_location}
                        onChange={(e) => setFormData({ ...formData, headquarters_location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website_url">Website URL</Label>
                      <Input
                        id="website_url"
                        type="url"
                        placeholder="https://..."
                        value={formData.website_url}
                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">{editingCompany ? 'Update' : 'Create'} Company</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {companies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No companies yet. Create your first partner company!</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Company
              </Button>
            </div>
          ) : (
            companies.map((company) => {
              const stats = companyStats[company.id];
              const isExpanded = expandedCompanies.has(company.id);
              
              return (
                <Collapsible
                  key={company.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCompanyExpanded(company.id)}
                >
                  <Card className="border-2">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <Avatar className="w-12 h-12 border-2 border-border">
                              <AvatarImage src={company.logo_url || undefined} alt={company.name} />
                              <AvatarFallback className="font-black">
                                {company.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-xl">{company.name}</CardTitle>
                                {!company.is_active && (
                                  <Badge variant="outline">Inactive</Badge>
                                )}
                                {company.membership_tier === 'premium' && (
                                  <Badge>Premium</Badge>
                                )}
                              </div>
                              {company.tagline && (
                                <CardDescription>{company.tagline}</CardDescription>
                              )}
                              {company.industry && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {company.industry}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Quick Stats */}
                          {stats && (
                            <div className="flex items-center gap-4 text-sm">
                              <div className="text-center">
                                <div className="font-bold text-lg">{stats.total_jobs}</div>
                                <div className="text-xs text-muted-foreground">Jobs</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-lg">{stats.total_applications}</div>
                                <div className="text-xs text-muted-foreground">Apps</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-lg">{stats.total_followers}</div>
                                <div className="text-xs text-muted-foreground">Followers</div>
                              </div>
                            </div>
                          )}
                          
                          <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="border-t pt-4">
                        <div className="space-y-4">
                          {/* Detailed Stats */}
                          {stats && (
                            <div className="grid grid-cols-4 gap-4 pb-4 border-b">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Profile Views</div>
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4 text-primary" />
                                  <span className="font-semibold">{stats.profile_views.toLocaleString()}</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Post Views</div>
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4 text-primary" />
                                  <span className="font-semibold">{stats.post_views.toLocaleString()}</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Active Jobs</div>
                                <div className="flex items-center gap-2">
                                  <Briefcase className="w-4 h-4 text-primary" />
                                  <span className="font-semibold">{stats.total_jobs}</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Total Apps</div>
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-primary" />
                                  <span className="font-semibold">{stats.total_applications}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Company Details */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {company.headquarters_location && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Location</div>
                                <div>{company.headquarters_location}</div>
                              </div>
                            )}
                            {company.company_size && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Company Size</div>
                                <div>{company.company_size} employees</div>
                              </div>
                            )}
                            {company.website_url && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Website</div>
                                <a 
                                  href={company.website_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Visit <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/companies/${company.slug}`);
                              }}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Full Page
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(company);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(company.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
