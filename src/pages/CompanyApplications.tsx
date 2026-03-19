import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, Filter, Download, TrendingUp, AlertCircle, Users, Briefcase,
} from 'lucide-react';
import { ApplicationsTable } from '@/components/partner/ApplicationsTable';
import { ApplicationsFilters } from '@/components/partner/ApplicationsFilters';
import { ApplicationsAnalytics } from '@/components/partner/ApplicationsAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PartnerPageHeader } from '@/components/partner/PartnerPageHeader';
import { PartnerInlineStats } from '@/components/partner/PartnerInlineStats';
import { PartnerGlassCard } from '@/components/partner/PartnerGlassCard';

async function fetchApplicationsData(userId: string, currentRole: string | null, companyId: string | null) {
  const isAdmin = currentRole === 'admin';
  const isPartner = currentRole === 'partner';

  let companyIds: string[] = [];
  if (isPartner && !isAdmin) {
    if (companyId) {
      companyIds = [companyId];
    } else {
      const { data: memberships } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', userId)
        .eq('is_active', true);
      companyIds = memberships?.map((m) => m.company_id) || [];
    }
  }

  let jobsQuery = supabase
    .from('jobs')
    .select(`id, title, company_id, status, created_at, companies:company_id (id, name, logo_url)`);

  if (isPartner && !isAdmin && companyIds.length > 0) {
    jobsQuery = jobsQuery.in('company_id', companyIds);
  }

  const { data: jobsData, error: jobsError } = await jobsQuery.order('created_at', { ascending: false });
  if (jobsError) throw jobsError;

  const jobIds = jobsData?.map((j) => j.id) || [];
  if (jobIds.length === 0) return { applications: [], jobs: jobsData || [], companies: [] };

  const { data: appsData, error: appsError } = await supabase
    .from('applications')
    .select(`*, jobs!applications_job_id_fkey (id, title, company_id, companies!jobs_company_id_fkey (id, name, logo_url))`)
    .in('job_id', jobIds)
    .order('applied_at', { ascending: false });

  if (appsError) throw appsError;

  const enrichedApps = await Promise.all(
    (appsData || []).map(async (app) => {
      let candidateData = null;
      let profileData = null;

      if (app.user_id) {
        const [{ data: userProfile }, { data: candProfile }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', app.user_id).maybeSingle(),
          supabase.from('candidate_profiles').select('*').eq('user_id', app.user_id).maybeSingle(),
        ]);
        profileData = userProfile;
        candidateData = candProfile;
      }

      if (!candidateData && profileData?.email) {
        const { data: candProfile } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('email', profileData.email)
          .maybeSingle();
        if (candProfile) candidateData = candProfile;
      }

      let interactions: any[] = [];
      if (candidateData?.id) {
        const { data } = await supabase
          .from('candidate_interactions')
          .select('id, interaction_type, created_at')
          .eq('candidate_id', candidateData.id)
          .order('created_at', { ascending: false })
          .limit(5);
        interactions = data || [];
      }

      const candidateInfo = candidateData
        ? {
            ...candidateData,
            full_name: candidateData.full_name || profileData?.full_name || app.candidate_full_name || 'Unknown Candidate',
            email: candidateData.email || profileData?.email || app.candidate_email || '',
            avatar_url: candidateData.avatar_url || profileData?.avatar_url,
            current_title: candidateData.current_title || app.candidate_title,
            current_company: candidateData.current_company || app.candidate_company,
            linkedin_url: candidateData.linkedin_url || profileData?.linkedin_url || app.candidate_linkedin_url,
            phone: profileData?.phone || app.candidate_phone,
            has_account: true,
          }
        : profileData
        ? {
            id: null,
            full_name: profileData.full_name || app.candidate_full_name || 'Unknown Candidate',
            email: profileData.email || app.candidate_email || '',
            avatar_url: profileData.avatar_url,
            current_title: app.candidate_title,
            current_company: app.candidate_company,
            linkedin_url: profileData.linkedin_url || app.candidate_linkedin_url,
            phone: profileData.phone || app.candidate_phone,
            user_id: app.user_id,
            has_account: true,
          }
        : {
            id: null,
            full_name: app.candidate_full_name || 'Unknown Candidate',
            email: app.candidate_email || '',
            avatar_url: null,
            current_title: app.candidate_title,
            current_company: app.candidate_company,
            linkedin_url: app.candidate_linkedin_url,
            phone: app.candidate_phone,
            user_id: null,
            has_account: false,
          };

      return { ...app, candidate_profiles: candidateInfo, candidate_interactions: interactions };
    })
  );

  const uniqueCompanies = Array.from(
    new Map(
      jobsData?.filter((j) => j.companies).map((j) => [(j.companies as any).id, j.companies]) || []
    ).values()
  );

  return { applications: enrichedApps, jobs: jobsData || [], companies: uniqueCompanies };
}

