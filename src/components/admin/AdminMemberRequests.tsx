import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, User, Mail, Phone, Briefcase, MapPin, ExternalLink, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OnboardingProgressTracker } from "./OnboardingProgressTracker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MemberApprovalWorkflowDialog } from "./approval/MemberApprovalWorkflowDialog";

interface MemberRequest {
  id: string | null;
  request_type: 'candidate' | 'partner';
  name: string;
  email: string;
  phone: string | null;
  title_or_company: string | null;
  location: string | null;
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  resume_url: string | null;
  linkedin_url: string | null;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  reviewed_at: string | null;
  decline_reason: string | null;
  additional_data: {
    company_size?: string;
    industry?: string;
    budget_range?: string;
    estimated_roles_per_year?: string;
    website?: string;
  } | null;
  reviewed_by?: string | null;
  approver?: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
  activity?: {
    last_login_at: string | null;
  };
  notifications?: Array<{
    notification_type: 'email' | 'sms';
    status: 'sent' | 'failed';
    sent_at: string;
  }>;
  profiles?: {
    onboarding_completed_at?: string | null;
    onboarding_current_step?: number;
    onboarding_partial_data?: any;
    onboarding_last_activity_at?: string | null;
    phone_verified?: boolean;
    email_verified?: boolean;
    current_title?: string;
    linkedin_url?: string;
    location?: string;
    employment_type_preference?: string;
    notice_period?: string;
    remote_work_preference?: boolean;
    resume_url?: string;
    resume_filename?: string;
    career_preferences?: string;
    current_salary_min?: number;
    current_salary_max?: number;
    desired_salary_min?: number;
    desired_salary_max?: number;
    freelance_hourly_rate_min?: number;
    freelance_hourly_rate_max?: number;
    salary_preference_hidden?: boolean;
    user_roles?: Array<{ role: string }>;
  };
}

// Helper function to check if a request is from a pure candidate (no elevated roles)
const isPureCandidate = (request: MemberRequest): boolean => {
  const roles = (request.profiles?.user_roles as any[])?.map((r: any) => r.role) || [];
  return !roles.includes('admin') && 
         !roles.includes('partner') && 
         !roles.includes('strategist');
};

