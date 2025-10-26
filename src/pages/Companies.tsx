import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Users, Search, ChevronDown, TrendingUp, Briefcase, Eye, ExternalLink, Heart, Filter, BarChart3, Globe, Linkedin, Calendar, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CompanyMembersDialog } from "@/components/companies/CompanyMembersDialog";
import { CompanyMembersStack } from "@/components/companies/CompanyMembersStack";
import { CompanyActivityPreview } from "@/components/companies/CompanyActivityPreview";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { useRole } from "@/contexts/RoleContext";
interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  tagline: string | null;
  description: string | null;
  industry: string | null;
  headquarters_location: string | null;
  company_size: string | null;
  membership_tier: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  founded_year: number | null;
  is_active: boolean;
  member_since: string | null;
}
interface CompanyMetrics {
  company_id: string;
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  total_followers: number;
  profile_views: number;
  post_views: number;
  recent_activity: string | null;
}
interface OverallMetrics {
  total_companies: number;
  active_companies: number;
  total_jobs: number;
  total_applications: number;
  avg_apps_per_company: number;
}
export default function Companies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentRole
  } = useRole();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyMetrics, setCompanyMetrics] = useState<Record<string, CompanyMetrics>>({});
  const [companyMembers, setCompanyMembers] = useState<Record<string, number>>({});
  const [overallMetrics, setOverallMetrics] = useState<OverallMetrics | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [partnerCompany, setPartnerCompany] = useState<Company | null>(null);
  
  const isAdmin = currentRole === 'admin';
  const isPartner = currentRole === 'partner';
  
  useEffect(() => {
    if (isPartner && user) {
      loadPartnerCompany();
    } else {
      loadCompanies();
      loadOverallMetrics();
    }
  }, [isPartner, user]);
  const loadPartnerCompany = async () => {
    if (!user) return;
    
    try {
      // Get partner's company from company_members
      const { data: memberData, error: memberError } = await supabase
        .from('company_members')
        .select('company_id, companies(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (memberError) throw memberError;
      
      if (memberData?.companies) {
        setPartnerCompany(memberData.companies as any);
      }
    } catch (error) {
      console.error("Error loading partner company:", error);
      toast.error("Failed to load your company");
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("companies").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      setCompanies(data || []);
      if (data) {
        await loadCompanyMetrics(data.map(c => c.id));
        await loadCompanyMembers(data.map(c => c.id));
      }
    } catch (error) {
      console.error("Error loading companies:", error);
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };
  const loadCompanyMembers = async (companyIds: string[]) => {
    try {
      const {
        data,
        error
      } = await supabase.from('company_members').select('company_id').in('company_id', companyIds).eq('is_active', true);
      if (error) throw error;
      const memberCounts: Record<string, number> = {};
      companyIds.forEach(id => {
        memberCounts[id] = data?.filter(m => m.company_id === id).length || 0;
      });
      setCompanyMembers(memberCounts);
    } catch (error) {
      console.error('Error loading company members:', error);
    }
  };
  const loadCompanyMetrics = async (companyIds: string[]) => {
    try {
      // Fetch jobs
      const {
        data: jobsData
      } = await supabase.from('jobs').select('company_id, status, created_at').in('company_id', companyIds);

      // Fetch applications
      const {
        data: appsData
      } = await supabase.from('applications').select('job_id, created_at, jobs!inner(company_id)').in('jobs.company_id', companyIds);

      // Fetch followers
      const {
        data: followersData
      } = await supabase.from('company_followers').select('company_id').in('company_id', companyIds);

      // Fetch analytics
      const {
        data: analyticsData
      } = await supabase.from('company_analytics').select('company_id, profile_views, post_views, date').in('company_id', companyIds).order('date', {
        ascending: false
      });
      const metrics: Record<string, CompanyMetrics> = {};
      companyIds.forEach(id => {
        const jobs = jobsData?.filter(j => j.company_id === id) || [];
        const activeJobs = jobs.filter(j => j.status === 'open').length;
        const apps = appsData?.filter((a: any) => a.jobs?.company_id === id) || [];
        const followers = followersData?.filter(f => f.company_id === id).length || 0;
        const analytics = analyticsData?.filter(a => a.company_id === id) || [];
        const profileViews = analytics.reduce((sum, a) => sum + (a.profile_views || 0), 0);
        const postViews = analytics.reduce((sum, a) => sum + (a.post_views || 0), 0);

        // Get most recent activity
        const allDates = [...jobs.map(j => j.created_at), ...apps.map((a: any) => a.created_at)].filter(Boolean).sort().reverse();
        metrics[id] = {
          company_id: id,
          total_jobs: jobs.length,
          active_jobs: activeJobs,
          total_applications: apps.length,
          total_followers: followers,
          profile_views: profileViews,
          post_views: postViews,
          recent_activity: allDates[0] || null
        };
      });
      setCompanyMetrics(metrics);
    } catch (error) {
      console.error('Error loading company metrics:', error);
    }
  };
  const loadOverallMetrics = async () => {
    try {
      const {
        count: totalCompanies
      } = await supabase.from('companies').select('*', {
        count: 'exact',
        head: true
      });
      const {
        count: activeCompanies
      } = await supabase.from('companies').select('*', {
        count: 'exact',
        head: true
      }).eq('is_active', true);
      const {
        count: totalJobs
      } = await supabase.from('jobs').select('*', {
        count: 'exact',
        head: true
      });
      const {
        count: totalApplications
      } = await supabase.from('applications').select('*', {
        count: 'exact',
        head: true
      });
      setOverallMetrics({
        total_companies: totalCompanies || 0,
        active_companies: activeCompanies || 0,
        total_jobs: totalJobs || 0,
        total_applications: totalApplications || 0,
        avg_apps_per_company: activeCompanies ? Math.round((totalApplications || 0) / activeCompanies) : 0
      });
    } catch (error) {
      console.error('Error loading overall metrics:', error);
    }
  };
  const toggleExpanded = (companyId: string) => {
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
  const industries = Array.from(new Set(companies.map(c => c.industry).filter(Boolean)));
  const sizes = Array.from(new Set(companies.map(c => c.company_size).filter(Boolean)));
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) || company.industry?.toLowerCase().includes(searchQuery.toLowerCase()) || company.tagline?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = industryFilter === "all" || company.industry === industryFilter;
    const matchesSize = sizeFilter === "all" || company.company_size === sizeFilter;
    return matchesSearch && matchesIndustry && matchesSize;
  }).sort((a, b) => {
    const metricsA = companyMetrics[a.id];
    const metricsB = companyMetrics[b.id];
    switch (sortBy) {
      case "jobs":
        return (metricsB?.active_jobs || 0) - (metricsA?.active_jobs || 0);
      case "applications":
        return (metricsB?.total_applications || 0) - (metricsA?.total_applications || 0);
      case "followers":
        return (metricsB?.total_followers || 0) - (metricsA?.total_followers || 0);
      case "activity":
        return (metricsB?.recent_activity || "").localeCompare(metricsA?.recent_activity || "");
      default:
        return a.name.localeCompare(b.name);
    }
  });
  // If partner, redirect to their company page
  if (isPartner && partnerCompany && !loading) {
    navigate(`/companies/${partnerCompany.slug}`);
    return null;
  }

  return <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-5xl font-black uppercase tracking-tight text-foreground">
              Partner Companies
            </h1>
            <p className="text-lg text-muted-foreground">
              Elite talent partners shaping the future of work
            </p>
          </div>
          
          {(isAdmin || isPartner) && <AddCompanyDialog onSuccess={() => {
          loadCompanies();
          loadOverallMetrics();
        }} />}
        </div>

        {/* Overall Metrics Dashboard */}
        {overallMetrics && <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-2 hover-scale">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wide">Companies</CardDescription>
                <CardTitle className="text-4xl font-black">{overallMetrics.active_companies}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">of {overallMetrics.total_companies} total</p>
              </CardContent>
            </Card>
            
            <Card className="border-2 hover-scale">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wide flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Open Roles
                </CardDescription>
                <CardTitle className="text-4xl font-black text-foreground">{overallMetrics.total_jobs}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="border-2 hover-scale">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wide flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Applications
                </CardDescription>
                <CardTitle className="text-4xl font-black text-foreground">{overallMetrics.total_applications}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="border-2 hover-scale">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wide">Avg Apps</CardDescription>
                <CardTitle className="text-4xl font-black">{overallMetrics.avg_apps_per_company}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">per company</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover-scale bg-gradient-to-br from-primary/10 to-accent/10">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wide flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> Activity
                </CardDescription>
                <CardTitle className="text-4xl font-black">Live</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Real-time updates</p>
              </CardContent>
            </Card>
          </div>}

        {/* Filters & Search */}
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="text" placeholder="Search companies, industries, locations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map(industry => <SelectItem key={industry} value={industry!}>{industry}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="jobs">Most Jobs</SelectItem>
                  <SelectItem value="applications">Most Applications</SelectItem>
                  <SelectItem value="followers">Most Followers</SelectItem>
                  <SelectItem value="activity">Recent Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Companies List */}
        {loading ? <div className="flex items-center justify-center py-20">
            <div className="space-y-4 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-muted-foreground">Loading partner ecosystem...</p>
            </div>
          </div> : filteredCompanies.length === 0 ? <Card className="border-2">
            <CardContent className="py-20 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">No companies found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || industryFilter !== "all" ? "Try adjusting your filters" : "No companies available yet"}
              </p>
              {(searchQuery || industryFilter !== "all") && <Button variant="outline" onClick={() => {
            setSearchQuery("");
            setIndustryFilter("all");
            setSizeFilter("all");
          }}>
                  Clear Filters
                </Button>}
            </CardContent>
          </Card> : <div className="space-y-4">
            {filteredCompanies.map(company => {
          const metrics = companyMetrics[company.id];
          const isExpanded = expandedCompanies.has(company.id);
          return <Collapsible key={company.id} open={isExpanded} onOpenChange={() => toggleExpanded(company.id)}>
                  <Card className="border-2 hover:border-primary transition-all hover-scale relative overflow-hidden group">
                    {/* Activity Preview Widget */}
                    <CompanyActivityPreview companyId={company.id} />
                    
                    {/* Cover Image Header - Full width at top */}
                    {company.cover_image_url && <div className="absolute top-0 left-0 right-0 h-32 opacity-20 group-hover:opacity-30 transition-opacity" style={{
                backgroundImage: `url(${company.cover_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderTopLeftRadius: '0.5rem',
                borderTopRightRadius: '0.5rem'
              }} />}
                    
                    <CollapsibleTrigger className="w-full relative z-10">
                      <CardHeader>
                        <div className="flex items-start gap-6">
                          {/* Logo - Fixed aspect ratio */}
                          <Avatar className="w-20 h-20 border-2 border-primary shadow-lg flex-shrink-0">
                            <AvatarImage src={company.logo_url || undefined} alt={company.name} className="object-contain w-full h-full" />
                            <AvatarFallback className="text-2xl font-black bg-gradient-to-br from-primary to-accent text-white">
                              {company.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          {/* Company Info */}
                          <div className="flex-1 text-left space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <h2 className="text-2xl font-black">{company.name}</h2>
                                  {company.membership_tier === 'premium' && <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600">
                                      Premium Partner
                                    </Badge>}
                                </div>
                                {company.tagline && <p className="text-muted-foreground text-sm">{company.tagline}</p>}
                              </div>
                              
                              <ChevronDown className={`w-6 h-6 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>

                            {/* Quick Stats Bar */}
                            <div className="flex items-center gap-6 text-sm">
                              {company.industry && <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Building2 className="w-4 h-4" />
                                  <span>{company.industry}</span>
                                </div>}
                              {company.headquarters_location && <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <MapPin className="w-4 h-4" />
                                  <span>{company.headquarters_location}</span>
                                </div>}
                              {company.company_size && <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Users className="w-4 h-4" />
                                  <span>{company.company_size}</span>
                                </div>}
                            </div>

                            {/* Metrics Preview */}
                            {metrics && <div className="flex items-center gap-6 pt-2">
                                <div className="flex items-center gap-2">
                                  <Briefcase className="w-4 h-4 text-primary" />
                                  <span className="font-bold">{metrics.active_jobs}</span>
                                  <span className="text-xs text-muted-foreground">open roles</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-bold">{metrics.total_applications}</span>
                                  <span className="text-xs text-muted-foreground">applications</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Heart className="w-4 h-4 text-red-500" />
                                  <span className="font-bold">{metrics.total_followers}</span>
                                  <span className="text-xs text-muted-foreground">followers</span>
                                </div>
                                {(isAdmin || isPartner) && companyMembers[company.id] > 0 && <div className="flex items-center gap-2">
                                    <CompanyMembersStack companyId={company.id} maxVisible={3} />
                                    <span className="text-xs text-muted-foreground">
                                      {companyMembers[company.id]} team {companyMembers[company.id] === 1 ? 'member' : 'members'}
                                    </span>
                                  </div>}
                              </div>}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="border-t pt-6 space-y-6">
                        {/* Detailed Analytics */}
                        {metrics && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="bg-card/50">
                              <CardHeader className="pb-2">
                                <CardDescription className="text-xs flex items-center gap-1">
                                  <Eye className="w-3 h-3" /> Profile Views
                                </CardDescription>
                                <CardTitle className="text-2xl">{metrics.profile_views.toLocaleString()}</CardTitle>
                              </CardHeader>
                            </Card>
                            <Card className="bg-card/50">
                              <CardHeader className="pb-2">
                                <CardDescription className="text-xs flex items-center gap-1">
                                  <Eye className="w-3 h-3" /> Post Views
                                </CardDescription>
                                <CardTitle className="text-2xl">{metrics.post_views.toLocaleString()}</CardTitle>
                              </CardHeader>
                            </Card>
                            <Card className="bg-card/50">
                              <CardHeader className="pb-2">
                                <CardDescription className="text-xs flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" /> Total Jobs
                                </CardDescription>
                                <CardTitle className="text-2xl">{metrics.total_jobs}</CardTitle>
                              </CardHeader>
                            </Card>
                            <Card className="bg-card/50">
                              <CardHeader className="pb-2">
                                <CardDescription className="text-xs flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Member Since
                                </CardDescription>
                                <CardTitle className="text-sm">
                                  {company.member_since ? new Date(company.member_since).getFullYear() : "2024"}
                                </CardTitle>
                              </CardHeader>
                            </Card>
                          </div>}

                        {/* Company Details */}
                        {company.description && <div>
                            <h4 className="text-sm font-semibold mb-2">About</h4>
                            <p className="text-sm text-muted-foreground line-clamp-3">{company.description}</p>
                          </div>}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            {(isAdmin || isPartner) && <CompanyMembersDialog companyId={company.id} companyName={company.name} />}
                            
                            <Button onClick={e => {
                      e.stopPropagation();
                      if (company.slug) {
                        navigate(`/companies/${company.slug}`);
                      } else {
                        console.error('Company slug missing for:', company.name);
                        toast.error('Unable to open company page');
                      }
                    }} className="gap-2">
                              <ExternalLink className="w-4 h-4" />
                              View Company Page
                            </Button>
                          
                          {company.website_url && <Button variant="outline" onClick={e => {
                      e.stopPropagation();
                      window.open(company.website_url!, '_blank');
                    }} className="gap-2">
                              <Globe className="w-4 h-4" />
                              Website
                            </Button>}
                          
                          {company.linkedin_url && <Button variant="outline" onClick={e => {
                      e.stopPropagation();
                      window.open(company.linkedin_url!, '_blank');
                    }} className="gap-2">
                              <Linkedin className="w-4 h-4" />
                              LinkedIn
                            </Button>}

                          <Button variant="outline" onClick={e => {
                      e.stopPropagation();
                      navigate(`/jobs?company=${company.id}`);
                    }} className="gap-2">
                            <Briefcase className="w-4 h-4" />
                            View {metrics?.active_jobs || 0} Open Roles
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>;
        })}
          </div>}
      </div>
    </AppLayout>;
}