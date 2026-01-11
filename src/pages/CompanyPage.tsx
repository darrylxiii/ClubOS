import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft, Globe, Linkedin, Twitter, Instagram,
  Settings, Eye, Share2, Image as ImageIcon, Building2,
  MapPin, Users, Calendar, Briefcase, Heart, Star, Mail, Sparkles, Target, Newspaper, Brain, BarChart3, Wallet
} from "lucide-react";
import { SectionLoader } from "@/components/ui/unified-loader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { CompanySocialActivity } from "@/components/companies/CompanySocialActivity";
import { CompanyPosts } from "@/components/partner/CompanyPosts";
import { CompanyMembersStack } from "@/components/companies/CompanyMembersStack";
import { EditCompanyDialog } from "@/components/companies/EditCompanyDialog";
import { TeamManagement } from "@/components/partner/TeamManagement";
import { CompanyMembersDialog } from "@/components/companies/CompanyMembersDialog";
import { CreateJobDialog } from "@/components/partner/CreateJobDialog";
import { DepartmentManager } from "@/components/organization/DepartmentManager";
import { MemberAssignmentEditor } from "@/components/organization/MemberAssignmentEditor";
import { OrgChartView } from "@/components/organization/OrgChartView";
import { JobCard } from "@/components/JobCard";
import { TargetCompanies } from "@/components/partner/TargetCompanies";
import { CompanyCRMMetrics } from "@/components/crm/CompanyCRMMetrics";
import { getJobViewPath } from "@/utils/jobNavigation";
import { NewsArticleCard } from "@/components/company/NewsArticleCard";
import { AddNewsArticleDialog } from "@/components/company/AddNewsArticleDialog";
import { CompanyIntelligenceSummary } from "@/components/intelligence/CompanyIntelligenceSummary";
import { CompanyMLInsights } from "@/components/intelligence/CompanyMLInsights";
import { EntityKnowledgeProfile } from "@/components/intelligence/EntityKnowledgeProfile";


import { CompanyFinancialsTab } from "@/components/companies/CompanyFinancialsTab";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  tagline: string | null;
  description: string | null;
  founded_year: number | null;
  company_size: string | null;
  headquarters_location: string | null;
  industry: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  careers_email: string | null;
  careers_page_url: string | null;
  membership_tier: string | null;
  values: string[];
  culture_highlights: string[];
  benefits: string[];
  tech_stack: string[];
  vision: string | null;
  mission: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_active: boolean;
  created_at: string;
  member_since: string | null;
}