export const AdminMemberRequests = () => {
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MemberRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'decline' | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'declined'>('pending');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(true);
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | 'candidate' | 'partner'>('all');
  const [resending, setResending] = useState<{email?: boolean; sms?: boolean}>({});
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [workflowRequest, setWorkflowRequest] = useState<MemberRequest | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<string>('');

  useEffect(() => {
    fetchRequests();
    loadCurrentAdmin();

    // Set up realtime subscriptions
    const profilesChannel = supabase
      .channel('member-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchRequests()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partner_requests' },
        () => fetchRequests()
      )
      .subscribe();

    // Subscribe to onboarding progress updates for pending candidates
    const onboardingChannel = supabase
      .channel('admin-onboarding-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: 'account_status=eq.pending'
        },
        () => {
          console.log('[Admin] Candidate onboarding updated');
          fetchRequests(); // Refresh to show new progress
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(onboardingChannel);
    };
  }, [activeTab]);

  const loadCurrentAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentAdminId(user.id);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Fetch unified requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('member_requests_unified')
        .select('*')
        .eq('status', activeTab)
        .order('created_at', { ascending: false});

      if (requestsError) throw requestsError;

      // Enrich with approver, activity, notification data, and onboarding progress
      const enrichedRequests = await Promise.all(
        (requestsData || []).map(async (request) => {
          const enriched: MemberRequest = { 
            ...request,
            request_type: request.request_type as 'candidate' | 'partner',
            status: request.status as 'pending' | 'approved' | 'declined',
            additional_data: request.additional_data as MemberRequest['additional_data'],
          };

          // Fetch additional data for candidates (including onboarding progress)
          if (request.request_type === 'candidate') {
            const userId = request.id;
            if (!userId) return enriched;
            
            // Fetch onboarding progress from profiles
            const { data: profileData } = await supabase
              .from('profiles')
              .select(`
                onboarding_completed_at,
                onboarding_current_step,
                onboarding_partial_data,
                onboarding_last_activity_at,
                phone_verified,
                email_verified,
                current_title,
                linkedin_url,
                location,
                employment_type_preference,
                notice_period,
                remote_work_preference,
                resume_url,
                resume_filename,
                career_preferences,
                current_salary_min,
                current_salary_max,
                desired_salary_min,
                desired_salary_max,
                freelance_hourly_rate_min,
                freelance_hourly_rate_max,
                salary_preference_hidden
              `)
              .eq('id', userId)
              .single();
            
            // Fetch user roles separately
            const { data: userRoles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userId);
            
            if (profileData) {
              enriched.profiles = {
                ...profileData,
                user_roles: userRoles || []
              };
            }
          }

          // Fetch approver info if reviewed
          if (request.reviewed_by) {
            const { data: approverData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url, email')
              .eq('id', request.reviewed_by)
              .single();
            
            if (approverData) {
              enriched.approver = approverData;
            }
          }

          // Fetch user activity (for approved candidates/partners)
          if (request.status === 'approved') {
            // Get user_id from the request
            let userId = null;
            if (request.request_type === 'candidate') {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', request.email)
                .single();
              userId = profileData?.id;
            } else {
              const { data: partnerData } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', request.email)
                .single();
              userId = partnerData?.id;
            }

            if (userId) {
              const { data: activityData } = await supabase
                .from('user_activity_tracking')
                .select('last_login_at')
                .eq('user_id', userId)
                .single();
              
              if (activityData) {
                enriched.activity = activityData;
              }

              // Fetch notification logs
              const { data: notificationData } = await supabase
                .from('approval_notification_logs')
                .select('notification_type, status, sent_at')
                .eq('user_id', userId)
                .eq('request_type', request.request_type);
              
              if (notificationData) {
                enriched.notifications = notificationData.map(n => ({
                  notification_type: n.notification_type as 'email' | 'sms',
                  status: n.status as 'sent' | 'failed',
                  sent_at: n.sent_at
                }));
              }
            }
          }

          return enriched;
        })
      );

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching member requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedRequest || !selectedRequest.id || !reviewAction) return;

    console.log('[AdminMemberRequests] Starting review process', {
      request: selectedRequest.name,
      action: reviewAction,
      sendEmail,
      sendSMS
    });

    setSubmitting(true);
    try {
      // CRITICAL: Validate onboarding completion before approval (only for pure candidates)
      if (reviewAction === 'approve' && selectedRequest.request_type === 'candidate') {
        // Fetch user roles
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', selectedRequest.id);

        const roles = userRoles?.map((r) => r.role) || [];
        const isPureCandidate = !roles.includes('admin') && 
                                !roles.includes('partner') && 
                                !roles.includes('strategist');

        // Only block approval if they're a pure candidate without completed onboarding
        if (isPureCandidate) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed_at, phone_verified, onboarding_current_step')
            .eq('id', selectedRequest.id)
            .single();

          if (!profile?.onboarding_completed_at || !profile?.phone_verified) {
            toast.error(
              `Cannot approve ${selectedRequest.name}. Candidates must complete all 6 onboarding steps with phone verification. Currently on step ${profile?.onboarding_current_step || 0}.`,
              { duration: 6000 }
            );
            setSubmitting(false);
            return;
          }
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newStatus = reviewAction === 'approve' ? 'approved' : 'declined';
      const tableName = selectedRequest.request_type === 'candidate' ? 'profiles' : 'partner_requests';
      const statusColumn = selectedRequest.request_type === 'candidate' ? 'account_status' : 'status';

      // Build update data with correct column names per table
      const updateData: any = {
        [statusColumn]: newStatus,
      };

      // Add reviewed fields based on request type
      if (selectedRequest.request_type === 'candidate') {
        // Candidates use account_* prefix
        updateData.account_reviewed_at = new Date().toISOString();
        updateData.account_approved_by = user.id;
        if (reviewAction === 'decline') {
          updateData.account_decline_reason = declineReason;
        }
      } else {
        // Partners use standard column names
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = user.id;
        if (reviewAction === 'decline') {
          updateData.decline_reason = declineReason;
        }
      }

      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (updateError) {
        console.error('[AdminMemberRequests] Update error:', updateError);
        throw updateError;
      }

      console.log('[AdminMemberRequests] Status updated successfully');

      // Send notification email with error handling (only if sendEmail is checked)
      let emailError = null;
      if (sendEmail) {
        const { data: emailResult, error: emailErr } = await supabase.functions.invoke('send-approval-notification', {
          body: {
            userId: selectedRequest.id,
            email: selectedRequest.email,
            fullName: selectedRequest.name,
            requestType: selectedRequest.request_type,
            status: newStatus,
            declineReason: reviewAction === 'decline' ? declineReason : undefined,
          }
        });
        emailError = emailErr;

        if (emailErr) {
          console.error('[AdminMemberRequests] Email notification error:', emailErr);
        } else {
          console.log('[AdminMemberRequests] Email sent successfully:', emailResult);
        }
      }

      // Send SMS notification if phone is available and status is approved (only if sendSMS is checked)
      let smsSuccess = false;
      if (sendSMS && reviewAction === 'approve' && selectedRequest.phone) {
        const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-approval-sms', {
          body: {
            phone: selectedRequest.phone,
            fullName: selectedRequest.name,
            requestType: selectedRequest.request_type,
          }
        });

        if (smsError) {
          console.error('[AdminMemberRequests] SMS notification error:', smsError);
        } else {
          console.log('[AdminMemberRequests] SMS sent successfully:', smsResult);
          smsSuccess = true;
        }
      }

      // Show success toast with notification status
      if (reviewAction === 'approve') {
        const notifications = [];
        if (!emailError) notifications.push('Email');
        if (smsSuccess) notifications.push('SMS');
        
        toast.success(
          `${selectedRequest.name} has been approved!`,
          notifications.length > 0 
            ? { description: `Notifications sent: ${notifications.join(', ')}` }
            : undefined
        );
      } else {
        toast.success('Application declined');
      }

      // Close dialog and refresh
      setSelectedRequest(null);
      setReviewAction(null);
      setDeclineReason('');
      setSendEmail(true);
      setSendSMS(true);
      fetchRequests();

    } catch (error: any) {
      console.error('Error reviewing request:', error);
      toast.error('Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewDialog = (request: MemberRequest, action: 'approve' | 'decline') => {
    if (action === 'approve' && request.request_type === 'candidate') {
      // Use enhanced workflow for candidate approvals
      setWorkflowRequest(request);
      setShowWorkflowDialog(true);
    } else {
      // Use simple dialog for partner approvals and all declines
      setSelectedRequest(request);
      setReviewAction(action);
      // Reset notification preferences
      setSendEmail(true);
      setSendSMS(true);
    }
  };

  const handleWorkflowSuccess = () => {
    fetchRequests();
    setShowWorkflowDialog(false);
    setWorkflowRequest(null);
  };

  const handleResendNotification = async (request: MemberRequest, notificationType: 'email' | 'sms') => {
    setResending(prev => ({ ...prev, [notificationType]: true }));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user ID for the request
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', request.email)
        .single();
      
      const userId = profileData?.id;
      if (!userId) {
        throw new Error('User not found');
      }

      if (notificationType === 'email') {
        const { error } = await supabase.functions.invoke('send-approval-notification', {
          body: {
            userId,
            email: request.email,
            fullName: request.name,
            requestType: request.request_type,
            status: 'approved',
          }
        });

        if (error) throw error;
        toast.success('Email resent successfully');
      } else {
        if (!request.phone) {
          toast.error('No phone number available');
          return;
        }

        const { error } = await supabase.functions.invoke('send-approval-sms', {
          body: {
            userId,
            phone: request.phone,
            fullName: request.name,
            requestType: request.request_type,
          }
        });

        if (error) throw error;
        toast.success('SMS resent successfully');
      }

      // Refresh to show updated notification status
      fetchRequests();
    } catch (error: any) {
      console.error('Error resending notification:', error);
      toast.error(`Failed to resend ${notificationType}`);
    } finally {
      setResending(prev => ({ ...prev, [notificationType]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Request Type Filter */}
      <div className="mb-4">
        <Tabs value={requestTypeFilter} onValueChange={(v) => setRequestTypeFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="candidate">Candidates Only</TabsTrigger>
            <TabsTrigger value="partner">Partners Only</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Status Filter */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
        </TabsList>
      </Tabs>

      {requests.filter(r => requestTypeFilter === 'all' || r.request_type === requestTypeFilter).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No {activeTab} requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.filter(r => requestTypeFilter === 'all' || r.request_type === requestTypeFilter).map(request => {
            const emailSent = request.notifications?.some(n => n.notification_type === 'email' && n.status === 'sent');
            const smsSent = request.notifications?.some(n => n.notification_type === 'sms' && n.status === 'sent');
            const hasLoggedInAfterApproval = request.activity?.last_login_at && request.reviewed_at 
              ? new Date(request.activity.last_login_at) > new Date(request.reviewed_at)
              : false;
            
            return (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  
                  {/* Left: Profile Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{request.name}</h3>
                          <Badge variant="outline">
                            {request.request_type === 'candidate' ? 'Candidate' : 'Partner'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Applied {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{request.email}</span>
                      </div>
                      {request.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{request.phone}</span>
                        </div>
                      )}
                      {request.title_or_company && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-muted-foreground" />
                          <span>{request.title_or_company}</span>
                        </div>
                      )}
                      {request.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{request.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Candidate-specific info */}
                    {request.request_type === 'candidate' && request.desired_salary_min && (
                      <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                        <strong>Desired Salary:</strong> €{request.desired_salary_min.toLocaleString()} - €{request.desired_salary_max?.toLocaleString()}
                      </div>
                    )}

                  {/* Onboarding Progress Tracker - only for pure candidates, not admins/partners */}
                  {request.status === 'pending' && 
                   request.request_type === 'candidate' && 
                   isPureCandidate(request) && (
                    <div className="mt-4">
                      <OnboardingProgressTracker request={request} />
                    </div>
                  )}

                    {/* Warning for incomplete onboarding - only for pure candidates */}
                    {request.request_type === 'candidate' && 
                     isPureCandidate(request) &&
                     !request.profiles?.onboarding_completed_at && 
                     request.status === 'pending' && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          ⚠️ Onboarding Incomplete - Step {request.profiles?.onboarding_current_step || 0}/6
                          {!request.profiles?.phone_verified && ' - Phone not verified'}
                          {' - '}Cannot approve yet
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Partner-specific info */}
                    {request.request_type === 'partner' && request.additional_data && (
                      <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1">
                        {request.additional_data.industry && (
                          <p><strong>Industry:</strong> {request.additional_data.industry}</p>
                        )}
                        {request.additional_data.company_size && (
                          <p><strong>Company Size:</strong> {request.additional_data.company_size}</p>
                        )}
                        {request.additional_data.budget_range && (
                          <p><strong>Budget:</strong> {request.additional_data.budget_range}</p>
                        )}
                        {request.additional_data.estimated_roles_per_year && (
                          <p><strong>Roles/Year:</strong> {request.additional_data.estimated_roles_per_year}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col gap-2 ml-6">
                    {request.status === 'pending' && (
                      <>
                        <Button 
                          onClick={() => openReviewDialog(request, 'approve')}
                          className="gap-2"
                          disabled={
                            request.request_type === 'candidate' && 
                            isPureCandidate(request) &&
                            (!request.profiles?.onboarding_completed_at || !request.profiles?.phone_verified)
                          }
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button 
                          onClick={() => openReviewDialog(request, 'decline')}
                          variant="outline"
                          className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </Button>
                      </>
                    )}
                    {request.resume_url && (
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(request.resume_url!, '_blank')}
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Resume
                      </Button>
                    )}
                    {request.linkedin_url && (
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(request.linkedin_url!, '_blank')}
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        LinkedIn
                      </Button>
                    )}
                    {request.request_type === 'partner' && request.additional_data?.website && (
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(request.additional_data!.website!, '_blank')}
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Website
                      </Button>
                    )}
                  </div>
                </div>

                {/* Enhanced info for approved/declined tabs */}
                {request.status !== 'pending' && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {request.approver && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={request.approver.avatar_url || undefined} />
                          <AvatarFallback>{request.approver.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{request.status === 'approved' ? 'Approved by' : 'Declined by'}</p>
                          <p className="text-sm text-muted-foreground">{request.approver.full_name}</p>
                          {request.reviewed_at && <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true })}</p>}
                        </div>
                      </div>
                    )}
                    {request.status === 'approved' && (
                      <div className="flex flex-col gap-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Notifications</p>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant={emailSent ? "default" : "outline"}>
                              <Mail className="w-3 h-3 mr-1" />
                              Email {emailSent ? "Sent" : "Not Sent"}
                            </Badge>
                            {!emailSent && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleResendNotification(request, 'email')}
                                disabled={resending.email}
                                className="h-7 text-xs"
                              >
                                {resending.email ? 'Sending...' : 'Resend'}
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant={smsSent ? "default" : "outline"}>
                              <Phone className="w-3 h-3 mr-1" />
                              SMS {smsSent ? "Sent" : "Not Sent"}
                            </Badge>
                            {!smsSent && request.phone && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleResendNotification(request, 'sms')}
                                disabled={resending.sms}
                                className="h-7 text-xs"
                              >
                                {resending.sms ? 'Sending...' : 'Resend'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {request.status === 'approved' && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Login Status</p>
                        {hasLoggedInAfterApproval ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm">
                              Logged in {formatDistanceToNow(new Date(request.activity!.last_login_at!), { addSuffix: true })}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">Not logged in since approval</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {request.status === 'declined' && request.decline_reason && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"><p className="text-sm font-semibold mb-1">Decline Reason:</p><p className="text-sm text-muted-foreground">{request.decline_reason}</p></div>
                )}
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Application' : 'Decline Application'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? `Approve ${selectedRequest?.name}'s membership application?`
                : `Decline ${selectedRequest?.name}'s application? They will be notified via email.`
              }
            </DialogDescription>
          </DialogHeader>

          {reviewAction === 'approve' && (
            <div className="space-y-3">
              <Label>Notification Preferences</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-email"
                    checked={sendEmail}
                    onCheckedChange={(checked) => setSendEmail(checked === true)}
                  />
                  <label htmlFor="send-email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                    Send approval email
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-sms"
                    checked={sendSMS}
                    onCheckedChange={(checked) => setSendSMS(checked === true)}
                    disabled={!selectedRequest?.phone}
                  />
                  <label 
                    htmlFor="send-sms" 
                    className={`text-sm font-medium leading-none ${!selectedRequest?.phone ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    Send approval SMS {!selectedRequest?.phone && '(no phone number)'}
                  </label>
                </div>
              </div>
            </div>
          )}

          {reviewAction === 'decline' && (
            <div className="space-y-2">
              <Label htmlFor="decline-reason">Reason for Decline (will be sent to applicant)</Label>
              <Textarea
                id="decline-reason"
                placeholder="e.g., Profile does not match our current criteria..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedRequest(null)}>Cancel</Button>
            <Button 
              onClick={handleReview}
              disabled={submitting || (reviewAction === 'decline' && !declineReason)}
              variant={reviewAction === 'approve' ? 'default' : 'outline'}
              className={reviewAction === 'decline' ? 'border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground' : ''}
            >
              {submitting ? 'Processing...' : reviewAction === 'approve' ? 'Approve' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Approval Workflow Dialog for Candidates */}
      {workflowRequest && currentAdminId && (
        <MemberApprovalWorkflowDialog
          open={showWorkflowDialog}
          onOpenChange={setShowWorkflowDialog}
          request={workflowRequest}
          adminId={currentAdminId}
          onSuccess={handleWorkflowSuccess}
        />
      )}
    </>
  );
};
