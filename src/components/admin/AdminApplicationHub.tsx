import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ApplicationStats } from "./ApplicationStats";
import { ApplicationFilters } from "./ApplicationFilters";
import { ApplicationsTable } from "./ApplicationsTable";
import { ApplicationDetailDrawer } from "./ApplicationDetailDrawer";
import { ApprovalDialog } from "./ApprovalDialog";
import { RejectionDialog } from "./RejectionDialog";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Application {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location?: string | null;
  current_title?: string | null;
  linkedin_url?: string | null;
  bio?: string | null;
  resume_url?: string | null;
  dream_job_title?: string | null;
  employment_type?: string | null;
  notice_period?: string | null;
  current_salary?: number | null;
  desired_salary_min?: number | null;
  desired_salary_max?: number | null;
  freelance_rate?: number | null;
  remote_preference?: string | null;
  preferred_locations?: string[] | null;
  work_radius?: number | null;
  application_status: string | null;
  created_at: string;
  admin_notes?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  rejection_reason?: string | null;
}

export function AdminApplicationHub() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    lastSubmission: undefined as string | undefined
  });

  useEffect(() => {
    loadApplications();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('candidate-applications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_profiles'
        },
        () => {
          loadApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterAndSortApplications();
  }, [applications, searchTerm, statusFilter, sortBy]);

  const loadApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const pending = data?.filter(app => app.application_status === 'applied').length || 0;
      const approved = data?.filter(app => app.application_status === 'approved').length || 0;
      const rejected = data?.filter(app => app.application_status === 'rejected').length || 0;
      const lastSubmission = data?.[0]?.created_at;

      setStats({ total, pending, approved, rejected, lastSubmission });
    } catch (error) {
      console.error('Failed to load applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortApplications = () => {
    let filtered = [...applications];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(app =>
        app.full_name?.toLowerCase().includes(search) ||
        app.email?.toLowerCase().includes(search) ||
        app.phone?.toLowerCase().includes(search) ||
        app.current_title?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.application_status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name-asc':
          return (a.full_name ?? '').localeCompare(b.full_name ?? '');
        case 'name-desc':
          return (b.full_name ?? '').localeCompare(a.full_name ?? '');
        default:
          return 0;
      }
    });

    setFilteredApplications(filtered);
  };

  const handleApprove = async (sendEmail: boolean) => {
    if (!selectedApplication || !user) return;

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: selectedApplication.email ?? '',
        email_confirm: true,
        user_metadata: {
          full_name: selectedApplication.full_name ?? ''
        }
      });

      if (authError) throw authError;

      // Update candidate profile
      const { error: updateError } = await supabase
        .from('candidate_profiles')
        .update({
          application_status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          user_id: authData.user.id
        })
        .eq('id', selectedApplication.id);

      if (updateError) throw updateError;

      // Create profile
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: selectedApplication.full_name,
        email: selectedApplication.email,
        phone: selectedApplication.phone,
        phone_verified: true,
        email_verified: true,
        location: selectedApplication.location,
        current_title: selectedApplication.current_title,
        linkedin_url: selectedApplication.linkedin_url,
        onboarding_completed_at: new Date().toISOString()
      });

      // Assign user role
      await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'user'
      });

      // Log activity
      await supabase.from('candidate_application_logs').insert({
        candidate_profile_id: selectedApplication.id,
        action: 'approved',
        actor_id: user.id,
        details: { send_email: sendEmail }
      });

      toast.success(`${selectedApplication.full_name} has been approved!`, {
        description: 'User account created and platform access granted'
      });

      loadApplications();
      setDetailDrawerOpen(false);
    } catch (error: any) {
      console.error('Approval failed:', error);
      toast.error('Failed to approve application', {
        description: error.message
      });
    }
  };

  const handleReject = async (reason: string, sendEmail: boolean) => {
    if (!selectedApplication || !user) return;

    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({
          application_status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', selectedApplication.id);

      if (error) throw error;

      // Log activity
      await supabase.from('candidate_application_logs').insert({
        candidate_profile_id: selectedApplication.id,
        action: 'rejected',
        actor_id: user.id,
        details: { reason, send_email: sendEmail }
      });

      toast.success(`${selectedApplication.full_name}'s application has been rejected`);

      loadApplications();
      setDetailDrawerOpen(false);
    } catch (error: any) {
      console.error('Rejection failed:', error);
      toast.error('Failed to reject application', {
        description: error.message
      });
    }
  };

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application);
    setDetailDrawerOpen(true);
  };

  const handleQuickApprove = (application: Application) => {
    setSelectedApplication(application);
    setApprovalDialogOpen(true);
  };

  const handleQuickReject = (application: Application) => {
    setSelectedApplication(application);
    setRejectionDialogOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredApplications.map(app => app.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ['Full Name', 'Email', 'Phone', 'Current Title', 'Desired Salary', 'Remote Preference', 'Application Date', 'Status', 'Resume URL'].join(','),
      ...filteredApplications.map(app => [
        app.full_name,
        app.email,
        app.phone,
        app.current_title || '',
        app.desired_salary_min && app.desired_salary_max 
          ? `€${app.desired_salary_min} - €${app.desired_salary_max}` 
          : '',
        app.remote_preference || '',
        new Date(app.created_at).toLocaleDateString(),
        app.application_status,
        app.resume_url || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('CSV exported successfully');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      <ApplicationStats {...stats} />

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <ApplicationFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadApplications}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Applications Table */}
      <ApplicationsTable
        applications={filteredApplications}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        onViewDetails={handleViewDetails}
        onQuickApprove={handleQuickApprove}
        onQuickReject={handleQuickReject}
      />

      {/* Detail Drawer */}
      <ApplicationDetailDrawer
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        application={selectedApplication}
        onApprove={() => {
          setDetailDrawerOpen(false);
          setApprovalDialogOpen(true);
        }}
        onReject={() => {
          setDetailDrawerOpen(false);
          setRejectionDialogOpen(true);
        }}
        onUpdate={loadApplications}
      />

      {/* Approval Dialog */}
      <ApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        candidateName={selectedApplication?.full_name || ''}
        onConfirm={handleApprove}
      />

      {/* Rejection Dialog */}
      <RejectionDialog
        open={rejectionDialogOpen}
        onOpenChange={setRejectionDialogOpen}
        candidateName={selectedApplication?.full_name || ''}
        onConfirm={handleReject}
      />
    </div>
  );
}