export default function CompanyPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentRole } = useRole();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [jobCount, setJobCount] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isCompanyMember, setIsCompanyMember] = useState(false);
  const [createJobDialogOpen, setCreateJobDialogOpen] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [targetCompaniesCount, setTargetCompaniesCount] = useState(0);
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [addNewsDialogOpen, setAddNewsDialogOpen] = useState(false);

  const isAdmin = currentRole === 'admin';
  const isPartner = currentRole === 'partner';

  // Show targets tab only to admins or company members (partners/recruiters)
  const canAccessTargets = isAdmin || isCompanyMember;

  useEffect(() => {
    loadCompany();
  }, [slug]);

  useEffect(() => {
    if (company && user) {
      loadFollowStatus();
      loadStats();
      checkCompanyMembership();
      loadNewsArticles();
    }
  }, [company, user]);

  const checkCompanyMembership = async () => {
    if (!company || !user || (!isAdmin && !isPartner)) {
      setIsCompanyMember(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("company_members")
        .select("id")
        .eq("company_id", company.id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!error) {
        setIsCompanyMember(!!data);
      }
    } catch (error) {
      console.error("Error checking membership:", error);
    }
  };

  const loadCompany = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompany({
          ...data,
          values: (data.values as string[]) || [],
          culture_highlights: (data.culture_highlights as string[]) || [],
          benefits: (data.benefits as string[]) || [],
          tech_stack: (data.tech_stack as string[]) || [],
        });
      }
    } catch (error) {
      console.error("Error loading company:", error);
      toast.error("Failed to load company information");
    } finally {
      setLoading(false);
    }
  };

  const loadFollowStatus = async () => {
    if (!user || !company) return;

    try {
      const { data } = await supabase
        .from("company_followers")
        .select("id")
        .eq("company_id", company.id)
        .eq("user_id", user.id)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error("Error loading follow status:", error);
    }
  };

  const loadNewsArticles = async () => {
    if (!company) return;

    setNewsLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_news_articles')
        .select('*')
        .eq('company_id', company.id)
        .order('is_pinned', { ascending: false })
        .order('published_date', { ascending: false });

      if (error) throw error;
      setNewsArticles(data || []);
    } catch (error) {
      console.error('Error loading news articles:', error);
      toast.error('Failed to load news articles');
    } finally {
      setNewsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!company) return;

    try {
      // Build queries based on user role - admins and company members see all jobs including drafts
      const isInternalUser = isAdmin || isCompanyMember;

      const [followersRes, jobsRes, jobsDataRes, targetsRes] = await Promise.all([
        supabase.from("company_followers").select("id", { count: 'exact', head: true }).eq("company_id", company.id),
        isInternalUser
          ? supabase.from("jobs").select("id", { count: 'exact', head: true }).eq("company_id", company.id)
          : supabase.from("jobs").select("id", { count: 'exact', head: true }).eq("company_id", company.id).eq("status", "published"),
        isInternalUser
          ? supabase.from("jobs").select("*").eq("company_id", company.id).order("created_at", { ascending: false })
          : supabase.from("jobs").select("*").eq("company_id", company.id).eq("status", "published").order("created_at", { ascending: false }),
        supabase.from("target_companies").select("id", { count: 'exact', head: true }).eq("company_id", company.id),
      ]);

      setFollowerCount(followersRes.count || 0);
      setJobCount(jobsRes.count || 0);
      setJobs(jobsDataRes.data || []);
      setTargetCompaniesCount(targetsRes.count || 0);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleFollow = async () => {
    if (!user || !company) {
      toast.error("Please sign in to follow companies");
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from("company_followers")
          .delete()
          .eq("company_id", company.id)
          .eq("user_id", user.id);
        toast.success("Unfollowed company");
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from("company_followers")
          .insert({
            company_id: company.id,
            user_id: user.id,
          });
        toast.success("Following company!");
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    }
  };

  const handleBack = () => {
    navigate("/companies");
  };

  const handleShare = () => {
    if (navigator.share && company) {
      navigator.share({
        title: company.name,
        text: company.tagline || `Check out ${company.name} on The Quantum Club`,
        url: window.location.href,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      });
    } else if (company) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const uploadCoverImage = async (file: File) => {
    if (!company) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}-cover.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-headers')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-headers')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('companies')
        .update({ cover_image_url: publicUrl })
        .eq('id', company.id);

      if (updateError) throw updateError;

      toast.success("Cover image updated!");
      loadCompany();
    } catch (error: any) {
      console.error("Error uploading cover:", error);
      toast.error(error.message || "Failed to upload cover image");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[100dvh]">
          <SectionLoader />
        </div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card className="border-2">
            <CardContent className="py-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Company Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This company is not part of The Quantum Club network.
              </p>
              <Button onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6 max-w-6xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Companies
        </Button>

        {/* Profile Header */}
        <Card className="relative overflow-visible">
          {/* Header Media (Cover Image) */}
          <div className="relative w-full h-64 overflow-hidden bg-muted rounded-t-lg">
            {company.cover_image_url ? (
              <>
                <img
                  src={company.cover_image_url}
                  alt="Company header"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
              </>
            ) : null}

            {/* Change Header button in top right (only for admins/members) */}
            {(isAdmin || isCompanyMember) && (
              <div className="absolute top-4 right-4">
                <label htmlFor="cover-upload" className="cursor-pointer">
                  <Button size="sm" variant="secondary" className="gap-2 shadow-lg" asChild>
                    <span>
                      <ImageIcon className="w-4 h-4" />
                      Change Header
                    </span>
                  </Button>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCoverImage(file);
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Avatar positioned to overlap header and content */}
          <div className="absolute top-64 left-6 transform -translate-y-1/2 z-10">
            <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
              <AvatarImage
                src={company.logo_url || undefined}
                className="object-contain w-full h-full"
                alt={company.name}
              />
              <AvatarFallback className="text-4xl font-black bg-gradient-to-br from-primary to-accent text-white">
                {company.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {(isAdmin || isCompanyMember) && (
              <Button
                size="sm"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full h-10 w-10 p-0 shadow-lg"
                onClick={() => setEditDialogOpen(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>

          <CardContent className="pt-20">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-3xl font-bold">{company.name}</h1>
                    {company.membership_tier === 'premium' && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white gap-1">
                        <Star className="w-3 h-3" />
                        Premium Partner
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">{company.tagline || 'Building the future'}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Description */}
              {company.description && (
                <p className="text-muted-foreground">
                  {company.description}
                </p>
              )}

              {/* Quick Info */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {company.industry && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {company.industry}
                  </div>
                )}
                {company.headquarters_location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {company.headquarters_location}
                  </div>
                )}
                {company.company_size && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {company.company_size} employees
                  </div>
                )}
                {company.founded_year && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Founded {company.founded_year}
                  </div>
                )}
              </div>

              {/* Social Links & Actions */}
              <div className="flex flex-wrap gap-2">
                {company.website_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(company.website_url!, '_blank')}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Website
                  </Button>
                )}
                {company.linkedin_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(company.linkedin_url!, '_blank')}
                  >
                    <Linkedin className="w-4 h-4 mr-2" />
                    LinkedIn
                  </Button>
                )}
                {company.twitter_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(company.twitter_url!, '_blank')}
                  >
                    <Twitter className="w-4 h-4 mr-2" />
                    Twitter
                  </Button>
                )}
                {company.instagram_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(company.instagram_url!, '_blank')}
                  >
                    <Instagram className="w-4 h-4 mr-2" />
                    Instagram
                  </Button>
                )}
                <Button
                  variant={isFollowing ? "secondary" : "default"}
                  size="sm"
                  onClick={handleFollow}
                >
                  <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              </div>

              {/* Stats Bar */}
              <div className="flex items-center gap-6 pt-4 border-t">
                <div>
                  <p className="text-2xl font-bold">{followerCount}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{jobCount}</p>
                  <p className="text-xs text-muted-foreground">Open Roles</p>
                </div>
                <div className="ml-auto">
                  <CompanyMembersStack companyId={company.id} maxVisible={5} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Activity Section */}
        <CompanySocialActivity companyId={company.id} isCompanyMember={isCompanyMember} />

        {/* Additional Tabs */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-9' : ((isAdmin || isCompanyMember) ? 'grid-cols-8' : (canAccessTargets ? 'grid-cols-6' : 'grid-cols-5'))}`}>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({jobCount})</TabsTrigger>
            <TabsTrigger value="news">
              <Newspaper className="w-4 h-4 mr-1.5" />
              News ({newsArticles.length})
            </TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="culture">Culture</TabsTrigger>
            {canAccessTargets && (
              <TabsTrigger value="targets">
                Targets ({targetCompaniesCount})
              </TabsTrigger>
            )}
            {(isAdmin || isCompanyMember) && (
              <TabsTrigger value="intelligence">
                <Brain className="w-4 w-4 mr-1.5" />
                Intelligence
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="ml-insights">
                <BarChart3 className="w-4 h-4 mr-1.5" />
                ML
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="financials">
                <Wallet className="w-4 h-4 mr-1.5" />
                Financials
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="about" className="space-y-6 mt-6">
            {/* Mission & Vision */}
            {(company.mission || company.vision) && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  {company.mission && (
                    <div>
                      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        Our Mission
                      </h3>
                      <p className="text-muted-foreground">{company.mission}</p>
                    </div>
                  )}
                  {company.vision && (
                    <div>
                      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-muted-foreground" />
                        Our Vision
                      </h3>
                      <p className="text-muted-foreground">{company.vision}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Values */}
            {company.values.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4">Our Values</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {company.values.map((value, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Brand Voice & Knowledge</h2>
                  <p className="text-muted-foreground">Configure how the AI represents this company.</p>
                </div>
              </div>

              <EntityKnowledgeProfile 
                entityId={company.id} 
                entityType="company"
                title="Brand Brain Configuration"
                description="Instructions and knowledge sources for the RAG engine."
              />
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6 mt-6">
            {/* Jobs Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Open Positions</h2>
                <p className="text-muted-foreground">
                  {jobCount} {jobCount === 1 ? 'role' : 'roles'} currently available
                </p>
              </div>
              {(isAdmin || isCompanyMember) && (
                <Button onClick={() => setCreateJobDialogOpen(true)}>
                  <Briefcase className="w-4 h-4 mr-2" />
                  Create New Job
                </Button>
              )}
            </div>

            {/* Jobs List */}
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-center py-12">
                    {(isAdmin || isCompanyMember)
                      ? "No jobs posted yet. Create your first job to start hiring!"
                      : "No open positions at the moment. Check back soon!"}
                  </p>
                  {company.careers_page_url && (
                    <div className="text-center">
                      <Button onClick={() => window.open(company.careers_page_url!, '_blank')}>
                        <Briefcase className="w-4 h-4 mr-2" />
                        Visit Careers Page
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {jobs.map((job) => (
                  <div key={job.id} className="relative">
                    {(isAdmin || isCompanyMember) && job.status === 'draft' && (
                      <Badge className="absolute -top-2 -right-2 z-10 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                        Draft
                      </Badge>
                    )}
                    <JobCard
                      id={job.id}
                      title={job.title}
                      company={company.name}
                      companyLogo={company.logo_url || undefined}
                      companySlug={company.slug}
                      location={job.location || "Remote"}
                      type={job.employment_type || "Full-time"}
                      postedDate={new Date(job.created_at).toLocaleDateString()}
                      tags={[]}
                      salary={job.salary_min && job.salary_max
                        ? `${job.currency} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                        : undefined}
                      onApply={() => {
                        const path = getJobViewPath(job.id, currentRole);
                        navigate(path);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-6 mt-6">
            {/* Team Management Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Team & Staff</h2>
                <p className="text-muted-foreground">Organizational structure and team members</p>
              </div>
              {(isAdmin || isCompanyMember) && (
                <CompanyMembersDialog companyId={company.id} companyName={company.name} />
              )}
            </div>

            {/* Team Sub-Tabs */}
            <Tabs defaultValue="directory" className="w-full">
              <TabsList className={`w-full ${(isAdmin || isCompanyMember) ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="directory">Directory</TabsTrigger>
                <TabsTrigger value="orgchart">Org Chart</TabsTrigger>
                <TabsTrigger value="departments">Departments</TabsTrigger>
                {(isAdmin || isCompanyMember) && (
                  <TabsTrigger value="manage">Manage</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="directory" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4">All Team Members</h3>
                    <CompanyMembersStack companyId={company.id} showFull />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orgchart" className="mt-6">
                <OrgChartView companyId={company.id} />
              </TabsContent>

              <TabsContent value="departments" className="mt-6">
                <DepartmentManager companyId={company.id} />
              </TabsContent>

              {(isAdmin || isCompanyMember) && (
                <TabsContent value="manage" className="mt-6 space-y-6">
                  <MemberAssignmentEditor companyId={company.id} />
                </TabsContent>
              )}
            </Tabs>
          </TabsContent>

          <TabsContent value="news" className="space-y-6 mt-6">
            {/* News Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">News & Press</h2>
                <p className="text-muted-foreground">
                  Latest news articles and press mentions
                </p>
              </div>
              {(isAdmin || isCompanyMember) && (
                <Button onClick={() => setAddNewsDialogOpen(true)}>
                  <Newspaper className="w-4 h-4 mr-2" />
                  Add Article
                </Button>
              )}
            </div>

            {/* News Grid */}
            {newsLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading news articles...
              </div>
            ) : newsArticles.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No news articles yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {(isAdmin || isCompanyMember)
                      ? "Add your first press mention or news article."
                      : "Check back soon for news and press coverage."}
                  </p>
                  {(isAdmin || isCompanyMember) && (
                    <Button onClick={() => setAddNewsDialogOpen(true)}>
                      <Newspaper className="w-4 h-4 mr-2" />
                      Add First Article
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {newsArticles.map((article) => (
                  <NewsArticleCard
                    key={article.id}
                    article={article}
                    companyLogoUrl={company.logo_url}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="culture" className="space-y-6 mt-6">
            {/* Benefits */}
            {company.benefits.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4">Benefits & Perks</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {company.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {
    canAccessTargets && (
      <TabsContent value="targets" className="space-y-6 mt-6">
        <TargetCompanies companyId={company.id} />
      </TabsContent>
    )
  }

  {/* Intelligence Tab */ }
  {
    (isAdmin || isCompanyMember) && (
      <TabsContent value="intelligence" className="space-y-6 mt-6">
        <CompanyIntelligenceSummary companyId={company.id} />
      </TabsContent>
    )
  }

  {/* ML Insights Tab */ }
  {
    isAdmin && (
      <TabsContent value="ml-insights" className="space-y-6 mt-6">
        <CompanyMLInsights companyId={company.id} />
      </TabsContent>
    )
  }

  {/* Financials Tab - Admin Only */ }
  {
    isAdmin && (
      <TabsContent value="financials" className="space-y-6 mt-6">
        <CompanyFinancialsTab companyId={company.id} />
      </TabsContent>
    )
  }
        </Tabs >
      </div >

    {/* Edit Company Dialog */ }
  {
    company && (
      <>
        <EditCompanyDialog
          companyId={company.id}
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSuccess={() => {
            loadCompany();
            setEditDialogOpen(false);
          }}
        />

        {/* Create Job Dialog */}
        <CreateJobDialog
          open={createJobDialogOpen}
          onOpenChange={setCreateJobDialogOpen}
          companyId={company.id}
          onJobCreated={() => {
            loadStats();
            toast.success("Job created successfully!");
          }}
        />

        {/* Add News Article Dialog */}
        <AddNewsArticleDialog
          open={addNewsDialogOpen}
          onOpenChange={setAddNewsDialogOpen}
          companyId={company.id}
          onSuccess={() => {
            loadNewsArticles();
            toast.success("News article added successfully!");
          }}
        />
      </>
    )
  }
    </AppLayout >
  );
}