export default function CompanyApplications({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const { currentRole, companyId } = useRole();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedJob, setSelectedJob] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['company-applications', user?.id, currentRole, companyId],
    queryFn: () => fetchApplicationsData(user!.id, currentRole, companyId),
    enabled: !!user?.id,
  });

  const applications = data?.applications || [];
  const jobs = data?.jobs || [];
  const companies = data?.companies || [];

  const filteredApplications = applications.filter((app: any) => {
    const candidate = app.candidate_profiles;
    const matchesSearch =
      candidate?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobs?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = selectedStage === 'all' || app.status === selectedStage;
    const matchesJob = selectedJob === 'all' || app.job_id === selectedJob;
    const matchesCompany = selectedCompany === 'all' || app.jobs?.company_id === selectedCompany;
    const matchesSource = selectedSource === 'all' || candidate?.source_channel === selectedSource;
    let matchesUrgency = true;
    if (urgencyFilter !== 'all') {
      const lastActivity = candidate?.last_activity_at;
      const daysSince = lastActivity ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)) : 999;
      if (urgencyFilter === 'urgent') matchesUrgency = daysSince > 14;
      else if (urgencyFilter === 'needs-followup') matchesUrgency = daysSince > 7 && daysSince <= 14;
      else if (urgencyFilter === 'recent') matchesUrgency = daysSince <= 7;
    }
    return matchesSearch && matchesStage && matchesJob && matchesCompany && matchesSource && matchesUrgency;
  });

  const stats = {
    total: applications.length,
    active: applications.filter((a: any) => a.status === 'active').length,
    hired: applications.filter((a: any) => a.status === 'hired').length,
    rejected: applications.filter((a: any) => a.status === 'rejected').length,
    needsAction: applications.filter((a: any) => {
      const lastActivity = a.candidate_interactions?.[0]?.created_at;
      if (!lastActivity) return true;
      return Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)) > 7;
    }).length,
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Job', 'Stage', 'Applied Date', 'Last Activity', 'Source', 'Account Status'],
      ...filteredApplications.map((app: any) => {
        const candidate = app.candidate_profiles;
        return [
          candidate?.full_name || '',
          candidate?.email || '',
          app.jobs?.title || '',
          app.status || '',
          new Date(app.applied_at).toLocaleDateString(),
          candidate?.last_activity_at ? new Date(candidate.last_activity_at).toLocaleDateString() : 'N/A',
          candidate?.source_channel || 'N/A',
          candidate?.has_account ? 'Active' : 'Pending Signup',
        ];
      }),
    ].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Applications exported');
  };

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-muted-foreground">Loading applications...</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PartnerPageHeader
        title="Applications Hub"
        subtitle="Manage all candidates across your company jobs"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, email, or job..."
        actions={
          <Button onClick={handleExport} variant="outline" size="sm" className="h-9 border-border/30">
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        }
      />

      <PartnerInlineStats
        stats={[
          { value: stats.total, label: 'Total', icon: Users, highlight: true },
          { value: stats.active, label: 'Active', icon: TrendingUp },
          { value: stats.needsAction, label: 'Needs Action', icon: AlertCircle },
          { value: stats.hired, label: 'Hired', icon: Briefcase },
        ]}
      />

      <PartnerGlassCard>
        <ApplicationsFilters
          selectedStage={selectedStage} setSelectedStage={setSelectedStage}
          selectedJob={selectedJob} setSelectedJob={setSelectedJob}
          selectedCompany={selectedCompany} setSelectedCompany={setSelectedCompany}
          selectedSource={selectedSource} setSelectedSource={setSelectedSource}
          urgencyFilter={urgencyFilter} setUrgencyFilter={setUrgencyFilter}
          jobs={jobs} companies={companies}
        />
      </PartnerGlassCard>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="bg-card/30 backdrop-blur-sm border border-border/20">
          <TabsTrigger value="table">Candidates Table</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="table" className="mt-6">
          <ApplicationsTable
            applications={filteredApplications}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ['company-applications'] })}
          />
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <ApplicationsAnalytics applications={applications} jobs={jobs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
