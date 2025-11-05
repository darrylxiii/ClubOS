import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Search, 
  Filter, 
  Download, 
  UserPlus, 
  TrendingUp,
  AlertCircle,
  Users,
  Briefcase
} from "lucide-react";
import { ApplicationsTable } from "@/components/partner/ApplicationsTable";
import { ApplicationsFilters } from "@/components/partner/ApplicationsFilters";
import { ApplicationsAnalytics } from "@/components/partner/ApplicationsAnalytics";
import { AddCandidateDialog } from "@/components/partner/AddCandidateDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CompanyApplications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check user roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAdmin = rolesData?.some(r => r.role === 'admin');
      const isPartner = rolesData?.some(r => r.role === 'partner');

      // Get company memberships for partners
      let companyIds: string[] = [];
      if (isPartner && !isAdmin) {
        const { data: memberships } = await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("is_active", true);
        
        companyIds = memberships?.map(m => m.company_id) || [];
      }

      // Build jobs query based on role
      let jobsQuery = supabase
        .from("jobs")
        .select(`
          id,
          title,
          company_id,
          status,
          created_at,
          companies:company_id (
            id,
            name,
            logo_url
          )
        `);

      // Filter jobs by company for partners
      if (isPartner && !isAdmin && companyIds.length > 0) {
        jobsQuery = jobsQuery.in("company_id", companyIds);
      }

      const { data: jobsData, error: jobsError } = await jobsQuery.order("created_at", { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Get job IDs for filtering applications
      const jobIds = jobsData?.map(j => j.id) || [];

      if (jobIds.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // Build applications query
      const { data: appsData, error: appsError } = await supabase
        .from("applications")
        .select(`
          *,
          jobs!applications_job_id_fkey (
            id,
            title,
            company_id,
            companies!jobs_company_id_fkey (
              id,
              name,
              logo_url
            )
          )
        `)
        .in("job_id", jobIds)
        .order("applied_at", { ascending: false });

      if (appsError) throw appsError;

      // Now get candidate profiles and profiles for these applications
      const candidateProfilePromises = (appsData || []).map(async (app) => {
        // Strategy: Try multiple approaches to find candidate data
        let candidateData = null;
        let profileData = null;

        // 1. Get user profile if user_id exists
        if (app.user_id) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", app.user_id)
            .maybeSingle();
          profileData = userProfile;
        }

        // 2. Try to find candidate_profile by user_id first
        if (app.user_id) {
          const { data: candProfile } = await supabase
            .from("candidate_profiles")
            .select("*")
            .eq("user_id", app.user_id)
            .maybeSingle();
          if (candProfile) candidateData = candProfile;
        }

        // 3. If not found and we have email, try by email
        if (!candidateData && profileData?.email) {
          const { data: candProfile } = await supabase
            .from("candidate_profiles")
            .select("*")
            .eq("email", profileData.email)
            .maybeSingle();
          if (candProfile) candidateData = candProfile;
        }

        // Get recent interactions if we found candidate
        let interactions = [];
        if (candidateData?.id) {
          const { data: interactionsData } = await supabase
            .from("candidate_interactions")
            .select("id, interaction_type, created_at")
            .eq("candidate_id", candidateData.id)
            .order("created_at", { ascending: false })
            .limit(5);
          interactions = interactionsData || [];
        }

        // Merge candidate and profile data, prioritizing candidate_profiles
        return {
          ...app,
          candidate_profiles: candidateData ? {
            ...candidateData,
            // Fallback to profile data if fields are missing
            full_name: candidateData.full_name || profileData?.full_name || 'Unknown',
            email: candidateData.email || profileData?.email || '',
            avatar_url: candidateData.avatar_url || profileData?.avatar_url,
          } : (profileData ? {
            id: null,
            full_name: profileData.full_name || 'Unknown',
            email: profileData.email || '',
            avatar_url: profileData.avatar_url,
            user_id: app.user_id,
          } : null),
          candidate_interactions: interactions
        };
      });

      const enrichedApps = await Promise.all(candidateProfilePromises);
      setApplications(enrichedApps);

      // Extract unique companies
      const uniqueCompanies = Array.from(
        new Map(
          jobsData
            ?.filter(j => j.companies)
            .map(j => [j.companies.id, j.companies]) || []
        ).values()
      );
      setCompanies(uniqueCompanies);

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.candidate_profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.candidate_profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobs?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStage = selectedStage === "all" || app.status === selectedStage;
    const matchesJob = selectedJob === "all" || app.job_id === selectedJob;
    const matchesCompany = selectedCompany === "all" || app.jobs?.company_id === selectedCompany;
    const matchesSource = selectedSource === "all" || app.candidate_profiles?.source_channel === selectedSource;

    // Urgency filter
    let matchesUrgency = true;
    if (urgencyFilter !== "all") {
      const lastActivity = app.candidate_profiles?.last_activity_at;
      const daysSince = lastActivity 
        ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      if (urgencyFilter === "urgent") {
        matchesUrgency = daysSince > 14;
      } else if (urgencyFilter === "needs-followup") {
        matchesUrgency = daysSince > 7 && daysSince <= 14;
      } else if (urgencyFilter === "recent") {
        matchesUrgency = daysSince <= 7;
      }
    }

    return matchesSearch && matchesStage && matchesJob && matchesCompany && matchesSource && matchesUrgency;
  });

  // Calculate stats
  const stats = {
    total: applications.length,
    active: applications.filter(a => a.status === "active").length,
    hired: applications.filter(a => a.status === "hired").length,
    rejected: applications.filter(a => a.status === "rejected").length,
    needsAction: applications.filter(a => {
      const lastActivity = a.candidate_interactions?.[0]?.created_at;
      if (!lastActivity) return true;
      const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceActivity > 7;
    }).length
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Job', 'Stage', 'Applied Date', 'Last Activity', 'Source'],
      ...filteredApplications.map(app => [
        app.candidate_profiles?.full_name || '',
        app.candidate_profiles?.email || '',
        app.jobs?.title || '',
        app.status || '',
        new Date(app.applied_at).toLocaleDateString(),
        app.candidate_profiles?.last_activity_at 
          ? new Date(app.candidate_profiles.last_activity_at).toLocaleDateString() 
          : 'N/A',
        app.candidate_profiles?.source_channel || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Applications exported");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading applications...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
              Applications Hub
            </h1>
            <p className="text-muted-foreground">
              Manage all candidates across your company jobs
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setAddCandidateOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Candidate
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-3xl font-bold">{stats.active}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Needs Action</p>
                  <p className="text-3xl font-bold">{stats.needsAction}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hired</p>
                  <p className="text-3xl font-bold">{stats.hired}</p>
                </div>
                <Briefcase className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-3xl font-bold">{stats.rejected}</p>
                </div>
                <Users className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, email, or job..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <ApplicationsFilters
              selectedStage={selectedStage}
              setSelectedStage={setSelectedStage}
              selectedJob={selectedJob}
              setSelectedJob={setSelectedJob}
              selectedCompany={selectedCompany}
              setSelectedCompany={setSelectedCompany}
              selectedSource={selectedSource}
              setSelectedSource={setSelectedSource}
              urgencyFilter={urgencyFilter}
              setUrgencyFilter={setUrgencyFilter}
              jobs={jobs}
              companies={companies}
            />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="table" className="w-full">
          <TabsList>
            <TabsTrigger value="table">Candidates Table</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="mt-6">
            <ApplicationsTable
              applications={filteredApplications}
              onUpdate={loadData}
            />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <ApplicationsAnalytics applications={applications} jobs={jobs} />
          </TabsContent>
        </Tabs>
      </div>

      {jobs.length > 0 && (
        <AddCandidateDialog
          open={addCandidateOpen}
          onOpenChange={setAddCandidateOpen}
          jobId={jobs[0]?.id}
          jobTitle={jobs[0]?.title}
          onCandidateAdded={loadData}
        />
      )}
    </AppLayout>
  );
}
